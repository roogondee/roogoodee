// Daily jobs (§4.3, §4.7, §4.8), run by /api/cron/dmglp-daily at 09:00 BKK:
//   1. visit reminders for tomorrow (LINE, neutral text)
//   2. symptom-survey links for the day after tomorrow
//   3. no-show: mark yesterday's unattended visits `missed`; after 7 days
//      without a reschedule, one `call_no_show` task for the admin
//   4. bookkeeping: overdue instalments, expired programmes, expired pens
// Each step is independent and reports its own counts.

import { supabaseAdmin } from '@/lib/supabase'
import { addDays, todayBkk } from './dates'
import { REMINDER_DAYS_BEFORE, SURVEY_DAYS_BEFORE } from './config'
import { surveyInviteText, visitReminderText } from './reminders-text'
import { createAlert, getRules, liffUrl, pushToPatient } from './db'

type Appt = { id: string; patient_id: string; scheduled_date: string; type: string; patient: { line_user_id: string | null } | { line_user_id: string | null }[] | null }
const lineOf = (a: Appt) => (Array.isArray(a.patient) ? a.patient[0] : a.patient)?.line_user_id ?? null

export async function sendVisitReminders(today = todayBkk()) {
  const target = addDays(today, REMINDER_DAYS_BEFORE)
  const { data } = await supabaseAdmin
    .from('dmglp_appointments')
    .select('id, patient_id, scheduled_date, type, patient:dmglp_patients(line_user_id)')
    .eq('scheduled_date', target).in('status', ['scheduled', 'rescheduled']).neq('type', 'line_followup').is('reminder_sent_at', null)
  let sent = 0, noLine = 0
  for (const a of (data ?? []) as Appt[]) {
    const line = lineOf(a)
    if (!line) { noLine++; continue }
    const ok = await pushToPatient(line, visitReminderText(a.scheduled_date, liffUrl('appointments')))
    if (ok) {
      sent++
      await supabaseAdmin.from('dmglp_appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', a.id)
    }
  }
  return { target, sent, noLine }
}

export async function sendSurveyInvites(today = todayBkk()) {
  const target = addDays(today, SURVEY_DAYS_BEFORE)
  const { data } = await supabaseAdmin
    .from('dmglp_appointments')
    .select('id, patient_id, scheduled_date, type, patient:dmglp_patients(line_user_id)')
    .eq('scheduled_date', target).in('status', ['scheduled', 'rescheduled']).in('type', ['specialist_visit', 'followup_visit']).is('survey_sent_at', null)
  let sent = 0, skipped = 0
  for (const a of (data ?? []) as Appt[]) {
    const line = lineOf(a)
    const url = liffUrl('survey', a.id)
    if (!line || !url) { skipped++; continue }
    const ok = await pushToPatient(line, surveyInviteText(url))
    if (ok) {
      sent++
      await supabaseAdmin.from('dmglp_appointments').update({ survey_sent_at: new Date().toISOString() }).eq('id', a.id)
    }
  }
  return { target, sent, skipped }
}

export async function processNoShows(today = todayBkk()) {
  const rules = await getRules()
  // 1. Not checked in by the scheduled date → missed.
  const { data: missedNow } = await supabaseAdmin
    .from('dmglp_appointments')
    .update({ status: 'missed', missed_at: new Date().toISOString() })
    .lt('scheduled_date', today).in('status', ['scheduled', 'rescheduled']).neq('type', 'line_followup')
    .select('id')
  // 2. Still missed N days later → one call task (unique index guards repeats).
  const cutoff = addDays(today, -rules.no_show_call_after_days)
  const { data: stale } = await supabaseAdmin
    .from('dmglp_appointments')
    .select('id, patient_id, template_code, scheduled_date')
    .eq('status', 'missed').lte('scheduled_date', cutoff).is('no_show_task_id', null)
  let tasks = 0
  for (const a of stale ?? []) {
    const { data: task, error } = await supabaseAdmin
      .from('dmglp_tasks')
      .insert({ patient_id: a.patient_id, appointment_id: a.id, assignee_role: 'admin', kind: 'call_no_show', priority: 'normal', due_date: today, note: `ไม่มาตามนัด ${a.template_code || ''} ${a.scheduled_date} และยังไม่เลื่อนนัดใน ${rules.no_show_call_after_days} วัน — โทรตาม` })
      .select('id').single()
    if (!error && task) {
      tasks++
      await supabaseAdmin.from('dmglp_appointments').update({ no_show_task_id: task.id }).eq('id', a.id)
    }
  }
  return { markedMissed: missedNow?.length ?? 0, tasksCreated: tasks }
}

export async function runBookkeeping(today = todayBkk()) {
  const { data: overdue } = await supabaseAdmin.from('dmglp_installments').update({ status: 'overdue' }).eq('status', 'due').lt('due_date', today).select('id')
  const { data: expiredPrograms } = await supabaseAdmin.from('dmglp_programs').update({ status: 'expired' }).eq('status', 'active').lt('expires_at', today).select('id')
  const { data: expiredPens } = await supabaseAdmin.from('dmglp_pens').update({ status: 'expired', status_note: 'หมดอายุ (อัตโนมัติ)' }).in('status', ['in_stock', 'quarantine']).lt('expiry', today).select('id, sku')
  if (expiredPens && expiredPens.length) {
    await createAlert({ source: 'stock', severity: 'normal', message: `ปากกาหมดอายุ ${expiredPens.length} ชิ้น (${Array.from(new Set(expiredPens.map(p => p.sku))).join(', ')}) — นำออกจากตู้และบันทึกทำลาย` })
  }
  // Pens expiring within 60 days: one heads-up per SKU.
  const soon = addDays(today, 60)
  const { data: expiringSoon } = await supabaseAdmin.from('dmglp_pens').select('sku').eq('status', 'in_stock').lte('expiry', soon).gte('expiry', today)
  return { overdueInstallments: overdue?.length ?? 0, expiredPrograms: expiredPrograms?.length ?? 0, expiredPens: expiredPens?.length ?? 0, expiringSoon: expiringSoon?.length ?? 0 }
}
