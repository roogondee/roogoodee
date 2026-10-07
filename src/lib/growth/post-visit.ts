// Daily post-visit runner (GET /api/cron/post-visit, 10:00 BKK):
//   1. review requests — day after a redeemed voucher (REVIEW_SERVICES)
//   2. recalls         — "time for your follow-up check" (RECALL_AFTER_DAYS)
//   3. employer alerts — workers due for their annual checkup (HR portal)
//
// Every patient message goes 1:1 over LINE to the lead's own linked
// line_user_id, requires consent_pdpa, and is stamped on the voucher so a
// re-run never sends twice.

import { supabaseAdmin } from '@/lib/supabase'
import { notifySaleGroupText } from '@/lib/line-notify'
import {
  EMPLOYER_ALERT_AHEAD_DAYS, EMPLOYER_RECHECK_DAYS, RECALL_AFTER_DAYS, REVIEW_DELAY_DAYS,
  REVIEW_MAX_AGE_DAYS, REVIEW_SERVICES,
} from './config'
import { pushLineMessages, textMessage } from './line'
import { reviewRequestMessage } from './review'
import { dueWorkers, fetchEmployerCertificates } from './employer'

const DAY = 24 * 60 * 60 * 1000
const BATCH = 100

// A recall is only sent inside this many days after it falls due. Without a
// window, the first deploy would message every patient ever redeemed — a
// blast, not a reminder.
const RECALL_WINDOW_DAYS = 14

interface VoucherLead {
  first_name: string | null
  line_user_id: string | null
  consent_pdpa: boolean | null
}

interface DueVoucher {
  id: string
  service: string
  redeemed_at: string
  lead: VoucherLead | VoucherLead[] | null
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

// The LINE bot kill switch silences everything automated on the OA.
const lineAllowed = () => process.env.LINE_BOT_ENABLED !== 'false'

export async function sendReviewRequests(now = Date.now()) {
  if (!lineAllowed()) return { sent: 0, skipped: 'LINE_BOT_ENABLED=false' }

  const { data, error } = await supabaseAdmin
    .from('vouchers')
    .select('id, service, redeemed_at, lead:leads(first_name, line_user_id, consent_pdpa)')
    .in('service', [...REVIEW_SERVICES])
    .is('review_requested_at', null)
    .lte('redeemed_at', new Date(now - REVIEW_DELAY_DAYS * DAY).toISOString())
    .gte('redeemed_at', new Date(now - REVIEW_MAX_AGE_DAYS * DAY).toISOString())
    .limit(BATCH)
  if (error) throw new Error(`review query: ${error.message}`)

  let sent = 0
  for (const v of (data as DueVoucher[] | null) ?? []) {
    const lead = one(v.lead)
    if (!lead?.line_user_id || !lead.consent_pdpa) continue
    const ok = await pushLineMessages(lead.line_user_id, [reviewRequestMessage(v.id, v.service, lead.first_name)])
    if (!ok) continue
    await supabaseAdmin.from('vouchers').update({ review_requested_at: new Date().toISOString() }).eq('id', v.id)
    sent++
  }
  return { sent }
}

// Discreet, no medical claim, no free offer (the quiz voucher is one per
// service per LINE user, so a recheck is a paid visit — say so up front).
const RECALL_TEXT: Record<string, string> = {
  glp1: 'ครบ 3 เดือนแล้วตั้งแต่คุณตรวจน้ำตาล/HbA1c ครั้งก่อน',
  ckd: 'ครบ 6 เดือนแล้วตั้งแต่คุณตรวจคัดกรองโรคไตครั้งก่อน',
  mens: 'ครบ 6 เดือนแล้วตั้งแต่คุณปรึกษาแพทย์ครั้งก่อน',
  women: 'ครบ 1 ปีแล้วตั้งแต่คุณตรวจสุขภาพสตรีครั้งก่อน',
}

export async function sendRecalls(now = Date.now()) {
  if (!lineAllowed()) return { sent: 0, skipped: 'LINE_BOT_ENABLED=false' }

  let sent = 0
  const perService: Record<string, number> = {}
  for (const [service, days] of Object.entries(RECALL_AFTER_DAYS)) {
    const { data, error } = await supabaseAdmin
      .from('vouchers')
      .select('id, service, redeemed_at, lead:leads(first_name, line_user_id, consent_pdpa)')
      .eq('service', service)
      .is('recall_sent_at', null)
      .lte('redeemed_at', new Date(now - days! * DAY).toISOString())
      .gte('redeemed_at', new Date(now - (days! + RECALL_WINDOW_DAYS) * DAY).toISOString())
      .limit(BATCH)
    if (error) throw new Error(`recall query (${service}): ${error.message}`)

    for (const v of (data as DueVoucher[] | null) ?? []) {
      const lead = one(v.lead)
      if (!lead?.line_user_id || !lead.consent_pdpa) continue
      const ok = await pushLineMessages(lead.line_user_id, [textMessage([
        `สวัสดีค่ะ ${RECALL_TEXT[service] || 'ครบรอบตรวจติดตามแล้วค่ะ'}`,
        'อยากตรวจติดตามผลไหมคะ? พิมพ์ "นัดตรวจ" ในแชตนี้ได้เลย ทีมงานจะช่วยนัดที่ W Medical Hospital และแจ้งค่าใช้จ่ายให้ทราบก่อนทุกครั้งค่ะ',
      ].join('\n'))])
      if (!ok) continue
      await supabaseAdmin.from('vouchers').update({ recall_sent_at: new Date().toISOString() }).eq('id', v.id)
      sent++
      perService[service] = (perService[service] || 0) + 1
    }
  }

  // Heads-up so staff expect "นัดตรวจ" replies today.
  if (sent > 0) {
    await notifySaleGroupText([
      `📅 ส่งข้อความชวนตรวจซ้ำ (recall) วันนี้ ${sent} คน`,
      ...Object.entries(perService).map(([s, n]) => `• ${s}: ${n}`),
      'ถ้ามีคนพิมพ์ "นัดตรวจ" ในแชต OA ช่วยตอบและนัดให้ด้วยนะคะ',
    ].join('\n'))
  }
  return { sent, perService }
}

export async function sendEmployerRenewalAlerts(now = Date.now()) {
  const { data: employers, error } = await supabaseAdmin
    .from('employer_accounts')
    .select('id, name, match_names, contact_name, contact_phone, renewal_notified_at')
    .eq('active', true)
  if (error) throw new Error(`employer query: ${error.message}`)

  let alerted = 0
  for (const emp of employers ?? []) {
    // Weekly at most per employer.
    if (emp.renewal_notified_at && now - new Date(emp.renewal_notified_at).getTime() < 7 * DAY) continue

    const certs = await fetchEmployerCertificates(emp.match_names as string[])
    const due = dueWorkers(certs, now, EMPLOYER_RECHECK_DAYS, EMPLOYER_ALERT_AHEAD_DAYS)
    if (due.length === 0) continue

    const overdue = due.filter(d => d.daysUntilDue < 0).length
    await notifySaleGroupText([
      `🏭 ${emp.name}: แรงงาน ${due.length} คนครบรอบตรวจสุขภาพประจำปีภายใน ${EMPLOYER_ALERT_AHEAD_DAYS} วัน${overdue ? ` (เลยกำหนดแล้ว ${overdue})` : ''}`,
      emp.contact_name || emp.contact_phone ? `ติดต่อ HR: ${[emp.contact_name, emp.contact_phone].filter(Boolean).join(' ')}` : '',
      'โทรเสนอนัดตรวจกลุ่มได้เลย — ดูรายชื่อที่ /admin/employers',
    ].filter(Boolean).join('\n'))
    await supabaseAdmin.from('employer_accounts').update({ renewal_notified_at: new Date(now).toISOString() }).eq('id', emp.id)
    alerted++
  }
  return { alerted }
}
