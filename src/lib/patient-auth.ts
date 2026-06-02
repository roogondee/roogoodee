import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

// Patient portal sessions are deliberately separate from the admin/staff
// session (`admin_session`). A patient cookie only ever resolves to ONE
// patient row and can never reach admin tooling.

const COOKIE = 'patient_session'

export interface PatientSession {
  patientId: string
  lineUserId: string
}

function secret(): string {
  // Reuse the admin session secret; the cookie name + payload shape differ.
  return process.env.SESSION_SECRET || process.env.ADMIN_SECRET || ''
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url').slice(0, 32)
}

// Cookie payload: "<patientId>|<lineUserId>.<sig>"
export function makePatientSession(patientId: string, lineUserId: string): string {
  const body = `${patientId}|${lineUserId}`
  return `${body}.${sign(body)}`
}

function parse(raw: string | undefined): PatientSession | null {
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot < 0) return null
  const body = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = sign(body)
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  const [patientId, lineUserId] = body.split('|')
  if (!patientId || !lineUserId) return null
  return { patientId, lineUserId }
}

export function patientCookieName(): string {
  return COOKIE
}

// Read + verify the current patient session against the DB (ensures the LINE
// id still matches the patient row, so a revoked link logs them out).
export async function getPatientSession(): Promise<PatientSession | null> {
  const raw = cookies().get(COOKIE)?.value
  const parsed = parse(raw)
  if (!parsed) return null

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id, line_id')
    .eq('id', parsed.patientId)
    .maybeSingle()

  if (!patient || patient.line_id !== parsed.lineUserId) return null
  return parsed
}
