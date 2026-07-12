import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { upsertPatient, validatePatientInput, type IdType } from '@/lib/certs/patients'

export const runtime = 'nodejs'

const SELECT = 'id, name, phone, dob, gender, consent_pdpa, created_at'

// GET /api/admin/lab/patients?q=...  — search by name or phone
export async function GET(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  let query = supabaseAdmin.from('patients').select(SELECT).order('created_at', { ascending: false }).limit(50)
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ patients: data ?? [] })
}

// POST /api/admin/lab/patients  — create (dedup by national-id hash)
export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const input = {
    name: (body?.name ?? '').trim(),
    id_type: (body?.id_type ?? 'thai_id') as IdType,
    national_id: (body?.national_id ?? '').trim(),
    phone: body?.phone,
    dob: body?.dob,
    gender: body?.gender,
    nationality: body?.nationality,
    consent_pdpa: !!body?.consent_pdpa,
    created_by: me.id,
  }
  const invalid = validatePatientInput(input)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  try {
    const patient = await upsertPatient(input)
    if (!patient.existed) {
      logLeadAccess({ actor: me.email, action: 'lab_create', details: { patient_id: patient.id }, ip: requestIp(req) })
    }
    return NextResponse.json({ patient, existed: patient.existed })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
