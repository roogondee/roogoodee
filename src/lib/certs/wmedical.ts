// Read-only bridge to cert.roogondee.com — the certificate system W Medical
// actually issues from (repo roogondee/medicalcertificate, Supabase project
// "wmedical"). The roogondee-side `medical_certificates` table is empty in
// production; every real certificate lives over there.
//
// Access is three SECURITY DEFINER functions (db/roogondee-bridge.sql in that
// repo), called with the public anon key plus WMEDICAL_BRIDGE_SECRET — the
// database stores only its sha256. They return fixed columns: no lab results,
// photos or addresses, and only the certificate forms an employer submits
// (work permit / 5-disease / bilingual — never sick leave, driving or สณ.11).
//
// Unset secret = every call returns [] so the HR portal, renewal alerts and
// visit sync degrade to "no certificates" instead of failing.

import { CERT_VERIFY_URL } from './verify-site'

const WMEDICAL_URL = process.env.WMEDICAL_SUPABASE_URL || 'https://sfymqfcnhatynhtfsfil.supabase.co'
// Public by design — the same anon key ships in cert.roogondee.com/config.js.
const WMEDICAL_ANON_KEY = process.env.WMEDICAL_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeW1xZmNuaGF0eW5odGZzZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjczNzgsImV4cCI6MjA5MjIwMzM3OH0.Cyw-7L1tRSni-UtROwflPBfhJXrnx-2vTXDOKm0unko'

export function wmedicalBridgeConfigured(): boolean {
  return !!process.env.WMEDICAL_BRIDGE_SECRET
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const secret = process.env.WMEDICAL_BRIDGE_SECRET
  if (!secret) return []
  const res = await fetch(`${WMEDICAL_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: WMEDICAL_ANON_KEY,
      Authorization: `Bearer ${WMEDICAL_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_secret: secret, ...args }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200)
    throw new Error(`wmedical ${fn} ${res.status}: ${detail}`)
  }
  return ((await res.json()) as T[] | null) ?? []
}

export interface WmedicalCert {
  id: string
  hn: string
  token: string | null
  form_type: 'alien_worker' | 'five_disease' | 'bilingual' | string
  patient_name: string | null
  nationality: string | null
  doc_no: string | null
  employer_name: string | null
  exam_date: string
  valid_days: number | null
  summary: 'healthy' | 'treat' | 'fail' | string | null
  confirmed_at: string | null
  sealed_at: string | null
}

export function fetchWmedicalEmployerCerts(names: string[]): Promise<WmedicalCert[]> {
  const clean = (names || []).map(n => n.trim()).filter(Boolean)
  if (clean.length === 0) return Promise.resolve([])
  return rpc<WmedicalCert>('bridge_employer_certs', { p_names: clean })
}

export interface WmedicalEmployerName {
  employer_name: string
  certs: number
  last_exam: string | null
}

export function fetchWmedicalEmployerNames(): Promise<WmedicalEmployerName[]> {
  return rpc<WmedicalEmployerName>('bridge_employer_names', {})
}

export interface WmedicalRefVisit {
  ref_code: string
  cert_id: string
  form_type: string
  exam_date: string
  issued_at: string
}

// Certificates staff tagged with a website ref code (MC-xxxxx / CL-xxxxx)
// and touched since `since` — the visit-sync cron counts each as a patient
// who actually came.
export function fetchWmedicalRefVisits(since: Date): Promise<WmedicalRefVisit[]> {
  return rpc<WmedicalRefVisit>('bridge_ref_visits', { p_since: since.toISOString() })
}

// Full certificate when the token is known (what the QR opens), else the
// status-only preview for the number.
export function wmedicalVerifyUrl(hn: string, token: string | null): string {
  return `${CERT_VERIFY_URL}/?id=${encodeURIComponent(hn)}${token ? `&k=${encodeURIComponent(token)}` : ''}`
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
