import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, canWrite } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'

export const runtime = 'nodejs'

// GET /api/admin/certs/[id] — full cert + patient.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: cert } = await supabaseAdmin
    .from('medical_certificates')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!cert) return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 })

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id, name, phone, dob, gender, id_type, nationality, consent_pdpa')
    .eq('id', cert.patient_id)
    .maybeSingle()

  return NextResponse.json({ cert, patient })
}

const EDITABLE_FIELDS = [
  'cert_type', 'visit_date', 'photo_path', 'exam', 'disease_items',
  'lab_analytes', 'lab_report_id', 'summary', 'fit_status', 'doctor_name', 'doctor_license',
]

// PATCH /api/admin/certs/[id] — update a DRAFT. Issued certs are frozen.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canWrite(me)) return NextResponse.json({ error: 'บัญชีนี้เป็นแบบดูอย่างเดียว' }, { status: 403 })

  const { data: current } = await supabaseAdmin
    .from('medical_certificates')
    .select('status')
    .eq('id', params.id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 })
  if (current.status !== 'draft') {
    return NextResponse.json(
      { error: 'ใบรับรองที่ออกแล้วแก้ไขไม่ได้ ต้องเพิกถอนแล้วออกใหม่' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('medical_certificates')
    .update(update)
    .eq('id', params.id)
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id })
}

// DELETE /api/admin/certs/[id] — only drafts can be deleted.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canWrite(me)) return NextResponse.json({ error: 'บัญชีนี้เป็นแบบดูอย่างเดียว' }, { status: 403 })

  const { data: current } = await supabaseAdmin
    .from('medical_certificates')
    .select('status, patient_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 })
  if (current.status !== 'draft') {
    return NextResponse.json({ error: 'ลบได้เฉพาะฉบับร่าง — ใบรับรองที่ออกแล้วให้ใช้การเพิกถอน' }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('medical_certificates').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({ actor: me.email, action: 'delete', details: { cert_id: params.id }, ip: requestIp(req) })
  return NextResponse.json({ ok: true })
}
