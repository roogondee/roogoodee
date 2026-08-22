import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification } from '@/lib/email'
import { notifyLeadToSale, notifyMindCrisisToSale, pushVoucherToUser, pushMindCrisisReplyToUser } from '@/lib/line-notify'
import { scoreQuiz } from '@/lib/quiz/scoring'
import { issueVoucher } from '@/lib/quiz/voucher'
import { pickNextAssignee } from '@/lib/quiz/assign'
import { summarizeAnswers } from '@/lib/quiz/summary'
import { generateInsight } from '@/lib/quiz/insight'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { encryptJson } from '@/lib/encryption'
import { sendTikTokEvent } from '@/lib/tiktok-events'
import { sendMetaEvents } from '@/lib/meta-capi'
import { verifyLiffIdToken } from '@/lib/liff-verify'
import { resolveContact } from '@/lib/crm/contacts'
import type { Service } from '@/types'

// Zero-form voucher claim (LINE path).
//
// Two flavors, chosen by whether the request carries a verifiable LIFF
// id_token:
//
// 1. Anonymous (web quiz): lead keyed by the quiz session_id; the user sends
//    the voucher code in the OA chat and the existing line-webhook linkage
//    saves their line_user_id — that moment is when the lead becomes
//    contactable.
// 2. LIFF (quiz opened inside LINE): the id_token is verified server-side
//    with LINE, the lead is created already linked (line_user_id set,
//    display name as first_name) and the voucher is pushed straight into the
//    user's chat — no code to send, contactable from second one.
//
// `leads.phone` is NOT NULL, so (matching the bot-lead convention of storing
// a platform userId there) claim rows carry the session_id (anonymous) or
// the LINE userId (LIFF) in `phone`. Neither shape can collide with the
// real-phone dedup in /api/quiz.

interface ClaimPayload {
  service?: Service
  answers?: Record<string, unknown>
  session_id?: string
  age?: string
  gender?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  recaptcha_token?: string
  ttclid?: string
  ttp?: string
  fbc?: string
  fbp?: string
  liff_id_token?: string
}

const VALID_SERVICES: readonly Service[] = ['glp1', 'ckd', 'std', 'foreign', 'mens', 'women', 'mind', 'dna']

// Spec §5.2 — same monthly voucher quota as the form path
const MONTHLY_QUOTA = 50

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Sales-facing placeholder shown wherever a real name/phone would appear
const PENDING_LINE_LABEL = 'รอเชื่อม LINE'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClaimPayload

    if (!body.service || !VALID_SERVICES.includes(body.service)) {
      return NextResponse.json({ error: 'บริการไม่ถูกต้อง' }, { status: 400 })
    }
    if (!body.session_id || !UUID_RE.test(body.session_id)) {
      return NextResponse.json({ error: 'session ไม่ถูกต้อง กรุณารีเฟรชหน้าแล้วลองใหม่' }, { status: 400 })
    }
    const answers = body.answers ?? {}
    if (Object.keys(answers).length === 0) {
      return NextResponse.json({ error: 'กรุณาทำแบบประเมินให้ครบก่อนรับ voucher' }, { status: 400 })
    }

    // reCAPTCHA v3 — advisory only, same policy as /api/quiz
    const captcha = await verifyRecaptcha(body.recaptcha_token, `quiz_claim_${body.service}`)
    if (!captcha.success) {
      console.warn('quiz claim-line: recaptcha not verified (continuing)', captcha)
    }

    // IP rate limit — same backstop as /api/quiz (CGNAT-friendly threshold)
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    if (clientIp) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: ipCount, error: ipErr } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('client_ip', clientIp)
        .gte('created_at', dayAgo)
      if (!ipErr && (ipCount ?? 0) >= 30) {
        console.warn('quiz claim-line: ip rate limit exceeded', { clientIp, ipCount })
        return NextResponse.json(
          { error: 'ระบบตรวจพบคำขอจาก IP นี้มากเกินไป กรุณาลองใหม่ในวันพรุ่งนี้ หรือติดต่อ LINE @roogondee' },
          { status: 429 },
        )
      }
    }

    const scoring = scoreQuiz(body.service, answers)
    const insight = generateInsight(body.service, answers, scoring.tier)

    // LIFF flavor: verify the id_token with LINE. Verification failure (bad
    // token, env missing, LINE API down) degrades to the anonymous flow
    // rather than blocking the claim.
    const liffUser = body.liff_id_token ? await verifyLiffIdToken(body.liff_id_token) : null

    // Idempotent re-claim. Anonymous rows are keyed by session_id (lives in
    // localStorage — a refresh + second tap must return the same voucher);
    // LIFF rows are keyed by the verified LINE userId, which also enforces
    // 1 voucher/service/person across devices and sessions.
    const claimKey = liffUser ? liffUser.userId : body.session_id
    const { data: priorLeads } = await supabaseAdmin
      .from('leads')
      .select('id, lead_tier, lead_score, status')
      .eq('phone', claimKey)
      .eq('service', body.service)
      .limit(1)
    let leadId = priorLeads?.[0]?.id as string | undefined
    // A LIFF lead saved while the quota was full — a re-tap must not mint a
    // voucher past the quota; it stays waitlisted until the quota frees up.
    const priorWaitlist = priorLeads?.[0]?.status === 'waitlist'

    if (leadId) {
      const { data: priorVoucher } = await supabaseAdmin
        .from('vouchers')
        .select('code, expires_at')
        .eq('lead_id', leadId)
        .maybeSingle()
      if (priorVoucher) {
        return NextResponse.json({
          success: true,
          lead_id: leadId,
          tier: priorLeads![0].lead_tier,
          score: priorLeads![0].lead_score,
          waitlist: false,
          voucher: { code: priorVoucher.code, expires_at: priorVoucher.expires_at },
          insight,
          liff_linked: !!liffUser,
        })
      }
      // Lead exists but voucher issuance failed last time — fall through and
      // retry issuance on the same lead below.
    }

    // Monthly quota. An anonymous claim row has no contact info, so when the
    // quota is full we do NOT insert one (it would be permanently
    // unreachable) — the user is sent to the OA chat instead. A LIFF claim IS
    // contactable, so it falls through and gets saved as a waitlist lead just
    // like the form path.
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count: monthCount } = await supabaseAdmin
      .from('vouchers')
      .select('id', { count: 'exact', head: true })
      .eq('service', body.service)
      .gte('issued_at', monthStart.toISOString())
    const quotaFull = (monthCount ?? 0) >= MONTHLY_QUOTA && (!leadId || priorWaitlist)
    if (quotaFull && !liffUser) {
      return NextResponse.json({
        success: true,
        waitlist: true,
        tier: scoring.tier,
        score: scoring.score,
        voucher: null,
        insight,
        liff_linked: false,
      })
    }

    if (!leadId) {
      // Spec §8.2: encrypt sensitive STD quiz answers at rest
      const storedAnswers = body.service === 'std' ? encryptJson(answers) : answers
      const assignee = await pickNextAssignee()

      // LIFF leads join the cross-pillar CRM contact right away (same as bot
      // leads) since we hold a real messaging identity.
      const contact = liffUser
        ? await resolveContact({ line_user_id: liffUser.userId, name: liffUser.displayName })
        : null

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('leads')
        .insert([{
          service:       body.service,
          first_name:    liffUser ? (liffUser.displayName || 'LINE Lead') : PENDING_LINE_LABEL,
          phone:         claimKey,
          line_user_id:  liffUser?.userId ?? null,
          contact_id:    contact?.id ?? null,
          age:           body.age || null,
          gender:        body.gender || null,
          quiz_answers:  storedAnswers,
          lead_score:    scoring.score,
          lead_tier:     scoring.tier,
          assigned_to:   assignee,
          assigned_at:   assignee ? new Date().toISOString() : null,
          consent_pdpa:  true,
          consent_at:    new Date().toISOString(),
          client_ip:     clientIp || null,
          source:        liffUser ? 'quiz-liff' : 'quiz-line',
          utm_source:    body.utm_source || null,
          utm_medium:    body.utm_medium || null,
          utm_campaign:  body.utm_campaign || null,
          status:        quotaFull ? 'waitlist' : 'new',
          recaptcha_ok:     captcha.success,
          recaptcha_reason: captcha.reason || null,
        }])
        .select()
        .single()
      if (insertError) throw insertError
      leadId = inserted.id as string
    }

    const isMindCrisis = body.service === 'mind' && scoring.tier === 'urgent'

    // LIFF + quota full: lead saved and contactable, but no voucher this
    // month. Alert the team (crisis-formatted for the mind safety gate, and
    // the 1323 push still reaches the user's chat) and reply waitlist.
    if (quotaFull) {
      // Notify only on first save — a re-tap on an existing waitlist lead
      // must not re-ping the sales group.
      if (!priorWaitlist) {
        const waitlistPayload = {
          name:           `${liffUser!.displayName || 'LINE Lead'} (LINE)`,
          phone:          'LINE เชื่อมแล้ว — ทักในแชท OA ได้เลย',
          service:        body.service,
          tier:           scoring.tier,
          score:          scoring.score,
          voucher_code:   'ไม่มี — waitlist รอติดต่อกลับ',
          reasons:        scoring.reasons,
          answer_summary: summarizeAnswers(body.service, answers),
        } as const
        if (isMindCrisis) {
          try {
            await notifyMindCrisisToSale(waitlistPayload)
          } catch (err) {
            console.error('quiz claim-line: notifyMindCrisisToSale (waitlist) failed:', err)
          }
          try {
            await pushMindCrisisReplyToUser(liffUser!.userId, {
              name: liffUser!.displayName || 'คุณลูกค้า',
              voucher_code: '-',
            })
          } catch (err) {
            console.error('quiz claim-line: pushMindCrisisReplyToUser (waitlist) failed:', err)
          }
        } else {
          try {
            await notifyLeadToSale(waitlistPayload)
          } catch (err) {
            console.error('quiz claim-line: notifyLeadToSale (waitlist) failed:', err)
          }
        }
      }
      return NextResponse.json({
        success: true,
        lead_id: leadId,
        waitlist: true,
        tier: scoring.tier,
        score: scoring.score,
        voucher: null,
        insight,
        liff_linked: true,
      })
    }

    let voucher: Awaited<ReturnType<typeof issueVoucher>>
    try {
      voucher = await issueVoucher({ leadId, service: body.service })
    } catch (err) {
      // No voucher means nothing to send in LINE — surface a retryable error
      // (the lead row stays; a retry with the same session reuses it).
      console.error('quiz claim-line: issueVoucher failed:', err)
      return NextResponse.json(
        { error: 'ออก voucher ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือติดต่อ LINE @roogondee' },
        { status: 500 },
      )
    }

    // A waitlisted lead that just got its voucher (quota freed up on a later
    // re-tap) graduates back to the normal pipeline.
    if (priorWaitlist) {
      await supabaseAdmin.from('leads').update({ status: 'new' }).eq('id', leadId)
    }

    const notifyPayload = {
      name:               liffUser ? `${liffUser.displayName || 'LINE Lead'} (LINE)` : `${PENDING_LINE_LABEL} (quiz)`,
      phone:              liffUser ? 'LINE เชื่อมแล้ว — ทักในแชท OA ได้เลย' : PENDING_LINE_LABEL,
      service:            body.service,
      tier:               scoring.tier,
      score:              scoring.score,
      voucher_code:       voucher.code,
      voucher_expires_at: voucher.expires_at,
      reasons:            scoring.reasons,
      answer_summary:     summarizeAnswers(body.service, answers),
    } as const

    // Mind safety gate — see docs/mind-crisis-sop.md. The crisis alert to the
    // sales group fires exactly as on the form path. Anonymous claims have no
    // user id yet (on-screen insight surfaces hotline 1323); LIFF claims also
    // get the 1323 crisis message pushed directly into their chat.
    if (isMindCrisis) {
      try {
        await notifyMindCrisisToSale(notifyPayload)
      } catch (err) {
        console.error('quiz claim-line: notifyMindCrisisToSale failed:', err)
      }
      if (liffUser) {
        try {
          await pushMindCrisisReplyToUser(liffUser.userId, {
            name: liffUser.displayName || 'คุณลูกค้า',
            voucher_code: voucher.code,
          })
        } catch (err) {
          console.error('quiz claim-line: pushMindCrisisReplyToUser failed:', err)
        }
      }
    } else {
      try {
        await notifyLeadToSale(notifyPayload)
      } catch (err) {
        console.error('quiz claim-line: notifyLeadToSale failed:', err)
      }
    }

    // LIFF flavor: deliver the voucher straight into the user's chat — this
    // is the whole point of the LIFF path (no code to copy or send back).
    // Await it (PR #87: fire-and-forget gets dropped after the response on
    // Vercel). Failure is non-fatal — the code is still on screen.
    if (liffUser) {
      try {
        await pushVoucherToUser(liffUser.userId, {
          name: liffUser.displayName || 'คุณลูกค้า',
          service: body.service,
          code: voucher.code,
          expires_at: voucher.expires_at,
        })
      } catch (err) {
        console.error('quiz claim-line: pushVoucherToUser failed:', err)
      }
    }

    void sendLeadNotification({
      name:    notifyPayload.name,
      phone:   liffUser ? 'LINE linked' : PENDING_LINE_LABEL,
      service: body.service,
      source:  `${liffUser ? 'quiz-liff' : 'quiz-line'} (${scoring.tier.toUpperCase()} score ${scoring.score})`,
      note:    liffUser
        ? `Voucher: ${voucher.code} — ส่งเข้าแชท LINE ของลูกค้าแล้ว`
        : `Voucher: ${voucher.code} — ลูกค้าจะส่งโค้ดยืนยันทาง LINE OA`,
    })

    // TikTok Events API — event_id = voucher code, dedupes against the
    // client-side ttq fire in QuizRunner (same convention as /api/quiz).
    void sendTikTokEvent({
      event_name: 'SubmitForm',
      event_id: voucher.code,
      service: body.service,
      user: {
        external_id: voucher.code,
        ip: clientIp || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
        ttclid: body.ttclid,
        ttp: body.ttp,
      },
      properties: {
        content_id: voucher.code,
        content_name: `${body.service.toUpperCase()} Voucher`,
        content_type: 'lead',
        value: scoring.score,
        currency: 'THB',
        lead_score: scoring.tier,
        vertical: body.service,
      },
    })

    // Meta Conversions API — event_id = voucher code, dedupes against the
    // client-side fbq fires in QuizRunner. This is the path that matters most
    // for Meta: inside the LIFF browser the PDPA banner is rarely accepted,
    // so the client pixel usually never loads and this server event is the
    // only signal. No phone/email here (zero-form) — match quality rides on
    // fbc (carried through the gate → LIFF as ?fbclid) + ip + user_agent.
    // Lead row above was created with consent_pdpa=true.
    void sendMetaEvents({
      events: [
        { event_name: 'CompleteRegistration', event_id: voucher.code },
        { event_name: 'Lead', event_id: voucher.code },
      ],
      service: body.service,
      user: {
        external_id: voucher.code,
        ip: clientIp || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
        fbc: body.fbc,
        fbp: body.fbp,
      },
      custom_data: {
        content_category: body.service,
        content_name: `${body.service.toUpperCase()} Voucher`,
        value: scoring.score,
        currency: 'THB',
        lead_tier: scoring.tier,
      },
      event_source_url: req.headers.get('referer') || `https://roogondee.com/liff/quiz?service=${body.service}`,
    })

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      tier: scoring.tier,
      score: scoring.score,
      waitlist: false,
      voucher: { code: voucher.code, expires_at: voucher.expires_at },
      insight,
      liff_linked: !!liffUser,
    })
  } catch (err) {
    console.error('quiz claim-line error:', err)
    return NextResponse.json(
      { error: 'ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อ LINE @roogondee' },
      { status: 500 },
    )
  }
}
