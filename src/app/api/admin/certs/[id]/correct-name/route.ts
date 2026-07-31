import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, canWrite } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import type { PatientSnapshot } from '@/lib/certs/types'

export const runtime = 'nodejs'

// POST /api/admin/certs/[id]/correct-name  { name, reason }
// Fixes a misspelled name on an ALREADY-ISSUED certificate without the full
// revoke + re-issue cycle. The cert number, token, and verify code stay stable;
// only the frozen patient_snapshot.name changes. Every correction is written to
// certificate_corrections (old value, new value, actor, reason) for audit.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canWrite(me)) return NextResponse.json({ error: 'บัญชีนี้เป็นแบบดูอย่างเดียว' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const newName = (body.name ?? '').toString().trim()
  const reason = (body.reason ?? '').toString().trim() || null
  if (!newName) return NextResponse.json({ error: 'ต้องระบุชื่อใหม่' }, { status: 400 })

  const { data: cert } = await supabaseAdmin
    .from('medical_certificates')
    .select('id, status, patient_snapshot')
    .eq('id', params.id)
    .maybeSingle()
  if (!cert) return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 })
  if (cert.status !== 'issued') {
    return NextResponse.json({ error: 'แก้ชื่อได้เฉพาะใบที่ออกแล้ว (ยังไม่ถูกเพิกถอน)' }, { status: 409 })
  }

  const snapshot = (cert.patient_snapshot ?? { name: '-' }) as PatientSnapshot
  const oldName = snapshot.name ?? '-'
  if (oldName === newName) {
    return NextResponse.json({ error: 'ชื่อใหม่เหมือนเดิม' }, { status: 400 })
  }

  const { error: updErr } = await supabaseAdmin
    .from('medical_certificates')
    .update({ patient_snapshot: { ...snapshot, name: newName }, updated_at: new Date().toISOString() })
    .eq('id', params.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await supabaseAdmin.from('certificate_corrections').insert([{
    certificate_id: params.id, field: 'name',
    old_value: oldName, new_value: newName, reason, corrected_by: me.id,
  }])

  logLeadAccess({ actor: me.email, action: 'cert_correct_name', details: { cert_id: params.id, old: oldName, new: newName }, ip: requestIp(req) })
  return NextResponse.json({ ok: true, name: newName })
}
