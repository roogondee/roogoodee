'use server'

// Server actions for the DMGLP staff area. Every write goes through here:
// role check (src/lib/dmglp/roles.ts) → validation → write → audit →
// revalidate. Validation failures bounce back to the form with ?err=, so the
// pages stay server components.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglpAction, type DmglpUser } from '@/lib/dmglp/roles'
import { dmglpAudit } from '@/lib/dmglp/audit'
import {
  attributionForPatient, createAlert, getPriceMap, getRules, liffUrl, pushToPatient, recordConversion,
} from '@/lib/dmglp/db'
import { computeEligibility, type ScreeningInput } from '@/lib/dmglp/eligibility'
import { titrationFlags } from '@/lib/dmglp/titration'
import { generateSchedule, generateMaintenanceSchedule, reschedule } from '@/lib/dmglp/schedule'
import { calculateRefund, installmentPlan, recalculateInstalments } from '@/lib/dmglp/refund'
import { lineFollowupText } from '@/lib/dmglp/reminders-text'
import { addMonths, isIsoDate, todayBkk, daysBetween, toBkkDate } from '@/lib/dmglp/dates'
import {
  DRUGS, FRIDGE_MAX_C, FRIDGE_MIN_C, PROGRAM_INSTALLMENTS, PROGRAM_VALIDITY_MONTHS, SURVEY_ITEMS,
  skuFor, type DrugKey, type DmglpRole,
} from '@/lib/dmglp/config'
import { isDmglpRole } from '@/lib/dmglp/roles'

const STAFF = '/dmglp/staff'

// ── helpers ──────────────────────────────────────────────────────────────
function str(fd: FormData, key: string, max = 500): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function num(fd: FormData, key: string): number | null {
  const v = str(fd, key, 32)
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key)
  return v === 'on' || v === 'true' || v === '1'
}
function list(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === 'string' && v !== '').map(v => v.slice(0, 60))
}
function uuid(fd: FormData, key: string): string | null {
  const v = str(fd, key, 40)
  return /^[0-9a-f-]{36}$/i.test(v) ? v : null
}
function back(path: string, msg: string, kind: 'err' | 'ok' = 'err'): never {
  redirect(`${path}?${kind}=${encodeURIComponent(msg)}`)
}
async function guard(perm: Parameters<typeof requireDmglpAction>[0], path: string): Promise<DmglpUser> {
  try {
    return await requireDmglpAction(perm)
  } catch (e) {
    back(path, (e as Error).message)
  }
}
function refresh(...paths: string[]) {
  for (const p of paths) revalidatePath(p)
}

// ── leads ────────────────────────────────────────────────────────────────
export async function createLead(fd: FormData) {
  const path = `${STAFF}/leads`
  const me = await guard('leads.write', path)
  const display_name = str(fd, 'display_name', 120)
  const phone = str(fd, 'phone', 20)
  if (!display_name && !phone) back(path, 'กรอกชื่อหรือเบอร์โทรอย่างน้อยหนึ่งอย่าง')
  const { data, error } = await supabaseAdmin
    .from('dmglp_leads')
    .insert({ display_name: display_name || null, phone: phone || null, notes: str(fd, 'notes', 1000) || null })
    .select('id').single()
  if (error) back(path, error.message)
  dmglpAudit(me, 'create', 'dmglp_leads', data.id)
  refresh(path)
  back(path, 'เพิ่ม lead แล้ว', 'ok')
}

export async function updateLead(fd: FormData) {
  const path = `${STAFF}/leads`
  const me = await guard('leads.write', path)
  const id = uuid(fd, 'id')
  const status = str(fd, 'status', 20)
  if (!id || !['new', 'contacted', 'booked', 'converted', 'lost'].includes(status)) back(path, 'ข้อมูลไม่ถูกต้อง')
  const { error } = await supabaseAdmin
    .from('dmglp_leads')
    .update({ status, notes: str(fd, 'notes', 1000) || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) back(path, error.message)
  dmglpAudit(me, 'update', 'dmglp_leads', id, { status })
  refresh(path)
}

// ── patients ─────────────────────────────────────────────────────────────
export async function createPatient(fd: FormData) {
  const path = `${STAFF}/patients`
  const me = await guard('patients.write', path)
  const first_name = str(fd, 'first_name', 80)
  const last_name = str(fd, 'last_name', 80)
  if (!first_name || !last_name) back(path, 'กรอกชื่อและนามสกุล')
  const birth_date = str(fd, 'birth_date', 10)
  if (birth_date && !isIsoDate(birth_date)) back(path, 'วันเกิดไม่ถูกต้อง')
  const sex = str(fd, 'sex', 1)
  const lead_id = uuid(fd, 'lead_id')
  const consents = list(fd, 'consent')
  if (!consents.includes('pdpa')) back(path, 'ต้องมีความยินยอม PDPA ก่อนสร้างข้อมูลผู้ป่วย')

  let line_user_id: string | null = null
  if (lead_id) {
    const { data: lead } = await supabaseAdmin.from('dmglp_leads').select('line_user_id').eq('id', lead_id).maybeSingle()
    line_user_id = lead?.line_user_id ?? null
  }

  const { data, error } = await supabaseAdmin
    .from('dmglp_patients')
    .insert({
      hn: str(fd, 'hn', 40) || null,
      first_name, last_name,
      sex: sex === 'M' || sex === 'F' ? sex : null,
      birth_date: birth_date || null,
      phone: str(fd, 'phone', 20) || null,
      line_user_id,
      lead_id,
      partner_id: uuid(fd, 'partner_id'),
      created_by: me.id,
    })
    .select('id').single()
  if (error) back(path, error.code === '23505' ? 'HN หรือ LINE นี้มีในระบบแล้ว' : error.message)

  await supabaseAdmin.from('dmglp_consents').insert(
    consents.filter(k => ['pdpa', 'treatment', 'program_terms'].includes(k))
      .map(kind => ({ patient_id: data.id, kind, version: str(fd, 'consent_version', 20) || '2026-09', recorded_by: me.id })),
  )
  if (lead_id) {
    await supabaseAdmin.from('dmglp_leads').update({ status: 'converted', updated_at: new Date().toISOString() }).eq('id', lead_id)
  }
  dmglpAudit(me, 'create', 'dmglp_patients', data.id)
  refresh(path, `${STAFF}/leads`)
  redirect(`${STAFF}/patients/${data.id}`)
}

export async function updatePatient(fd: FormData) {
  const id = uuid(fd, 'id')
  const path = `${STAFF}/patients/${id}`
  const me = await guard('patients.write', path)
  if (!id) back(`${STAFF}/patients`, 'ไม่พบผู้ป่วย')
  const birth_date = str(fd, 'birth_date', 10)
  const { error } = await supabaseAdmin
    .from('dmglp_patients')
    .update({
      hn: str(fd, 'hn', 40) || null,
      phone: str(fd, 'phone', 20) || null,
      birth_date: isIsoDate(birth_date) ? birth_date : null,
      sex: ['M', 'F'].includes(str(fd, 'sex', 1)) ? str(fd, 'sex', 1) : null,
      line_user_id: str(fd, 'line_user_id', 40) || null,
    })
    .eq('id', id)
  if (error) back(path, error.code === '23505' ? 'HN หรือ LINE นี้มีในระบบแล้ว' : error.message)
  dmglpAudit(me, 'update', 'dmglp_patients', id)
  refresh(path)
  back(path, 'บันทึกแล้ว', 'ok')
}

export async function recordConsent(fd: FormData) {
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}`
  const me = await guard('patients.write', path)
  const kind = str(fd, 'kind', 20)
  if (!patient_id || !['pdpa', 'treatment', 'program_terms'].includes(kind)) back(path, 'ข้อมูลไม่ถูกต้อง')
  await supabaseAdmin.from('dmglp_consents').insert({ patient_id, kind, version: str(fd, 'version', 20) || '2026-09', recorded_by: me.id })
  dmglpAudit(me, 'consent', 'dmglp_consents', patient_id, { kind })
  refresh(path)
}

// ── screening ────────────────────────────────────────────────────────────
export async function saveScreening(fd: FormData) {
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}/screening`
  const me = await guard('clinical.write', path)
  if (!patient_id) back(`${STAFF}/patients`, 'ไม่พบผู้ป่วย')

  const input: ScreeningInput = {
    weight_kg: num(fd, 'weight_kg'),
    height_cm: num(fd, 'height_cm'),
    has_t2dm: bool(fd, 'has_t2dm'),
    comorbidities: list(fd, 'comorbidities'),
    pregnant_or_planning: bool(fd, 'pregnant_or_planning'),
    breastfeeding: bool(fd, 'breastfeeding'),
    mtc_men2_history: bool(fd, 'mtc_men2_history'),
    pancreatitis_history: bool(fd, 'pancreatitis_history'),
    gallbladder_history: bool(fd, 'gallbladder_history'),
    gastroparesis: bool(fd, 'gastroparesis'),
    on_insulin: bool(fd, 'on_insulin'),
    on_sulfonylurea: bool(fd, 'on_sulfonylurea'),
    retinopathy: bool(fd, 'retinopathy'),
  }
  if (input.weight_kg != null && (input.weight_kg < 20 || input.weight_kg > 400)) back(path, 'น้ำหนักไม่สมเหตุสมผล')
  if (input.height_cm != null && (input.height_cm < 100 || input.height_cm > 250)) back(path, 'ส่วนสูงไม่สมเหตุสมผล')

  const rules = await getRules()
  const result = computeEligibility(input, rules)
  const { data, error } = await supabaseAdmin
    .from('dmglp_screenings')
    .insert({
      patient_id, ...input, waist_cm: num(fd, 'waist_cm'),
      eligibility_status: result.status, flags: result.flags, note: str(fd, 'note', 2000) || null, created_by: me.id,
    })
    .select('id').single()
  if (error) back(path, error.message)
  if (result.status === 'ineligible') {
    await createAlert({ patient_id, source: 'eligibility', severity: 'normal', message: `ผลคัดกรองไม่เข้าเกณฑ์: ${result.flags.join(', ')}` })
  }
  dmglpAudit(me, 'screen', 'dmglp_screenings', data.id, { status: result.status })
  refresh(path, `${STAFF}/patients/${patient_id}`)
  redirect(`${STAFF}/patients/${patient_id}?ok=${encodeURIComponent('บันทึกผลคัดกรองแล้ว')}`)
}

// ── enrollment → schedule ────────────────────────────────────────────────
export async function enrollPatient(fd: FormData) {
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}`
  const me = await guard('doctor.decide', path)
  if (!patient_id) back(`${STAFF}/patients`, 'ไม่พบผู้ป่วย')
  const drug = str(fd, 'drug', 20) as DrugKey
  const indication_icd10 = str(fd, 'indication_icd10', 10).toUpperCase()
  const start_date = str(fd, 'start_date', 10)
  if (!(drug in DRUGS)) back(path, 'เลือกยา')
  if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(indication_icd10)) back(path, 'รหัส ICD-10 ไม่ถูกต้อง (เช่น E11.9, E66.0)')
  if (!isIsoDate(start_date)) back(path, 'วันเริ่มโปรแกรมไม่ถูกต้อง')

  const { data: screening } = await supabaseAdmin
    .from('dmglp_screenings').select('id, eligibility_status').eq('patient_id', patient_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!screening) back(path, 'ต้องคัดกรองก่อนลงทะเบียนโปรแกรม')
  if (screening.eligibility_status === 'ineligible') back(path, 'ผลคัดกรองล่าสุด "ไม่เข้าเกณฑ์" — ลงทะเบียนไม่ได้ ต้องคัดกรองใหม่ก่อน')

  const { data: active } = await supabaseAdmin
    .from('dmglp_enrollments').select('id').eq('patient_id', patient_id).in('phase', ['initiation', 'maintenance']).limit(1)
  if (active && active.length) back(path, 'ผู้ป่วยมีโปรแกรมที่ยังดำเนินอยู่แล้ว')

  const { data: enr, error } = await supabaseAdmin
    .from('dmglp_enrollments')
    .insert({ patient_id, screening_id: screening.id, drug, indication_icd10, indication_note: str(fd, 'indication_note', 1000) || null, confirmed_by: me.id, start_date })
    .select('id').single()
  if (error) back(path, error.message)

  const plan = generateSchedule(start_date)
  const { error: apptErr } = await supabaseAdmin.from('dmglp_appointments').insert(
    plan.map(p => ({ enrollment_id: enr.id, patient_id, ...p })),
  )
  if (apptErr) back(path, `ลงทะเบียนแล้วแต่สร้างตารางนัดไม่สำเร็จ: ${apptErr.message}`)

  await recordConversion(await attributionForPatient(patient_id), 'booked')
  dmglpAudit(me, 'enroll', 'dmglp_enrollments', enr.id, { drug, indication_icd10 })
  refresh(path, `${STAFF}/today`)
  back(path, 'ลงทะเบียนและสร้างตารางนัด 9 ครั้งแล้ว', 'ok')
}

export async function stopEnrollment(fd: FormData) {
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}`
  const me = await guard('doctor.decide', path)
  const id = uuid(fd, 'enrollment_id')
  const phase = str(fd, 'phase', 30)
  if (!id || !['stopped', 'maintenance', 'maintenance_program'].includes(phase)) back(path, 'ข้อมูลไม่ถูกต้อง')
  const { error } = await supabaseAdmin
    .from('dmglp_enrollments')
    .update({ phase, stop_reason: phase === 'stopped' ? str(fd, 'stop_reason', 500) || null : null, stopped_at: phase === 'stopped' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) back(path, error.message)
  if (phase === 'stopped') {
    await supabaseAdmin.from('dmglp_appointments').update({ status: 'cancelled' })
      .eq('enrollment_id', id).in('status', ['scheduled', 'rescheduled'])
  }
  if (phase === 'maintenance' && patient_id) {
    const from = todayBkk()
    const plan = generateMaintenanceSchedule(from, 12)
    await supabaseAdmin.from('dmglp_appointments').insert(plan.map(p => ({ enrollment_id: id, patient_id, ...p })))
  }
  dmglpAudit(me, 'update', 'dmglp_enrollments', id, { phase })
  refresh(path)
  back(path, 'อัปเดตสถานะโปรแกรมแล้ว', 'ok')
}

// ── appointments ─────────────────────────────────────────────────────────
export async function createAppointment(fd: FormData) {
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}`
  const me = await guard('appointments.write', path)
  const type = str(fd, 'type', 20)
  const scheduled_date = str(fd, 'scheduled_date', 10)
  if (!patient_id || !['specialist_visit', 'followup_visit', 'line_followup', 'lab_only'].includes(type) || !isIsoDate(scheduled_date)) back(path, 'ข้อมูลนัดไม่ถูกต้อง')
  const { data: enr } = await supabaseAdmin.from('dmglp_enrollments').select('id').eq('patient_id', patient_id)
    .in('phase', ['initiation', 'maintenance', 'maintenance_program']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await supabaseAdmin
    .from('dmglp_appointments')
    .insert({ patient_id, enrollment_id: enr?.id ?? null, type, scheduled_date, template_code: str(fd, 'template_code', 10) || null, drug_linked: false, note: str(fd, 'note', 500) || null })
    .select('id').single()
  if (error) back(path, error.message)
  await recordConversion(await attributionForPatient(patient_id), 'booked')
  dmglpAudit(me, 'create', 'dmglp_appointments', data.id)
  refresh(path, `${STAFF}/today`)
  back(path, 'เพิ่มนัดแล้ว', 'ok')
}

export async function rescheduleAppointment(fd: FormData) {
  const id = uuid(fd, 'id')
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}`
  const me = await guard('appointments.write', path)
  const newDate = str(fd, 'scheduled_date', 10)
  if (!id || !isIsoDate(newDate)) back(path, 'วันที่ไม่ถูกต้อง')
  // Shifting later drug-linked visits is the doctor's call (§4.3).
  const shiftLater = bool(fd, 'shift_later') && me.role === 'doctor'

  const { data: appt } = await supabaseAdmin.from('dmglp_appointments').select('id, enrollment_id, scheduled_date, drug_linked, status').eq('id', id).maybeSingle()
  if (!appt) back(path, 'ไม่พบนัด')
  let siblings: Array<{ id: string; scheduled_date: string; drug_linked: boolean; status: string }> = [appt]
  if (appt.enrollment_id) {
    const { data } = await supabaseAdmin.from('dmglp_appointments').select('id, scheduled_date, drug_linked, status').eq('enrollment_id', appt.enrollment_id)
    siblings = data ?? [appt]
  }
  const changes = reschedule({ appointments: siblings, movedId: id, newDate, shiftLater })
  for (const c of changes) {
    await supabaseAdmin.from('dmglp_appointments')
      .update({ scheduled_date: c.scheduled_date, status: 'rescheduled', reminder_sent_at: null, survey_sent_at: null, missed_at: null })
      .eq('id', c.id)
  }
  dmglpAudit(me, 'update', 'dmglp_appointments', id, { newDate, shifted: changes.length - 1 })
  refresh(path, `${STAFF}/today`)
  back(path, `เลื่อนนัดแล้ว${changes.length > 1 ? ` (ขยับนัดถัดไปอีก ${changes.length - 1} ครั้ง)` : ''}`, 'ok')
}

export async function cancelAppointment(fd: FormData) {
  const id = uuid(fd, 'id')
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}`
  const me = await guard('appointments.write', path)
  if (!id) back(path, 'ไม่พบนัด')
  await supabaseAdmin.from('dmglp_appointments').update({ status: 'cancelled' }).eq('id', id).in('status', ['scheduled', 'rescheduled', 'missed'])
  dmglpAudit(me, 'update', 'dmglp_appointments', id, { status: 'cancelled' })
  refresh(path, `${STAFF}/today`)
}

// Check-in creates the visit record and opens it.
export async function checkInAppointment(fd: FormData) {
  const id = uuid(fd, 'id')
  const path = `${STAFF}/today`
  const me = await guard('appointments.write', path)
  if (!id) back(path, 'ไม่พบนัด')
  const { data: appt } = await supabaseAdmin.from('dmglp_appointments').select('id, patient_id, enrollment_id, status').eq('id', id).maybeSingle()
  if (!appt) back(path, 'ไม่พบนัด')
  const { data: existing } = await supabaseAdmin.from('dmglp_visits').select('id').eq('appointment_id', id).maybeSingle()
  if (existing) redirect(`${STAFF}/visits/${existing.id}`)
  const { data: visit, error } = await supabaseAdmin
    .from('dmglp_visits')
    .insert({ appointment_id: id, patient_id: appt.patient_id, enrollment_id: appt.enrollment_id, visit_date: todayBkk(), created_by: me.id })
    .select('id').single()
  if (error) back(path, error.message)
  await supabaseAdmin.from('dmglp_appointments').update({ status: 'checked_in' }).eq('id', id)
  dmglpAudit(me, 'visit', 'dmglp_visits', visit.id, { checked_in: true })
  refresh(path)
  redirect(`${STAFF}/visits/${visit.id}`)
}

// D3/D7 LINE follow-up done by the pharmacist: push the neutral message and
// mark the appointment completed.
export async function sendLineFollowup(fd: FormData) {
  const id = uuid(fd, 'id')
  const path = `${STAFF}/today`
  const me = await guard('appointments.write', path)
  if (!id) back(path, 'ไม่พบนัด')
  const { data: appt } = await supabaseAdmin
    .from('dmglp_appointments').select('id, patient_id, patient:dmglp_patients(line_user_id)').eq('id', id).maybeSingle()
  if (!appt) back(path, 'ไม่พบนัด')
  const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient
  const sent = await pushToPatient(patient?.line_user_id, lineFollowupText(liffUrl('survey', id)))
  await supabaseAdmin.from('dmglp_appointments').update({ status: 'completed', note: sent ? 'ส่ง LINE แล้ว' : 'ไม่มี LINE — ติดตามทางโทรศัพท์' }).eq('id', id)
  if (!sent) {
    await supabaseAdmin.from('dmglp_tasks').insert({ patient_id: appt.patient_id, appointment_id: id, assignee_role: 'pharmacist', kind: 'line_followup', due_date: todayBkk(), note: 'ผู้ป่วยไม่มี LINE — โทรติดตามอาการ' })
  }
  dmglpAudit(me, 'update', 'dmglp_appointments', id, { line_followup: sent })
  refresh(path)
  back(path, sent ? 'ส่งข้อความติดตามทาง LINE แล้ว' : 'ผู้ป่วยไม่มี LINE — สร้างงานโทรติดตามให้แล้ว', sent ? 'ok' : 'err')
}

// ── visits ───────────────────────────────────────────────────────────────
export async function saveVisitVitals(fd: FormData) {
  const id = uuid(fd, 'visit_id')
  const path = `${STAFF}/visits/${id}`
  const me = await guard('clinical.write', path)
  if (!id) back(`${STAFF}/today`, 'ไม่พบการตรวจ')
  const gi = Object.fromEntries(['nausea', 'vomiting', 'constipation', 'diarrhea', 'reflux', 'appetite_loss'].map(k => [k, bool(fd, `gi_${k}`)]))
  const checklist = Object.fromEntries(['injection_technique', 'missed_dose_rule', 'hydration_diet', 'hypo_symptoms', 'side_effect_review'].map(k => [k, bool(fd, `chk_${k}`)]))
  const adherence = str(fd, 'injection_adherence', 20)
  const { error } = await supabaseAdmin
    .from('dmglp_visits')
    .update({
      weight_kg: num(fd, 'weight_kg'), bp_sys: num(fd, 'bp_sys'), bp_dia: num(fd, 'bp_dia'), pulse: num(fd, 'pulse'),
      gi_side_effects: gi, hypoglycemia_events: num(fd, 'hypoglycemia_events'),
      injection_adherence: ['all', 'missed_1', 'missed_2plus'].includes(adherence) ? adherence : null,
      checklist, note: str(fd, 'note', 2000) || null,
    })
    .eq('id', id)
  if (error) back(path, error.message)
  dmglpAudit(me, 'visit', 'dmglp_visits', id, { vitals: true })
  refresh(path)
  back(path, 'บันทึกสัญญาณชีพ/อาการแล้ว', 'ok')
}

export async function saveLabs(fd: FormData) {
  const visit_id = uuid(fd, 'visit_id')
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/visits/${visit_id}`
  const me = await guard('clinical.write', path)
  if (!visit_id || !patient_id) back(`${STAFF}/today`, 'ไม่พบการตรวจ')
  const collected_at = str(fd, 'collected_at', 10)
  if (!isIsoDate(collected_at)) back(path, 'วันที่เก็บตัวอย่างไม่ถูกต้อง')
  const rows: Array<{ patient_id: string; visit_id: string; test_code: string; value: number; unit: string | null; collected_at: string; entered_by: string | null }> = []
  for (const code of list(fd, 'lab_code')) {
    const v = num(fd, `lab_${code}`)
    if (v == null) continue
    rows.push({ patient_id, visit_id, test_code: code, value: v, unit: str(fd, `unit_${code}`, 20) || null, collected_at, entered_by: me.id })
  }
  if (!rows.length) back(path, 'ยังไม่ได้กรอกผลแล็บ')
  const { error } = await supabaseAdmin.from('dmglp_labs').insert(rows)
  if (error) back(path, error.message)
  dmglpAudit(me, 'lab', 'dmglp_labs', visit_id, { codes: rows.map(r => r.test_code) })
  refresh(path)
  back(path, `บันทึกผลแล็บ ${rows.length} รายการแล้ว`, 'ok')
}

// The doctor's dose decision: flags are computed here and stored; the
// decision is the doctor's. start/keep/increase/decrease also write a
// prescription (qty 1) — blocked unless eligibility + indication are on file.
export async function saveDoseDecision(fd: FormData) {
  const id = uuid(fd, 'visit_id')
  const path = `${STAFF}/visits/${id}`
  const me = await guard('doctor.decide', path)
  if (!id) back(`${STAFF}/today`, 'ไม่พบการตรวจ')
  const decision = str(fd, 'dose_decision', 10)
  if (!['start', 'keep', 'increase', 'decrease', 'hold', 'stop'].includes(decision)) back(path, 'เลือกการตัดสินใจ')
  const dose = num(fd, 'dose_mg')
  const prescribes = ['start', 'keep', 'increase', 'decrease'].includes(decision)

  const { data: visit } = await supabaseAdmin.from('dmglp_visits').select('id, patient_id, enrollment_id, appointment_id').eq('id', id).maybeSingle()
  if (!visit) back(path, 'ไม่พบการตรวจ')

  const { data: enr } = visit.enrollment_id
    ? await supabaseAdmin.from('dmglp_enrollments').select('id, drug, indication_icd10, confirmed_by, phase').eq('id', visit.enrollment_id).maybeSingle()
    : { data: null }
  const { data: screening } = await supabaseAdmin.from('dmglp_screenings').select('eligibility_status').eq('patient_id', visit.patient_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  let flags: string[] = []
  if (prescribes) {
    if (!enr || !enr.indication_icd10 || !enr.confirmed_by) back(path, 'สั่งยาไม่ได้: ยังไม่มีการลงทะเบียนพร้อมข้อบ่งใช้ (ICD-10) ที่แพทย์ยืนยัน')
    if (!screening || screening.eligibility_status === 'ineligible') back(path, 'สั่งยาไม่ได้: ผลคัดกรองล่าสุดไม่เข้าเกณฑ์')
    if (enr.phase === 'stopped') back(path, 'สั่งยาไม่ได้: โปรแกรมถูกหยุดแล้ว')
    if (dose == null || dose <= 0) back(path, 'ระบุขนาดยา (mg)')

    // Titration context from the dispense history.
    const { data: dispenses } = await supabaseAdmin
      .from('dmglp_dispenses')
      .select('dispensed_at, prescription:dmglp_prescriptions(sku)')
      .eq('patient_id', visit.patient_id)
      .order('dispensed_at', { ascending: false })
      .limit(20)
    const drug = enr.drug as DrugKey
    const hist = (dispenses ?? []).map(d => {
      const rx = Array.isArray(d.prescription) ? d.prescription[0] : d.prescription
      return { at: toBkkDate(d.dispensed_at), sku: (rx as { sku?: string } | null)?.sku ?? '' }
    })
    const today = todayBkk()
    const last = hist[0]
    const currentDoseMg = last ? Number(last.sku.split('-')[1]) : null
    let firstOfCurrent = last
    for (const h of hist) { if (h.sku === last?.sku) firstOfCurrent = h; else break }
    const rules = await getRules()
    flags = titrationFlags({
      drug,
      currentDoseMg: Number.isFinite(currentDoseMg) ? currentDoseMg : null,
      daysOnCurrentDose: firstOfCurrent ? daysBetween(firstOfCurrent.at, today) : null,
      newDoseMg: dose,
      daysSinceLastDispense: last ? daysBetween(last.at, today) : null,
      minDaysPerStep: rules.min_days_per_step,
      longGapDays: rules.long_gap_days,
    })
    if (flags.includes('UNKNOWN_STEP') || flags.includes('DECREASE_BELOW_MIN')) back(path, `ขนาดยา ${dose} mg ไม่อยู่ในขั้นมาตรฐานของ ${DRUGS[drug].label}`)
    if (flags.length && !bool(fd, 'acknowledge_flags')) {
      back(path, `มีคำเตือน (${flags.join(', ')}) — ติ๊ก "แพทย์รับทราบคำเตือน" ก่อนบันทึก`)
    }

    const sku = skuFor(drug, dose)
    const { data: price } = await supabaseAdmin.from('dmglp_price_items').select('code').eq('code', sku).maybeSingle()
    if (!price) back(path, `ไม่มีรายการยา ${sku} ในตารางราคา`)

    const { data: existingRx } = await supabaseAdmin.from('dmglp_prescriptions').select('id').eq('visit_id', id).maybeSingle()
    if (existingRx) back(path, 'การตรวจนี้มีใบสั่งยาแล้ว')
    const { error: rxErr } = await supabaseAdmin.from('dmglp_prescriptions').insert({
      visit_id: id, patient_id: visit.patient_id, sku, qty: 1,
      directions: str(fd, 'directions', 500) || 'ฉีดใต้ผิวหนังสัปดาห์ละ 1 ครั้ง ตามที่แพทย์แนะนำ',
      doctor_id: me.id,
    })
    if (rxErr) back(path, rxErr.message)
    if (flags.length) {
      await createAlert({ patient_id: visit.patient_id, source: 'titration', severity: 'normal', message: `แพทย์รับทราบคำเตือนการปรับยา: ${flags.join(', ')} (${dose} mg)` })
    }
  }

  const { error } = await supabaseAdmin
    .from('dmglp_visits')
    .update({ dose_decision: decision, dose_mg: prescribes ? dose : null, decided_by: me.id, flags })
    .eq('id', id)
  if (error) back(path, error.message)
  if (decision === 'stop' && enr) {
    await supabaseAdmin.from('dmglp_enrollments').update({ phase: 'stopped', stop_reason: str(fd, 'stop_reason', 500) || 'แพทย์สั่งหยุดยา', stopped_at: new Date().toISOString() }).eq('id', enr.id)
  }
  dmglpAudit(me, 'prescribe', 'dmglp_visits', id, { decision, dose, flags })
  refresh(path)
  back(path, prescribes ? 'บันทึกการตัดสินใจและออกใบสั่งยาแล้ว — เภสัชกรจ่ายยาที่หน้า Dispense' : 'บันทึกการตัดสินใจแล้ว', 'ok')
}

// Completing the visit consumes program entitlements (§4.7) instead of
// charging service lines; anything beyond entitlement is noted for finance.
export async function completeVisit(fd: FormData) {
  const id = uuid(fd, 'visit_id')
  const path = `${STAFF}/visits/${id}`
  const me = await guard('clinical.write', path)
  if (!id) back(`${STAFF}/today`, 'ไม่พบการตรวจ')
  const { data: visit } = await supabaseAdmin
    .from('dmglp_visits').select('id, patient_id, appointment_id, appointment:dmglp_appointments(type, lab_panel, status)').eq('id', id).maybeSingle()
  if (!visit) back(path, 'ไม่พบการตรวจ')
  const appt = Array.isArray(visit.appointment) ? visit.appointment[0] : visit.appointment

  const items: string[] = ['SVC-OPD']
  if (appt?.type === 'specialist_visit') items.push('SVC-SPEC')
  if (appt?.type === 'followup_visit') items.push('SVC-FU')
  if (appt?.lab_panel === 'baseline') items.push('LAB-BASE')
  if (appt?.lab_panel === 'q3m') items.push('LAB-Q3M')
  if (appt?.lab_panel === 'q6m') items.push('LAB-Q6M')
  for (const extra of list(fd, 'extra_item')) items.push(extra)

  const { data: program } = await supabaseAdmin
    .from('dmglp_programs').select('id').eq('patient_id', visit.patient_id).eq('status', 'active').gte('expires_at', todayBkk())
    .order('purchased_at', { ascending: false }).limit(1).maybeSingle()
  const uncovered: string[] = []
  if (program) {
    const { data: ent } = await supabaseAdmin.from('dmglp_program_entitlements').select('item_code, qty').eq('program_id', program.id)
    const { data: used } = await supabaseAdmin.from('dmglp_program_usage').select('item_code, qty').eq('program_id', program.id)
    const entitled: Record<string, number> = Object.fromEntries((ent ?? []).map(e => [e.item_code, e.qty]))
    const consumed: Record<string, number> = {}
    for (const u of used ?? []) consumed[u.item_code] = (consumed[u.item_code] || 0) + u.qty
    for (const code of items) {
      if (code === 'SVC-OPD') continue // hospital fee is charged per visit, never an entitlement
      if ((entitled[code] || 0) - (consumed[code] || 0) > 0) {
        await supabaseAdmin.from('dmglp_program_usage').insert({ program_id: program.id, item_code: code, qty: 1, visit_id: id, recorded_by: me.id })
        consumed[code] = (consumed[code] || 0) + 1
      } else {
        uncovered.push(code)
      }
    }
  } else {
    uncovered.push(...items.filter(c => c !== 'SVC-OPD'))
  }

  if (visit.appointment_id) {
    await supabaseAdmin.from('dmglp_appointments').update({ status: 'completed' }).eq('id', visit.appointment_id)
  }
  await supabaseAdmin.from('dmglp_visits').update({ note: appendNote(str(fd, 'note', 2000), uncovered) }).eq('id', id).is('note', null)
  dmglpAudit(me, 'visit', 'dmglp_visits', id, { completed: true, items, uncovered })
  refresh(path, `${STAFF}/today`, `${STAFF}/patients/${visit.patient_id}`)
  back(path, uncovered.length ? `ปิดการตรวจแล้ว — รายการที่ต้องคิดเงินตามราคาปกติ: ${uncovered.join(', ')}` : 'ปิดการตรวจแล้ว (หักจากสิทธิ์โปรแกรม)', 'ok')
}

function appendNote(note: string, uncovered: string[]): string | null {
  const parts = [note, uncovered.length ? `คิดเงินเพิ่ม: ${uncovered.join(', ')}` : ''].filter(Boolean)
  return parts.length ? parts.join(' | ') : null
}

// ── pharmacy ─────────────────────────────────────────────────────────────
export async function addPens(fd: FormData) {
  const path = `${STAFF}/pharmacy/inventory`
  const me = await guard('pharmacy.write', path)
  const sku = str(fd, 'sku', 20)
  const lot = str(fd, 'lot', 60)
  const expiry = str(fd, 'expiry', 10)
  const received_at = str(fd, 'received_at', 10) || todayBkk()
  const qty = Math.floor(num(fd, 'qty') ?? 0)
  if (!sku || !lot || !isIsoDate(expiry) || !isIsoDate(received_at)) back(path, 'กรอก SKU, lot, วันหมดอายุ, วันรับเข้า')
  if (qty < 1 || qty > 500) back(path, 'จำนวน 1-500')
  const { data: price } = await supabaseAdmin.from('dmglp_price_items').select('code').eq('code', sku).eq('category', 'drug').maybeSingle()
  if (!price) back(path, 'SKU ไม่ถูกต้อง')
  const rows = Array.from({ length: qty }, () => ({ sku, lot, expiry, received_at, supplier_doc: str(fd, 'supplier_doc', 100) || null, fridge: str(fd, 'fridge', 30) || 'main', received_by: me.id }))
  const { error } = await supabaseAdmin.from('dmglp_pens').insert(rows)
  if (error) back(path, error.message)
  dmglpAudit(me, 'stock', 'dmglp_pens', null, { sku, lot, qty })
  refresh(path)
  back(path, `รับเข้า ${qty} ปากกา (${sku} lot ${lot})`, 'ok')
}

export async function setPenStatus(fd: FormData) {
  const path = `${STAFF}/pharmacy/inventory`
  const me = await guard('pharmacy.write', path)
  const id = uuid(fd, 'id')
  const status = str(fd, 'status', 20)
  if (!id || !['in_stock', 'quarantine', 'expired', 'damaged', 'returned'].includes(status)) back(path, 'ข้อมูลไม่ถูกต้อง')
  const { error } = await supabaseAdmin.from('dmglp_pens').update({ status, status_note: str(fd, 'note', 300) || null }).eq('id', id).neq('status', 'dispensed')
  if (error) back(path, error.message)
  dmglpAudit(me, 'stock', 'dmglp_pens', id, { status })
  refresh(path)
}

export async function dispensePen(fd: FormData) {
  const path = `${STAFF}/pharmacy/dispense`
  const me = await guard('pharmacy.write', path)
  const prescription_id = uuid(fd, 'prescription_id')
  const pen_id = uuid(fd, 'pen_id')
  if (!prescription_id || !pen_id) back(path, 'เลือกใบสั่งยาและปากกา')

  const { data: rx } = await supabaseAdmin
    .from('dmglp_prescriptions')
    .select('id, patient_id, sku, doctor:admin_users!dmglp_prescriptions_doctor_id_fkey(name, email, license_no), visit:dmglp_visits(enrollment_id)')
    .eq('id', prescription_id).maybeSingle()
  if (!rx) back(path, 'ไม่พบใบสั่งยา')
  const { data: already } = await supabaseAdmin.from('dmglp_dispenses').select('id').eq('prescription_id', prescription_id).maybeSingle()
  if (already) back(path, 'ใบสั่งยานี้จ่ายไปแล้ว')

  const doctor = Array.isArray(rx.doctor) ? rx.doctor[0] : rx.doctor
  const doctorName = (doctor as { name?: string | null; email?: string } | null)?.name || (doctor as { email?: string } | null)?.email || ''
  const doctorLicense = (doctor as { license_no?: string | null } | null)?.license_no || ''
  if (!doctorLicense) back(path, 'จ่ายยาไม่ได้: แพทย์ผู้สั่งยังไม่มีเลขใบประกอบวิชาชีพในระบบ (ตั้งค่าที่ Settings → Staff)')
  if (!me.licenseNo) back(path, 'จ่ายยาไม่ได้: บัญชีเภสัชกรยังไม่มีเลขใบประกอบวิชาชีพ')

  const { data: patient } = await supabaseAdmin.from('dmglp_patients').select('hn').eq('id', rx.patient_id).maybeSingle()
  if (!patient?.hn) back(path, 'จ่ายยาไม่ได้: ผู้ป่วยยังไม่มี HN')
  const visit = Array.isArray(rx.visit) ? rx.visit[0] : rx.visit
  const enrollmentId = (visit as { enrollment_id?: string | null } | null)?.enrollment_id
  const { data: enr } = enrollmentId
    ? await supabaseAdmin.from('dmglp_enrollments').select('indication_icd10, confirmed_by, phase').eq('id', enrollmentId).maybeSingle()
    : { data: null }
  if (!enr?.indication_icd10 || !enr.confirmed_by) back(path, 'จ่ายยาไม่ได้: ไม่มีข้อบ่งใช้ที่แพทย์ยืนยัน')
  const { data: screening } = await supabaseAdmin.from('dmglp_screenings').select('eligibility_status').eq('patient_id', rx.patient_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!screening || screening.eligibility_status === 'ineligible') back(path, 'จ่ายยาไม่ได้: ผลคัดกรองไม่เข้าเกณฑ์')

  const { data: pen } = await supabaseAdmin.from('dmglp_pens').select('id, sku, status, expiry').eq('id', pen_id).maybeSingle()
  if (!pen || pen.status !== 'in_stock') back(path, 'ปากกานี้ไม่อยู่ในสต็อกที่จ่ายได้')
  if (pen.sku !== rx.sku) back(path, `SKU ไม่ตรงใบสั่งยา (สั่ง ${rx.sku} เลือก ${pen.sku})`)
  if (pen.expiry < todayBkk()) back(path, 'ปากกานี้หมดอายุแล้ว')

  const counseling = { teach_back: bool(fd, 'teach_back'), hypo_education: bool(fd, 'hypo_education'), missed_dose_rule: bool(fd, 'missed_dose_rule') }
  if (!counseling.teach_back) back(path, 'ต้องยืนยันว่าสอนวิธีฉีดและให้ผู้ป่วยทวนกลับ (teach-back) แล้ว')

  // Claim the pen first — the unique dispense/pen constraints make a double
  // dispense impossible even if two pharmacists click at once.
  const { data: claimed } = await supabaseAdmin.from('dmglp_pens').update({ status: 'dispensed' }).eq('id', pen_id).eq('status', 'in_stock').select('id')
  if (!claimed || !claimed.length) back(path, 'ปากกานี้ถูกจ่ายไปแล้ว')
  const { data: disp, error } = await supabaseAdmin
    .from('dmglp_dispenses')
    .insert({ prescription_id, pen_id, patient_id: rx.patient_id, pharmacist_id: me.id, doctor_name: doctorName, doctor_license: doctorLicense, counseling })
    .select('id').single()
  if (error) {
    await supabaseAdmin.from('dmglp_pens').update({ status: 'in_stock' }).eq('id', pen_id)
    back(path, error.message)
  }
  await recordConversion(await attributionForPatient(rx.patient_id), 'treatment_started')
  dmglpAudit(me, 'dispense', 'dmglp_dispenses', disp.id, { sku: rx.sku, pen_id })
  refresh(path, `${STAFF}/pharmacy/inventory`, `${STAFF}/patients/${rx.patient_id}`)
  back(path, `จ่ายยา ${rx.sku} แล้ว (บันทึกลงทะเบียนยาควบคุมพิเศษ)`, 'ok')
}

export async function logFridge(fd: FormData) {
  const path = `${STAFF}/pharmacy/fridge`
  const me = await guard('pharmacy.write', path)
  const fridge = str(fd, 'fridge', 30) || 'main'
  const temp = num(fd, 'temp_c')
  if (temp == null || temp < -30 || temp > 60) back(path, 'อุณหภูมิไม่ถูกต้อง')
  const in_range = temp >= FRIDGE_MIN_C && temp <= FRIDGE_MAX_C
  const { error } = await supabaseAdmin.from('dmglp_fridge_logs').insert({ fridge, temp_c: temp, in_range, recorded_by: me.id })
  if (error) back(path, error.message)
  if (!in_range) {
    const { data: q } = await supabaseAdmin.from('dmglp_pens').update({ status: 'quarantine', status_note: `อุณหภูมิตู้ ${fridge} ${temp}°C` }).eq('fridge', fridge).eq('status', 'in_stock').select('id')
    await createAlert({ source: 'fridge', severity: 'high', message: `ตู้เย็น ${fridge} อุณหภูมิ ${temp}°C นอกช่วง 2-8°C — กักสต็อก ${q?.length ?? 0} ปากการอเภสัชกรตรวจสอบ` })
  }
  dmglpAudit(me, 'fridge', 'dmglp_fridge_logs', null, { fridge, temp, in_range })
  refresh(path, `${STAFF}/pharmacy/inventory`)
  back(path, in_range ? 'บันทึกอุณหภูมิแล้ว' : 'อุณหภูมินอกช่วง — กักสต็อกและแจ้งเตือนแล้ว', in_range ? 'ok' : 'err')
}

export async function saveStockCount(fd: FormData) {
  const path = `${STAFF}/pharmacy/reconcile`
  const me = await guard('pharmacy.write', path)
  const month = str(fd, 'count_month', 7)
  const sku = str(fd, 'sku', 20)
  const physical = num(fd, 'physical_count')
  if (!/^\d{4}-\d{2}$/.test(month) || !sku || physical == null || physical < 0) back(path, 'ข้อมูลไม่ถูกต้อง')
  const { count } = await supabaseAdmin.from('dmglp_pens').select('id', { count: 'exact', head: true }).eq('sku', sku).in('status', ['in_stock', 'quarantine'])
  const system_count = count ?? 0
  const { error } = await supabaseAdmin.from('dmglp_stock_counts').upsert(
    { count_month: `${month}-01`, sku, system_count, physical_count: Math.floor(physical), variance_note: str(fd, 'variance_note', 500) || null, counted_by: me.id, counted_at: new Date().toISOString() },
    { onConflict: 'count_month,sku' },
  )
  if (error) back(path, error.message)
  if (system_count !== Math.floor(physical)) {
    await createAlert({ source: 'stock', severity: 'normal', message: `นับสต็อก ${month} ${sku}: ระบบ ${system_count} จริง ${Math.floor(physical)}` })
  }
  dmglpAudit(me, 'stock', 'dmglp_stock_counts', null, { month, sku, system_count, physical })
  refresh(path)
  back(path, 'บันทึกผลนับสต็อกแล้ว', 'ok')
}

// ── finance ──────────────────────────────────────────────────────────────
export async function purchaseProgram(fd: FormData) {
  const path = `${STAFF}/finance/programs`
  const me = await guard('finance.write', path)
  const patient_id = uuid(fd, 'patient_id')
  const tier = str(fd, 'tier', 10)
  const payment_mode = str(fd, 'payment_mode', 12)
  const purchased_at = str(fd, 'purchased_at', 10) || todayBkk()
  if (!patient_id || !['BASIC', 'PLUS', 'PREMIUM'].includes(tier) || !['upfront', 'installment'].includes(payment_mode) || !isIsoDate(purchased_at)) back(path, 'ข้อมูลไม่ถูกต้อง')
  const { data: t } = await supabaseAdmin.from('dmglp_program_tiers').select('tier, price_code, installments, validity_months, renewal_discount, entitlements').eq('tier', tier).maybeSingle()
  if (!t) back(path, 'ไม่พบแพ็กเกจ')
  const prices = await getPriceMap()
  let price = prices[t.price_code]
  if (price == null) back(path, 'ไม่พบราคาแพ็กเกจ')
  if (bool(fd, 'renewal')) price = Math.round(price * (1 - Number(t.renewal_discount)) * 100) / 100
  const { data: enr } = await supabaseAdmin.from('dmglp_enrollments').select('id').eq('patient_id', patient_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const { data: program, error } = await supabaseAdmin
    .from('dmglp_programs')
    .insert({
      patient_id, enrollment_id: enr?.id ?? null, tier, price, payment_mode, purchased_at,
      expires_at: addMonths(purchased_at, t.validity_months ?? PROGRAM_VALIDITY_MONTHS),
      amount_paid: payment_mode === 'upfront' ? price : 0, created_by: me.id,
    })
    .select('id').single()
  if (error) back(path, error.message)
  const ent = t.entitlements as Record<string, number>
  await supabaseAdmin.from('dmglp_program_entitlements').insert(Object.entries(ent).map(([item_code, qty]) => ({ program_id: program.id, item_code, qty })))
  if (payment_mode === 'installment') {
    const plan = installmentPlan(price, t.installments ?? PROGRAM_INSTALLMENTS, purchased_at)
    await supabaseAdmin.from('dmglp_installments').insert(plan.map(p => ({ program_id: program.id, ...p })))
  }
  dmglpAudit(me, 'program', 'dmglp_programs', program.id, { tier, payment_mode, price })
  refresh(path, `${STAFF}/finance/installments`, `${STAFF}/patients/${patient_id}`)
  back(path, `ซื้อโปรแกรม ${tier} แล้ว (${price.toLocaleString('th-TH')} บาท)`, 'ok')
}

export async function payInstallment(fd: FormData) {
  const path = `${STAFF}/finance/installments`
  const me = await guard('finance.write', path)
  const id = uuid(fd, 'id')
  if (!id) back(path, 'ไม่พบงวด')
  const { data: inst } = await supabaseAdmin.from('dmglp_installments').select('id, program_id, amount, status').eq('id', id).maybeSingle()
  if (!inst || inst.status === 'paid' || inst.status === 'cancelled') back(path, 'งวดนี้ชำระหรือยกเลิกแล้ว')
  await supabaseAdmin.from('dmglp_installments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
  const { data: prog } = await supabaseAdmin.from('dmglp_programs').select('amount_paid').eq('id', inst.program_id).maybeSingle()
  await supabaseAdmin.from('dmglp_programs').update({ amount_paid: Number(prog?.amount_paid ?? 0) + Number(inst.amount) }).eq('id', inst.program_id)
  dmglpAudit(me, 'payment', 'dmglp_installments', id, { amount: inst.amount })
  refresh(path, `${STAFF}/finance/programs`)
}

export async function cancelProgram(fd: FormData) {
  const path = `${STAFF}/finance/programs`
  const me = await guard('finance.write', path)
  const id = uuid(fd, 'id')
  if (!id) back(path, 'ไม่พบโปรแกรม')
  const { data: program } = await supabaseAdmin.from('dmglp_programs').select('id, patient_id, amount_paid, status, payment_mode').eq('id', id).maybeSingle()
  if (!program || program.status !== 'active') back(path, 'โปรแกรมนี้ไม่ได้อยู่ในสถานะ active')
  const { data: used } = await supabaseAdmin.from('dmglp_program_usage').select('item_code, qty').eq('program_id', id)
  const prices = await getPriceMap()
  const r = calculateRefund(Number(program.amount_paid), used ?? [], prices)
  if (r.missingPrices.length) back(path, `ไม่มีราคาสำหรับ ${r.missingPrices.join(', ')}`)
  if (program.payment_mode === 'installment') {
    const { data: inst } = await supabaseAdmin.from('dmglp_installments').select('id, seq, amount, status').eq('program_id', id)
    const recalculated = recalculateInstalments((inst ?? []).map(i => ({ seq: i.seq, amount: Number(i.amount), status: i.status })), r.usedValue)
    for (const row of recalculated) {
      const orig = (inst ?? []).find(i => i.seq === row.seq)
      if (orig && (Number(orig.amount) !== row.amount || orig.status !== row.status)) {
        await supabaseAdmin.from('dmglp_installments').update({ amount: row.amount, status: row.status }).eq('id', orig.id)
      }
    }
  }
  await supabaseAdmin.from('dmglp_programs').update({
    status: r.refund > 0 ? 'refunded' : 'cancelled', refund_amount: r.refund,
    refund_note: `${str(fd, 'reason', 300)} | ใช้ไป ${r.usedValue.toLocaleString('th-TH')} บาท จากที่ชำระ ${r.amountPaid.toLocaleString('th-TH')} บาท`.trim(),
  }).eq('id', id)
  dmglpAudit(me, 'refund', 'dmglp_programs', id, { refund: r.refund, used: r.usedValue })
  refresh(path, `${STAFF}/finance/installments`, `${STAFF}/patients/${program.patient_id}`)
  back(path, `ยกเลิกโปรแกรมแล้ว — คืนเงิน ${r.refund.toLocaleString('th-TH')} บาท`, 'ok')
}

export async function savePartner(fd: FormData) {
  const path = `${STAFF}/partners`
  const me = await guard('finance.write', path)
  const name = str(fd, 'name', 120)
  const type = str(fd, 'type', 10)
  const ref_code = str(fd, 'ref_code', 20).toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (!name || !['clinic', 'agent', 'factory'].includes(type) || !ref_code) back(path, 'กรอกชื่อ ประเภท และรหัสอ้างอิง')
  const { error } = await supabaseAdmin.from('dmglp_partners').insert({ name, type, ref_code, shared_care_fee: num(fd, 'shared_care_fee') })
  if (error) back(path, error.code === '23505' ? 'รหัสอ้างอิงซ้ำ' : error.message)
  dmglpAudit(me, 'create', 'dmglp_partners', null, { ref_code })
  refresh(path)
  back(path, 'เพิ่มพาร์ตเนอร์แล้ว', 'ok')
}

// Shared-care fee is paid only against a documented care service (§4.10).
export async function recordPartnerService(fd: FormData) {
  const path = `${STAFF}/partners`
  const me = await guard('finance.write', path)
  const partner_id = uuid(fd, 'partner_id')
  const patient_id = uuid(fd, 'patient_id')
  const performed_at = str(fd, 'performed_at', 10)
  const service_note = str(fd, 'service_note', 500)
  if (!partner_id || !patient_id || !isIsoDate(performed_at) || !service_note) back(path, 'กรอกพาร์ตเนอร์ ผู้ป่วย วันที่ และรายละเอียดบริการ')
  const { data: partner } = await supabaseAdmin.from('dmglp_partners').select('shared_care_fee').eq('id', partner_id).maybeSingle()
  const { error } = await supabaseAdmin.from('dmglp_partner_services').insert({
    partner_id, patient_id, performed_at, service_note, dispense_id: uuid(fd, 'dispense_id'),
    fee: num(fd, 'fee') ?? (partner?.shared_care_fee != null ? Number(partner.shared_care_fee) : null), recorded_by: me.id,
  })
  if (error) back(path, error.message)
  dmglpAudit(me, 'create', 'dmglp_partner_services', null, { partner_id })
  refresh(path)
  back(path, 'บันทึกบริการพาร์ตเนอร์แล้ว', 'ok')
}

// ── alerts & tasks ───────────────────────────────────────────────────────
export async function handleAlert(fd: FormData) {
  const path = `${STAFF}/alerts`
  const me = await guard('alerts.write', path)
  const id = uuid(fd, 'id')
  const status = str(fd, 'status', 20)
  if (!id || !['acknowledged', 'resolved'].includes(status)) back(path, 'ข้อมูลไม่ถูกต้อง')
  await supabaseAdmin.from('dmglp_alerts').update({ status, handled_by: me.id, handled_at: new Date().toISOString() }).eq('id', id)
  dmglpAudit(me, 'alert', 'dmglp_alerts', id, { status })
  refresh(path)
}

export async function completeTask(fd: FormData) {
  const path = `${STAFF}/tasks`
  const me = await guard('tasks.write', path)
  const id = uuid(fd, 'id')
  const status = str(fd, 'status', 12)
  if (!id || !['done', 'cancelled'].includes(status)) back(path, 'ข้อมูลไม่ถูกต้อง')
  await supabaseAdmin.from('dmglp_tasks').update({ status, done_by: me.id, done_at: new Date().toISOString(), note: str(fd, 'note', 500) || undefined }).eq('id', id)
  dmglpAudit(me, 'task', 'dmglp_tasks', id, { status })
  refresh(path)
}

// ── settings ─────────────────────────────────────────────────────────────
export async function updatePrice(fd: FormData) {
  const path = `${STAFF}/settings/prices`
  const me = await guard('settings.write', path)
  if (me.role !== 'finance') back(path, 'ราคาแก้ได้เฉพาะฝ่ายการเงิน')
  const code = str(fd, 'code', 20)
  const price = num(fd, 'price')
  if (!code || price == null || price < 0) back(path, 'ราคาไม่ถูกต้อง')
  const { error } = await supabaseAdmin.from('dmglp_price_items').update({ price, placeholder: false, active: bool(fd, 'active'), updated_by: me.id, updated_at: new Date().toISOString() }).eq('code', code)
  if (error) back(path, error.message)
  dmglpAudit(me, 'update', 'dmglp_price_items', code, { price })
  refresh(path)
}

export async function updateRule(fd: FormData) {
  const path = `${STAFF}/settings/rules`
  const me = await guard('settings.write', path)
  if (me.role === 'finance') back(path, 'เกณฑ์ทางคลินิกแก้ได้เฉพาะแพทย์/เภสัชกร')
  const key = str(fd, 'key', 40)
  const value = num(fd, 'value')
  if (!key || value == null || value < 0) back(path, 'ค่าไม่ถูกต้อง')
  const { error } = await supabaseAdmin.from('dmglp_eligibility_rules').update({ value, updated_by: me.id, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) back(path, error.message)
  dmglpAudit(me, 'update', 'dmglp_eligibility_rules', key, { value })
  refresh(path)
}

export async function assignStaffRole(fd: FormData) {
  const path = `${STAFF}/settings/staff`
  let me: DmglpUser
  try { me = await requireDmglpAction('dashboard.read') } catch (e) { back(path, (e as Error).message) }
  if (!me.canManageStaff) back(path, 'เฉพาะ manager ของระบบ admin เท่านั้น')
  const id = uuid(fd, 'id')
  const role = str(fd, 'dmglp_role', 20)
  if (!id || (role !== '' && !isDmglpRole(role))) back(path, 'ข้อมูลไม่ถูกต้อง')
  const { error } = await supabaseAdmin.from('admin_users').update({
    dmglp_role: (role || null) as DmglpRole | null, license_no: str(fd, 'license_no', 40) || null, is_specialist: bool(fd, 'is_specialist'),
  }).eq('id', id)
  if (error) back(path, error.message)
  dmglpAudit(me, 'update', 'admin_users', id, { dmglp_role: role || null })
  refresh(path)
}

// ── patient survey answered on paper / by phone (staff entry) ────────────
export async function recordSurveyByStaff(fd: FormData) {
  const patient_id = uuid(fd, 'patient_id')
  const path = `${STAFF}/patients/${patient_id}`
  const me = await guard('clinical.write', path)
  if (!patient_id) back(`${STAFF}/patients`, 'ไม่พบผู้ป่วย')
  const answers: Record<string, boolean> = {}
  let red = false
  for (const item of SURVEY_ITEMS) {
    answers[item.key] = bool(fd, `s_${item.key}`)
    if (answers[item.key] && item.redFlag) red = true
  }
  const { data, error } = await supabaseAdmin.from('dmglp_surveys').insert({ patient_id, appointment_id: uuid(fd, 'appointment_id'), answers: { ...answers, free_text: str(fd, 'free_text', 1000) }, red_flag: red }).select('id').single()
  if (error) back(path, error.message)
  if (red) {
    await createAlert({ patient_id, source: 'survey', severity: 'high', message: `แบบสอบถาม (บันทึกโดยเจ้าหน้าที่) พบอาการเตือน: ${SURVEY_ITEMS.filter(i => i.redFlag && answers[i.key]).map(i => i.labelTh).join('; ')}` })
  } else if (Object.values(answers).some(Boolean)) {
    await supabaseAdmin.from('dmglp_tasks').insert({ patient_id, assignee_role: 'pharmacist', kind: 'survey_followup', due_date: todayBkk(), note: 'อาการไม่รุนแรงจากแบบสอบถาม — ติดตาม' })
  }
  dmglpAudit(me, 'survey', 'dmglp_surveys', data.id, { red })
  refresh(path)
  back(path, red ? 'บันทึกแล้ว — พบอาการเตือน สร้าง alert ให้แล้ว' : 'บันทึกแบบสอบถามแล้ว', red ? 'err' : 'ok')
}
