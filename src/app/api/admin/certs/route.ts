import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, canWrite } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { seedDiseaseItems, type CertType } from '@/lib/certs/types'

export const runtime = 'nodejs'

const CERT_TYPES: CertType[] = ['general', 'annual_checkup', 'risk_based', 'work_permit']
const LIST_SELECT =
  'id, cert_no, cert_type, status, visit_date, valid_until, doctor_name, created_at, patients(name)'

// GET /api/admin/certs?status=&type=&q=&page=
export async function GET(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const type = sp.get('type')
  const q = sp.get('q')?.trim()
  const page = Math.max(0, Number(sp.get('page') ?? 0))
  const pageSize = 30

  let query = supabaseAdmin
    .from('medical_certificates')
    .select(LIST_SELECT)
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('cert_type', type)

  if (q) {
    // Match cert_no directly, or any patient whose name matches.
    const { data: pts } = await supabaseAdmin
      .from('patients').select('id').ilike('name', `%${q}%`).limit(200)
    const ids = (pts ?? []).map((p) => p.id)
    const orParts = [`cert_no.ilike.%${q}%`]
    if (ids.length) orParts.push(`patient_id.in.(${ids.join(',')})`)
    query = query.or(orParts.join(','))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ certs: data ?? [], page })
}

// POST /api/admin/certs — create a DRAFT certificate.
export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canWrite(me)) return NextResponse.json({ error: 'บัญชีนี้เป็นแบบดูอย่างเดียว' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const patientId = body?.patient_id
  const certType = body?.cert_type as CertType
  const visitDate = body?.visit_date

  if (!patientId || !CERT_TYPES.includes(certType) || !visitDate) {
    return NextResponse.json({ error: 'ต้องระบุคนไข้ ประเภทใบรับรอง และวันที่ตรวจ' }, { status: 400 })
  }

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle()
  if (!patient) return NextResponse.json({ error: 'ไม่พบข้อมูลคนไข้' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('medical_certificates')
    .insert([{
      cert_type: certType,
      patient_id: patientId,
      visit_date: visitDate,
      photo_path: body?.photo_path || null,
      exam: body?.exam ?? {},
      disease_items: Array.isArray(body?.disease_items) ? body.disease_items : seedDiseaseItems(certType),
      lab_analytes: Array.isArray(body?.lab_analytes) ? body.lab_analytes : [],
      lab_report_id: body?.lab_report_id || null,
      summary: body?.summary || null,
      fit_status: body?.fit_status || null,
      doctor_name: body?.doctor_name || me.name || null,
      doctor_license: body?.doctor_license || null,
      status: 'draft',
      created_by: me.id,
    }])
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({ actor: me.email, action: 'cert_create', details: { cert_id: data.id, patient_id: patientId }, ip: requestIp(req) })
  return NextResponse.json({ id: data.id })
}
