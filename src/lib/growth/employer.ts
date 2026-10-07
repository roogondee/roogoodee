// Employer (HR) portal helpers. An employer account is matched to issued
// certificates by the frozen patient_snapshot.employer_name — the same value
// staff type (or CSV-import) when issuing a group's certificates — so no
// change to the certificate issue flow is needed.
//
// Access is a secret link (/hr/<token>). Only sha256(token) is stored; staff
// see the raw token once, at creation or regeneration.

import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

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
  patient_snapshot: { name?: string; nationality?: string | null; employer_name?: string | null; work_permit_no?: string | null } | null
}

export async function fetchEmployerCertificates(matchNames: string[]): Promise<EmployerCert[]> {
  const names = (matchNames || []).map(n => n.trim()).filter(Boolean)
  if (names.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('medical_certificates')
    .select('id, cert_no, cert_type, patient_id, visit_date, fit_status, valid_until, public_token, patient_snapshot')
    .eq('status', 'issued')
    .in('patient_snapshot->>employer_name', names)
    .order('visit_date', { ascending: false })
    .limit(5000)
  if (error) throw new Error(`employer certs: ${error.message}`)
  return (data as EmployerCert[] | null) ?? []
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
}

export async function employerByToken(token: string): Promise<EmployerAccount | null> {
  // base64url of 24 bytes = 32 chars; reject anything else before hashing.
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null
  const { data } = await supabaseAdmin
    .from('employer_accounts')
    .select('id, name, match_names, contact_name, contact_phone, active, last_viewed_at, renewal_notified_at, created_at')
    .eq('token_hash', hashEmployerToken(token))
    .eq('active', true)
    .maybeSingle()
  return (data as EmployerAccount | null) ?? null
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
