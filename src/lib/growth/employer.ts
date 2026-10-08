// Employer (HR) portal helpers. An employer account is matched to issued
// certificates by the employer name staff type (or CSV-import) when issuing a
// group's certificates — so no change to the certificate issue flow is needed.
//
// Two sources, merged: the roogondee-side `medical_certificates` table and
// cert.roogondee.com (W Medical's real issuing system, read through the
// bridge in src/lib/certs/wmedical.ts). In production only the second has
// rows; the first is kept so the older /admin/certs flow still shows up.
//
// Access is a secret link (/hr/<token>). Only sha256(token) is stored; staff
// see the raw token once, at creation or regeneration.

import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { notifySaleGroupText } from '@/lib/line-notify'
import { addDaysIso, fetchWmedicalEmployerCerts, wmedicalVerifyUrl, type WmedicalCert } from '@/lib/certs/wmedical'
import { newHrLinkCode, parseHrLinkCode } from '@/lib/refcodes'
import { EMPLOYER_ALERT_AHEAD_DAYS } from './config'

const DAY = 24 * 60 * 60 * 1000

export function newEmployerToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url')
  return { token, hash: hashEmployerToken(token) }
}

export function hashEmployerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface EmployerCert {
  id: string
  cert_no: string | null
  cert_type: string
  patient_id: string
  visit_date: string
  fit_status: string | null
  valid_until: string | null
  public_token: string | null
  // Where "ดูใบรับรอง" opens — /verify/cert/<token> for roogondee-side
  // certificates, cert.roogondee.com/?id=<HN>&k=<token> for W Medical's.
  verify_url: string | null
  patient_snapshot: { name?: string; nationality?: string | null; employer_name?: string | null; work_permit_no?: string | null } | null
}

export async function fetchEmployerCertificates(matchNames: string[]): Promise<EmployerCert[]> {
  const names = (matchNames || []).map(n => n.trim()).filter(Boolean)
  if (names.length === 0) return []
  const [local, remote] = await Promise.all([
    fetchLocalCertificates(names),
    // A bridge outage must not take the portal or the daily cron down with
    // it — show what the local table has and say so in the logs.
    fetchWmedicalEmployerCerts(names).catch(err => {
      console.error('[employer] cert.roogondee.com bridge failed:', err instanceof Error ? err.message : err)
      return [] as WmedicalCert[]
    }),
  ])
  return [...local, ...remote.map(fromWmedical)].sort((a, b) => (a.visit_date < b.visit_date ? 1 : -1))
}

async function fetchLocalCertificates(names: string[]): Promise<EmployerCert[]> {
  const { data, error } = await supabaseAdmin
    .from('medical_certificates')
    .select('id, cert_no, cert_type, patient_id, visit_date, fit_status, valid_until, public_token, patient_snapshot')
    .eq('status', 'issued')
    .in('patient_snapshot->>employer_name', names)
    .order('visit_date', { ascending: false })
    .limit(5000)
  if (error) throw new Error(`employer certs: ${error.message}`)
  return ((data as Omit<EmployerCert, 'verify_url'>[] | null) ?? []).map(c => ({
    ...c,
    verify_url: c.public_token ? `/verify/cert/${c.public_token}` : null,
  }))
}

// cert.roogondee.com's 3-way verdict (alien-worker form, section 4) onto the
// fit labels the portal already renders.
const SUMMARY_TO_FIT: Record<string, string> = {
  healthy: 'normal',
  treat: 'fit_with_condition',
  fail: 'unfit',
}

// One worker across years = same passport/ID number; the name is only a
// fallback for rows typed without one.
function workerKey(c: WmedicalCert): string {
  const doc = (c.doc_no || '').replace(/\s+/g, '').toUpperCase()
  if (doc) return `wm:${doc}`
  return `wm:name:${(c.patient_name || '').trim().replace(/\s+/g, ' ').toLowerCase()}`
}

export function fromWmedical(c: WmedicalCert): EmployerCert {
  return {
    id: `wm-${c.id}`,
    cert_no: c.hn,
    cert_type: c.form_type === 'alien_worker' ? 'work_permit' : 'general',
    patient_id: workerKey(c),
    visit_date: c.exam_date,
    fit_status: (c.summary && SUMMARY_TO_FIT[c.summary]) || null,
    valid_until: addDaysIso(c.exam_date, c.valid_days ?? 90),
    public_token: null,
    verify_url: wmedicalVerifyUrl(c.hn, c.token),
    patient_snapshot: {
      name: c.patient_name || undefined,
      nationality: c.nationality,
      employer_name: c.employer_name,
      work_permit_no: null,
    },
  }
}

export interface WorkerRow {
  patientId: string
  latest: EmployerCert
  certCount: number
  nextDue: string          // yyyy-mm-dd
  daysUntilDue: number     // negative = overdue
}

// One row per worker (latest certificate), with the annual re-check date.
export function workersFromCerts(certs: EmployerCert[], now: number, recheckDays: number): WorkerRow[] {
  const byPatient = new Map<string, { latest: EmployerCert; count: number }>()
  for (const c of certs) {
    const cur = byPatient.get(c.patient_id)
    if (!cur) byPatient.set(c.patient_id, { latest: c, count: 1 })
    else {
      cur.count++
      if (c.visit_date > cur.latest.visit_date) cur.latest = c
    }
  }
  return Array.from(byPatient.entries()).map(([patientId, { latest, count }]) => {
    const due = new Date(new Date(latest.visit_date).getTime() + recheckDays * DAY)
    return {
      patientId,
      latest,
      certCount: count,
      nextDue: due.toISOString().slice(0, 10),
      daysUntilDue: Math.ceil((due.getTime() - now) / DAY),
    }
  }).sort((a, b) => a.daysUntilDue - b.daysUntilDue)
}

// Workers due within `aheadDays`, or overdue by up to 60 days (past that
// they have most likely left the employer or rechecked elsewhere).
export function dueWorkers(certs: EmployerCert[], now: number, recheckDays: number, aheadDays: number): WorkerRow[] {
  return workersFromCerts(certs, now, recheckDays).filter(w => w.daysUntilDue <= aheadDays && w.daysUntilDue >= -60)
}

export interface EmployerAccount {
  id: string
  name: string
  match_names: string[]
  contact_name: string | null
  contact_phone: string | null
  active: boolean
  last_viewed_at: string | null
  renewal_notified_at: string | null
  created_at: string
  line_link_code: string | null
  line_user_id: string | null
  line_linked_at: string | null
}

export const EMPLOYER_COLUMNS =
  'id, name, match_names, contact_name, contact_phone, active, last_viewed_at, renewal_notified_at, created_at, line_link_code, line_user_id, line_linked_at'

export async function employerByToken(token: string): Promise<EmployerAccount | null> {
  // base64url of 24 bytes = 32 chars; reject anything else before hashing.
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null
  const { data } = await supabaseAdmin
    .from('employer_accounts')
    .select(EMPLOYER_COLUMNS)
    .eq('token_hash', hashEmployerToken(token))
    .eq('active', true)
    .maybeSingle()
  return (data as EmployerAccount | null) ?? null
}

// ── HR alerts over LINE ────────────────────────────────────────────────────
// The portal shows an "รับแจ้งเตือนทาง LINE" button whose pre-filled message
// carries this account's HR- code; only someone holding the portal link can
// see it. The webhook stores the sender's LINE id, and the renewal cron then
// pushes a count-only reminder to them (sendEmployerRenewalAlerts).

export async function ensureEmployerLinkCode(employer: EmployerAccount): Promise<string | null> {
  if (employer.line_link_code) return employer.line_link_code
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newHrLinkCode()
    const { error } = await supabaseAdmin
      .from('employer_accounts')
      .update({ line_link_code: code })
      .eq('id', employer.id)
      .is('line_link_code', null)
    if (!error) {
      const { data } = await supabaseAdmin.from('employer_accounts').select('line_link_code').eq('id', employer.id).maybeSingle()
      return (data?.line_link_code as string | null) ?? null
    }
    if ((error as { code?: string }).code !== '23505') {
      console.error('[employer] link code failed:', error.message)
      return null
    }
  }
  return null
}

const HR_UNLINK_RE = /ยกเลิก\s*แจ้งเตือน\s*HR/i

export function isEmployerLineMessage(text: string): boolean {
  return !!parseHrLinkCode(text) || HR_UNLINK_RE.test(text || '')
}

export async function handleEmployerLineMessage(userId: string, text: string): Promise<string | null> {
  if (!userId) return null

  if (HR_UNLINK_RE.test(text || '')) {
    const { data } = await supabaseAdmin
      .from('employer_accounts')
      .update({ line_user_id: null, line_linked_at: null })
      .eq('line_user_id', userId)
      .select('name')
    const names = ((data as { name: string }[] | null) ?? []).map(r => r.name)
    return names.length
      ? `ยกเลิกการแจ้งเตือนของ ${names.join(', ')} แล้วค่ะ เปิดใหม่ได้จากปุ่มในพอร์ทัล HR`
      : 'LINE นี้ยังไม่ได้รับแจ้งเตือนของบริษัทใดค่ะ'
  }

  const code = parseHrLinkCode(text)
  if (!code) return null
  const { data } = await supabaseAdmin
    .from('employer_accounts')
    .update({ line_user_id: userId, line_linked_at: new Date().toISOString() })
    .eq('line_link_code', code)
    .eq('active', true)
    .select('id, name')
  const employer = (data as { id: string; name: string }[] | null)?.[0]
  if (!employer) {
    return 'ไม่พบรหัสนี้ค่ะ กรุณาเปิดพอร์ทัล HR แล้วกดปุ่ม "เปิดแจ้งเตือนทาง LINE" อีกครั้ง'
  }
  await notifySaleGroupText(`🏭 ${employer.name}: HR เชื่อม LINE รับแจ้งเตือนครบรอบตรวจสุขภาพแล้ว`).catch(() => undefined)
  return [
    `เชื่อมการแจ้งเตือนของ ${employer.name} กับ LINE นี้แล้วค่ะ`,
    `เราจะแจ้งเมื่อมีพนักงานครบรอบตรวจสุขภาพประจำปีภายใน ${EMPLOYER_ALERT_AHEAD_DAYS} วัน (ไม่เกินสัปดาห์ละครั้ง) พร้อมช่วยนัดตรวจเป็นกลุ่ม`,
    'ไม่ต้องการแล้ว พิมพ์ "ยกเลิกแจ้งเตือน HR" ได้ทุกเมื่อ',
  ].join('\n')
}

export async function logEmployerAccess(employerId: string, action: 'view' | 'export', ip?: string | null, userAgent?: string | null) {
  await Promise.all([
    supabaseAdmin.from('employer_portal_access_log').insert({
      employer_id: employerId, action, ip: ip || null, user_agent: (userAgent || '').slice(0, 500) || null,
    }),
    supabaseAdmin.from('employer_accounts').update({ last_viewed_at: new Date().toISOString() }).eq('id', employerId),
  ])
}

// The token travels in the /hr/k/<token> link only once: that route moves it
// into this httpOnly cookie and redirects to plain /hr. The site-wide GA4 /
// pixel tags record page URLs, so a token left in the path would be copied
// into third-party analytics on every view.
export const EMPLOYER_COOKIE = 'hr_session'
