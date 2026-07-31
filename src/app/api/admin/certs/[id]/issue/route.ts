import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, canWrite } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { newCertToken, nextCertNo, buildPatientSnapshot, defaultValidUntil, generateVerifyCode } from '@/lib/certs/issue'

export const runtime = 'nodejs'

// POST /api/admin/certs/[id]/issue
// Assigns a running cert_no + unguessable public_token, freezes the patient
// snapshot, records doctor sign-off, flips status -> issued. Idempotent-ish:
// re-issuing a cert that already has a number/token keeps them stable.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canWrite(me)) return NextResponse.json({ error: 'บัญชีนี้เป็นแบบดูอย่างเดียว' }, { status: 403 })

  const body = await req.json().catch(() => ({}))

  const { data: cert } = await supabaseAdmin
    .from('medical_certificates')
    .select('id, status, cert_type, patient_id, visit_date, cert_no, public_token, verify_code, doctor_name, doctor_license, exam')
    .eq('id', params.id)
    .maybeSingle()
  if (!cert) return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 })
  if (cert.status === 'revoked') {
    return NextResponse.json({ error: 'ใบรับรองนี้ถูกเพิกถอนแล้ว ออกใหม่ไม่ได้' }, { status: 409 })
  }

  // PDPA gate: cannot certify a patient who has not consented.
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('consent_pdpa')
    .eq('id', cert.patient_id)
    .maybeSingle()
  if (!patient?.consent_pdpa) {
    return NextResponse.json({ error: 'คนไข้ยังไม่ได้ให้ความยินยอม PDPA — ออกใบรับรองไม่ได้' }, { status: 400 })
  }

  const doctorName = (body.doctor_name ?? cert.doctor_name ?? me.name)?.toString().trim()
  const doctorLicense = (body.doctor_license ?? cert.doctor_license)?.toString().trim() || null
  if (!doctorName) {
    return NextResponse.json({ error: 'ต้องระบุชื่อแพทย์ผู้รับรอง' }, { status: 400 })
  }

  const exam = (cert.exam ?? {}) as { employer_name?: string; work_permit_no?: string }
  const snapshot = await buildPatientSnapshot(cert.patient_id, {
    employer_name: body.employer_name ?? exam.employer_name ?? null,
    work_permit_no: body.work_permit_no ?? exam.work_permit_no ?? null,
  })

  const update: Record<string, unknown> = {
    status: 'issued',
    cert_no: cert.cert_no ?? await nextCertNo(cert.visit_date),
    public_token: cert.public_token ?? newCertToken(),
    verify_code: cert.verify_code ?? generateVerifyCode(),
    patient_snapshot: snapshot,
    doctor_name: doctorName,
    doctor_license: doctorLicense,
    issued_by: me.id,
    issued_at: new Date().toISOString(),
    valid_until: body.valid_until || defaultValidUntil(cert.cert_type, cert.visit_date),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('medical_certificates')
    .update(update)
    .eq('id', params.id)
    .select('id, cert_no, public_token, verify_code')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({ actor: me.email, action: 'cert_issue', details: { cert_id: params.id, cert_no: data.cert_no }, ip: requestIp(req) })
  return NextResponse.json({ id: data.id, cert_no: data.cert_no, public_token: data.public_token, verify_code: data.verify_code })
}
