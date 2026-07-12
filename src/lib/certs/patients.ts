import { supabaseAdmin } from '@/lib/supabase'
import { encryptJson, hashNationalId, hashIdentityDoc } from '@/lib/encryption'

export type IdType = 'thai_id' | 'passport' | 'other'

export interface PatientInput {
  name: string
  id_type?: IdType
  national_id: string          // Thai ID digits or passport number
  phone?: string | null
  dob?: string | null
  gender?: string | null
  nationality?: string | null
  consent_pdpa?: boolean
  created_by?: string | null
}

export interface UpsertedPatient {
  id: string
  name: string
  phone: string | null
  dob: string | null
  gender: string | null
  id_type: IdType
  nationality: string | null
  consent_pdpa: boolean
  existed: boolean
}

const SELECT = 'id, name, phone, dob, gender, id_type, nationality, consent_pdpa'

// Thai national ID mod-11 checksum (13 digits, last digit is check digit).
export function isValidThaiId(id: string): boolean {
  const digits = (id || '').replace(/\D/g, '')
  if (digits.length !== 13) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (13 - i)
  return (11 - (sum % 11)) % 10 === Number(digits[12])
}

export function identityHash(idType: IdType, doc: string): string {
  return idType === 'thai_id' ? hashNationalId(doc) : hashIdentityDoc(doc)
}

export function validatePatientInput(input: PatientInput): string | null {
  if (!input.name?.trim()) return 'ต้องระบุชื่อ-นามสกุล'
  const idType = input.id_type ?? 'thai_id'
  const doc = (input.national_id || '').trim()
  if (idType === 'thai_id') {
    const digits = doc.replace(/\D/g, '')
    if (digits.length !== 13) return 'เลขบัตรประชาชนต้องมี 13 หลัก'
    if (!isValidThaiId(digits)) return 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ผิด)'
  } else if (doc.replace(/[^0-9a-z]/gi, '').length < 5) {
    return 'เลขที่เอกสาร (passport) สั้นเกินไป'
  }
  return null
}

// Lookup-or-create by identity-document hash. Shared by the cert form,
// the CSV import, and the lab patients route.
export async function upsertPatient(input: PatientInput): Promise<UpsertedPatient> {
  const idType = input.id_type ?? 'thai_id'
  const doc = (input.national_id || '').trim()
  const hash = identityHash(idType, doc)

  const { data: existing } = await supabaseAdmin
    .from('patients')
    .select(SELECT)
    .eq('national_id_hash', hash)
    .maybeSingle()
  if (existing) return { ...(existing as Omit<UpsertedPatient, 'existed'>), existed: true }

  const { data, error } = await supabaseAdmin
    .from('patients')
    .insert([{
      name: input.name.trim(),
      national_id_hash: hash,
      national_id_enc: encryptJson(doc),
      id_type: idType,
      nationality: input.nationality?.trim() || null,
      phone: input.phone?.trim() || null,
      dob: input.dob || null,
      gender: input.gender || null,
      consent_pdpa: !!input.consent_pdpa,
      consent_at: input.consent_pdpa ? new Date().toISOString() : null,
      created_by: input.created_by ?? null,
    }])
    .select(SELECT)
    .single()

  if (error) throw new Error(error.message)
  return { ...(data as Omit<UpsertedPatient, 'existed'>), existed: false }
}

// Last 4 characters of the identity document for the frozen snapshot —
// enough for the verifier to cross-check against the physical card without
// exposing the full number on the public page.
export function idLast4(doc: string): string {
  const normalized = (doc || '').replace(/[^0-9a-z]/gi, '')
  return normalized.slice(-4).toUpperCase()
}
