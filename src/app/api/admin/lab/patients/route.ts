import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { encryptJson, hashNationalId } from '@/lib/encryption'

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
  const name = (body?.name ?? '').trim()
  const nationalId = (body?.national_id ?? '').replace(/\D/g, '')
  if (!name || nationalId.length !== 13) {
    return NextResponse.json({ error: 'ต้องระบุชื่อ และเลขบัตรประชาชน 13 หลัก' }, { status: 400 })
  }

  const hash = hashNationalId(nationalId)

  const { data: existing } = await supabaseAdmin
    .from('patients')
    .select(SELECT)
    .eq('national_id_hash', hash)
    .maybeSingle()
  if (existing) return NextResponse.json({ patient: existing, existed: true })

  const { data, error } = await supabaseAdmin
    .from('patients')
    .insert([{
      name,
      national_id_hash: hash,
      national_id_enc: encryptJson(nationalId),
      phone: body?.phone?.trim() || null,
      dob: body?.dob || null,
      gender: body?.gender || null,
      consent_pdpa: !!body?.consent_pdpa,
      consent_at: body?.consent_pdpa ? new Date().toISOString() : null,
      created_by: me.id,
    }])
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({ actor: me.email, action: 'lab_create', details: { patient_id: data.id }, ip: requestIp(req) })
  return NextResponse.json({ patient: data, existed: false })
}
