import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { toBuddhistYear, formatCertNo, WORK_PERMIT_VALID_DAYS, type PatientSnapshot } from '@/lib/certs/types'
import { decryptJson } from '@/lib/encryption'
import { idLast4 } from '@/lib/certs/patients'

// ~244-bit unguessable capability token for the public verify URL.
export function newCertToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, '')
}

export async function nextCertNo(visitDate: string): Promise<string> {
  const yearBE = toBuddhistYear(new Date(visitDate))
  const { data, error } = await supabaseAdmin.rpc('next_cert_no', { p_year: yearBE })
  if (error) throw new Error(error.message)
  return formatCertNo(yearBE, Number(data))
}

// Freeze the patient's identity into the certificate at issue time so later
// edits to the patients row never change what was certified.
export async function buildPatientSnapshot(
  patientId: string,
  extra: { employer_name?: string | null; work_permit_no?: string | null } = {}
): Promise<PatientSnapshot> {
  const { data: p } = await supabaseAdmin
    .from('patients')
    .select('name, dob, gender, nationality, id_type, national_id_enc')
    .eq('id', patientId)
    .maybeSingle()

  let idLast: string | null = null
  if (p?.national_id_enc) {
    const raw = decryptJson(p.national_id_enc)
    if (typeof raw === 'string') idLast = idLast4(raw)
  }

  return {
    name: p?.name ?? '-',
    dob: p?.dob ?? null,
    gender: p?.gender ?? null,
    nationality: p?.nationality ?? null,
    id_type: p?.id_type ?? null,
    id_last4: idLast,
    employer_name: extra.employer_name ?? null,
    work_permit_no: extra.work_permit_no ?? null,
  }
}

export function defaultValidUntil(certType: string, visitDate: string): string | null {
  if (certType !== 'work_permit') return null
  const d = new Date(visitDate)
  d.setDate(d.getDate() + WORK_PERMIT_VALID_DAYS)
  return d.toISOString().slice(0, 10)
}
