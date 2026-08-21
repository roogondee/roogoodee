import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification, sendVoucherToUser } from '@/lib/email'
import { notifyLeadToSale, notifyMindCrisisToSale, pushMindCrisisReplyToUser } from '@/lib/line-notify'
import { scoreQuiz } from '@/lib/quiz/scoring'
import { issueVoucher } from '@/lib/quiz/voucher'
import { pickNextAssignee } from '@/lib/quiz/assign'
import { summarizeAnswers } from '@/lib/quiz/summary'
import { generateInsight } from '@/lib/quiz/insight'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { encryptJson } from '@/lib/encryption'
import { sendTikTokEvent } from '@/lib/tiktok-events'
import { sendMetaEvents } from '@/lib/meta-capi'
import type { QuizSubmission, Service } from '@/types'

type QuizPayload = Partial<QuizSubmission> & {
  recaptcha_token?: string
  ttclid?: string
  ttp?: string
  fbc?: string
  fbp?: string
}

const VALID_SERVICES: readonly Service[] = ['glp1', 'ckd', 'std', 'foreign', 'mens', 'women', 'mind', 'dna']

// Spec §5.2: "จำกัด 50 สิทธิ์/service/เดือน"
const MONTHLY_QUOTA = 50

function normalizePhone(p: string): string {
  let s = p.replace(/[-\s().]/g, '')
  // Accept E.164-style Thai numbers pasted from LINE/contacts
  if (s.startsWith('+66')) s = '0' + s.slice(3)
  else if (s.startsWith('66') && s.length >= 10) s = '0' + s.slice(2)
  return s
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuizPayload

    if (!body.service || !VALID_SERVICES.includes(body.service)) {
      return NextResponse.json({ error: 'บริการไม่ถูกต้อง' }, { status: 400 })
    }
    if (!body.first_name?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ' }, { status: 400 })
    }
    const phone = body.phone ? normalizePhone(body.phone) : ''
    if (!/^0\d{8,9}$/.test(phone)) {
      return NextResponse.json({ error: 'เบอร์โทรไม่ถูกต้อง' }, { status: 400 })
    }
    if (!body.consent_pdpa) {
      return NextResponse.json({ error: 'กรุณายอมรับเงื่อนไข PDPA' }, { status: 400 })
    }

    // reCAPTCHA v3 — advisory only, never blocks the submission. Ad-blockers
    // and data-saver browsers routinely prevent the Google script from
    // loading, which used to reject real customers after they had completed
    // the whole quiz. The outcome is stored on the lead (recaptcha_ok /
    // recaptcha_reason) so the team can screen suspicious entries; the IP
    // rate limit below stays as the bot backstop.
    const captcha = await verifyRecaptcha(body.recaptcha_token, `quiz_${body.service}`)
    if (!captcha.success) {
      console.warn('quiz: recaptcha not verified (continuing)', captcha)
    }

    // IP rate limit — protect against bot/scraper exhausting the monthly
    // service quota. Counts leads created from the same IP within the last
    // 24 hours. Threshold is 30/day: Thai mobile carriers put many users
    // behind one CGNAT IP, so a lower limit blocks real customers. Fails
    // OPEN on `leads.client_ip` column missing so existing deployments
    // without the column don't break.
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    if (clientIp) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: ipCount, error: ipErr } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('client_ip', clientIp)
        .gte('created_at', dayAgo)
      if (!ipErr && (ipCount ?? 0) >= 30) {
        console.warn('quiz: ip rate limit exceeded', { clientIp, ipCount })
        return NextResponse.json(
          { error: 'ระบบตรวจพบคำขอจาก IP นี้มากเกินไป กรุณาลองใหม่ในวันพรุ่งนี้ หรือติดต่อ LINE @roogondee' },
          { status: 429 },
        )
      }
    }

    // Spec §5.2: 1 voucher / service / person — check by phone+service
    const { data: existingVoucher } = await supabaseAdmin
      .from('vouchers')
      .select('id, lead_id, leads!inner(phone, service)')
      .eq('service', body.service)
      .eq('leads.phone', phone)
      .limit(1)

    if (existingVoucher && existingVoucher.length > 0) {
      return NextResponse.json(
        { error: 'คุณรับสิทธิ์ตรวจ service นี้แล้ว — ติดต่อ LINE @roogondee เพื่อสอบถาม' },
        { status: 409 },
      )
    }

    // Same phone re-submitting within 24h without a voucher (waitlisted, or
    // an earlier submission whose voucher issuance failed) — don't insert a
    // duplicate lead, reply with the same "team will contact you" outcome.
    const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLeads } = await supabaseAdmin
      .from('leads')
      .select('id, lead_tier, lead_score')
      .eq('phone', phone)
      .eq('service', body.service)
      .gte('created_at', recentSince)
      .limit(1)
    if (recentLeads && recentLeads.length > 0) {
      return NextResponse.json({
        success: true,
        waitlist: true,
        lead_id: recentLeads[0].id,
        tier: recentLeads[0].lead_tier,
        score: recentLeads[0].lead_score,
        voucher: null,
        insight: null,
      })
    }

    // Spec §5.2: monthly quota 50/service/month. When the quota is full the
    // lead is still captured (status 'waitlist', no voucher) so a successful
    // campaign never silently discards customers mid-month.
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count: monthCount } = await supabaseAdmin
      .from('vouchers')
      .select('id', { count: 'exact', head: true })
      .eq('service', body.service)
      .gte('issued_at', monthStart.toISOString())

    const quotaFull = (monthCount ?? 0) >= MONTHLY_QUOTA

    const answers = body.answers ?? {}
    const scoring = scoreQuiz(body.service, answers)

    // Spec §8.2: encrypt sensitive STD quiz answers at rest
    const storedAnswers = body.service === 'std' ? encryptJson(answers) : answers

    // Round-robin auto-assign (§6.2 SLA routing)
    const assignee = await pickNextAssignee()

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([{
        service:       body.service,
        first_name:    body.first_name.trim(),
        last_name:     body.last_name?.trim() || null,
        phone,
        line_id:       body.line_id?.trim() || null,
        email:         body.email?.trim() || null,
        age:           body.age || null,
        gender:        body.gender || null,
        quiz_answers:  storedAnswers,
        lead_score:    scoring.score,
        lead_tier:     scoring.tier,
        assigned_to:   assignee,
        assigned_at:   assignee ? new Date().toISOString() : null,
        consent_pdpa:  true,
        consent_at:    body.consent_at || new Date().toISOString(),
        client_ip:     clientIp || null,
        source:        'quiz',
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

    // Voucher issuance can fail (code collisions, DB hiccup). The lead row
    // already exists at this point, so never turn that into a user-facing
    // error — fall back to the waitlist outcome and let the team follow up.
    let voucher: Awaited<ReturnType<typeof issueVoucher>> | null = null
    if (!quotaFull) {
      try {
        voucher = await issueVoucher({ leadId: inserted.id, service: body.service })
      } catch (err) {
        console.error('issueVoucher failed — falling back to waitlist outcome:', err)
      }
    }

    const notifyPayload = {
      name:               `${inserted.first_name} ${inserted.last_name || ''}`.trim(),
      phone:              inserted.phone,
      line_id:            inserted.line_id,
      email:              inserted.email,
      service:            body.service,
      tier:               scoring.tier,
      score:              scoring.score,
      voucher_code:       voucher ? voucher.code : 'ไม่มี — waitlist รอติดต่อกลับ',
      voucher_expires_at: voucher?.expires_at,
      reasons:            scoring.reasons,
      answer_summary:     summarizeAnswers(body.service, answers),
    } as const

    // Mind pillar safety gate — see docs/mind-crisis-sop.md. self_harm
    // flag triggers a crisis-formatted alert to the sales LINE Group
    // (supersedes the normal handoff card) plus an immediate LINE auto-
    // reply to the lead surfacing hotline 1323.
    //
    // Await everything (PR #87): fire-and-forget was being dropped after
    // the response returned on Vercel.
    const isMindCrisis = body.service === 'mind' && scoring.tier === 'urgent'
    if (isMindCrisis) {
      try {
        await notifyMindCrisisToSale(notifyPayload)
      } catch (err) {
        console.error('notifyMindCrisisToSale failed:', err)
      }
      if (inserted.line_id) {
        try {
          await pushMindCrisisReplyToUser(inserted.line_id, {
            name: notifyPayload.name,
            voucher_code: voucher?.code || '-',
          })
        } catch (err) {
          console.error('pushMindCrisisReplyToUser failed:', err)
        }
      }
    } else {
      try {
        await notifyLeadToSale(notifyPayload)
      } catch (err) {
        console.error('notifyLeadToSale failed:', err)
      }
    }

    void sendLeadNotification({
      name:    `${inserted.first_name} ${inserted.last_name || ''}`.trim(),
      phone:   inserted.phone,
      service: body.service,
      source:  `quiz (${scoring.tier.toUpperCase()} score ${scoring.score})`,
      note:    voucher ? `Voucher: ${voucher.code}` : 'Waitlist — no voucher issued',
    })

    if (inserted.email && voucher) {
      void sendVoucherToUser({
        to:         inserted.email,
        name:       `${inserted.first_name} ${inserted.last_name || ''}`.trim(),
        service:    body.service,
        code:       voucher.code,
        expires_at: voucher.expires_at,
      })
    }

    // TikTok Events API — fire SubmitForm with event_id = voucher.code so it
    // dedupes against the client-side ttq.track('SubmitForm', …, { event_id })
    // call in QuizRunner.
    const ip = clientIp || undefined
    const userAgent = req.headers.get('user-agent') || undefined
    if (voucher) {
      const voucherCode = voucher.code
      void sendTikTokEvent({
        event_name: 'SubmitForm',
        event_id: voucherCode,
        service: body.service,
        user: {
          email: inserted.email || undefined,
          phone: inserted.phone,
          external_id: voucherCode,
          ip,
          user_agent: userAgent,
          ttclid: body.ttclid,
          ttp: body.ttp,
        },
        properties: {
          content_id: voucherCode,
          content_name: `${body.service.toUpperCase()} Voucher`,
          content_type: 'lead',
          value: scoring.score,
          currency: 'THB',
          lead_score: scoring.tier,
          vertical: body.service,
        },
      })

      // Meta Conversions API — same dedup convention (event_id = voucher
      // code) against the client-side fbq fires in QuizRunner. Lead just got
      // created with consent_pdpa=true, so PDPA consent is established.
      void sendMetaEvents({
        events: [
          { event_name: 'CompleteRegistration', event_id: voucherCode },
          { event_name: 'Lead', event_id: voucherCode },
        ],
        service: body.service,
        user: {
          email: inserted.email || undefined,
          phone: inserted.phone,
          external_id: voucherCode,
          ip,
          user_agent: userAgent,
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
        event_source_url: req.headers.get('referer') || `https://roogondee.com/quiz/${body.service}`,
      })
    }

    return NextResponse.json({
      success: true,
      lead_id: inserted.id,
      tier: scoring.tier,
      score: scoring.score,
      waitlist: !voucher,
      voucher: voucher
        ? { code: voucher.code, expires_at: voucher.expires_at }
        : null,
      insight: generateInsight(body.service, answers, scoring.tier),
    })
  } catch (err) {
    // Never leak raw (English) error strings into the Thai UI
    console.error('quiz submit error:', err)
    return NextResponse.json(
      { error: 'ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หรือติดต่อ LINE @roogondee' },
      { status: 500 },
    )
  }
}
