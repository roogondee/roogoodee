import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification, sendVoucherToUser } from '@/lib/email'
import { notifyLeadToSale } from '@/lib/line-notify'
import { scoreQuiz } from '@/lib/quiz/scoring'
import { issueVoucher } from '@/lib/quiz/voucher'
import { pickNextAssignee } from '@/lib/quiz/assign'
import { summarizeAnswers } from '@/lib/quiz/summary'
import { generateInsight } from '@/lib/quiz/insight'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { encryptJson } from '@/lib/encryption'
import { sendTikTokEvent } from '@/lib/tiktok-events'
import type { QuizSubmission, Service } from '@/types'

type QuizPayload = Partial<QuizSubmission> & {
  recaptcha_token?: string
  ttclid?: string
  ttp?: string
}

const VALID_SERVICES: readonly Service[] = ['glp1', 'ckd', 'std', 'foreign', 'mens']

// Spec §5.2: "จำกัด 50 สิทธิ์/service/เดือน"
const MONTHLY_QUOTA = 50

function normalizePhone(p: string): string {
  return p.replace(/[-\s]/g, '')
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

    // reCAPTCHA v3 — fails open if RECAPTCHA_SECRET_KEY is unset
    const captcha = await verifyRecaptcha(body.recaptcha_token, `quiz_${body.service}`)
    if (!captcha.success) {
      console.warn('quiz: recaptcha rejected', captcha)
      return NextResponse.json(
        { error: 'ตรวจพบการใช้งานผิดปกติ กรุณารีเฟรชหน้านี้แล้วลองใหม่' },
        { status: 400 },
      )
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

    // Spec §5.2: monthly quota 50/service/month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count: monthCount } = await supabaseAdmin
      .from('vouchers')
      .select('id', { count: 'exact', head: true })
      .eq('service', body.service)
      .gte('issued_at', monthStart.toISOString())

    if ((monthCount ?? 0) >= MONTHLY_QUOTA) {
      return NextResponse.json(
        { error: 'สิทธิ์ประจำเดือนเต็มแล้ว — กลับมาใหม่เดือนหน้า หรือติดต่อ LINE @roogondee' },
        { status: 429 },
      )
    }

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
        source:        'quiz',
        utm_source:    body.utm_source || null,
        utm_medium:    body.utm_medium || null,
        utm_campaign:  body.utm_campaign || null,
        status:        'new',
      }])
      .select()
      .single()

    if (insertError) throw insertError

    const voucher = await issueVoucher({ leadId: inserted.id, service: body.service })

    void notifyLeadToSale({
      name:               `${inserted.first_name} ${inserted.last_name || ''}`.trim(),
      phone:              inserted.phone,
      line_id:            inserted.line_id,
      email:              inserted.email,
      service:            body.service,
      tier:               scoring.tier,
      score:              scoring.score,
      voucher_code:       voucher.code,
      voucher_expires_at: voucher.expires_at,
      reasons:            scoring.reasons,
      answer_summary:     summarizeAnswers(body.service, answers),
    })

    void sendLeadNotification({
      name:    `${inserted.first_name} ${inserted.last_name || ''}`.trim(),
      phone:   inserted.phone,
      service: body.service,
      source:  `quiz (${scoring.tier.toUpperCase()} score ${scoring.score})`,
      note:    `Voucher: ${voucher.code}`,
    })

    if (inserted.email) {
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
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || undefined
    const userAgent = req.headers.get('user-agent') || undefined
    void sendTikTokEvent({
      event_name: 'SubmitForm',
      event_id: voucher.code,
      user: {
        email: inserted.email || undefined,
        phone: inserted.phone,
        external_id: voucher.code,
        ip,
        user_agent: userAgent,
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
      lead_id: inserted.id,
      tier: scoring.tier,
      score: scoring.score,
      voucher: {
        code: voucher.code,
        expires_at: voucher.expires_at,
      },
      insight: generateInsight(body.service, answers, scoring.tier),
    })
  } catch (err) {
    console.error('quiz submit error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' },
      { status: 500 },
    )
  }
}
