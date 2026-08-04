import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification } from '@/lib/email'
import { notifyLeadToSale, notifyMindCrisisToSale } from '@/lib/line-notify'
import { scoreQuiz } from '@/lib/quiz/scoring'
import { issueVoucher } from '@/lib/quiz/voucher'
import { pickNextAssignee } from '@/lib/quiz/assign'
import { summarizeAnswers } from '@/lib/quiz/summary'
import { generateInsight } from '@/lib/quiz/insight'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { encryptJson } from '@/lib/encryption'
import { sendTikTokEvent } from '@/lib/tiktok-events'
import type { Service } from '@/types'

// Zero-form voucher claim (LINE path).
//
// The quiz result page lets the user claim a voucher without typing any
// contact info: we create a lead keyed by the quiz session_id, issue the
// voucher, and show a LINE deep link with the code prefilled. When the user
// sends the code in the OA chat, the existing line-webhook voucher linkage
// saves their line_user_id onto this lead — that moment is when the lead
// becomes contactable.
//
// `leads.phone` is NOT NULL, so (matching the bot-lead convention of storing
// a platform userId there) claim rows carry the quiz session_id in `phone`
// until the LINE link happens. The uuid shape can never collide with the
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

    // Idempotent re-claim: the session_id lives in localStorage, so a
    // refresh + second tap must return the same voucher instead of minting
    // a new lead. (phone carries the session_id for claim rows — see above.)
    const { data: priorLeads } = await supabaseAdmin
      .from('leads')
      .select('id, lead_tier, lead_score')
      .eq('phone', body.session_id)
      .eq('service', body.service)
      .limit(1)
    let leadId = priorLeads?.[0]?.id as string | undefined

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
        })
      }
      // Lead exists but voucher issuance failed last time — fall through and
      // retry issuance on the same lead below.
    }

    // Monthly quota. Unlike the form path we do NOT insert a waitlist lead:
    // a claim row has no contact info yet, so an un-vouchered one would be
    // permanently unreachable. Send the user to the OA chat instead.
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count: monthCount } = await supabaseAdmin
      .from('vouchers')
      .select('id', { count: 'exact', head: true })
      .eq('service', body.service)
      .gte('issued_at', monthStart.toISOString())
    if ((monthCount ?? 0) >= MONTHLY_QUOTA && !leadId) {
      return NextResponse.json({
        success: true,
        waitlist: true,
        tier: scoring.tier,
        score: scoring.score,
        voucher: null,
        insight,
      })
    }

    if (!leadId) {
      // Spec §8.2: encrypt sensitive STD quiz answers at rest
      const storedAnswers = body.service === 'std' ? encryptJson(answers) : answers
      const assignee = await pickNextAssignee()

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('leads')
        .insert([{
          service:       body.service,
          first_name:    PENDING_LINE_LABEL,
          phone:         body.session_id,
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
          source:        'quiz-line',
          utm_source:    body.utm_source || null,
          utm_medium:    body.utm_medium || null,
          utm_campaign:  body.utm_campaign || null,
          status:        'new',
          recaptcha_ok:     captcha.success,
          recaptcha_reason: captcha.reason || null,
        }])
        .select()
        .single()
      if (insertError) throw insertError
      leadId = inserted.id as string
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

    const notifyPayload = {
      name:               `${PENDING_LINE_LABEL} (quiz)`,
      phone:              PENDING_LINE_LABEL,
      service:            body.service,
      tier:               scoring.tier,
      score:              scoring.score,
      voucher_code:       voucher.code,
      voucher_expires_at: voucher.expires_at,
      reasons:            scoring.reasons,
      answer_summary:     summarizeAnswers(body.service, answers),
    } as const

    // Mind safety gate — see docs/mind-crisis-sop.md. The crisis alert to the
    // sales group fires exactly as on the form path; there is no direct LINE
    // push yet (no user id until they send the code), but the on-screen
    // insight already surfaces hotline 1323 for the urgent tier.
    if (body.service === 'mind' && scoring.tier === 'urgent') {
      try {
        await notifyMindCrisisToSale(notifyPayload)
      } catch (err) {
        console.error('quiz claim-line: notifyMindCrisisToSale failed:', err)
      }
    } else {
      try {
        await notifyLeadToSale(notifyPayload)
      } catch (err) {
        console.error('quiz claim-line: notifyLeadToSale failed:', err)
      }
    }

    void sendLeadNotification({
      name:    `${PENDING_LINE_LABEL} (quiz)`,
      phone:   PENDING_LINE_LABEL,
      service: body.service,
      source:  `quiz-line (${scoring.tier.toUpperCase()} score ${scoring.score})`,
      note:    `Voucher: ${voucher.code} — ลูกค้าจะส่งโค้ดยืนยันทาง LINE OA`,
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

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      tier: scoring.tier,
      score: scoring.score,
      waitlist: false,
      voucher: { code: voucher.code, expires_at: voucher.expires_at },
      insight,
    })
  } catch (err) {
    console.error('quiz claim-line error:', err)
    return NextResponse.json(
      { error: 'ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อ LINE @roogondee' },
      { status: 500 },
    )
  }
}
