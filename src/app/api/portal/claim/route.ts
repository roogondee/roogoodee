import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { makePatientSession, patientCookieName } from '@/lib/patient-auth'

export const runtime = 'nodejs'

// POST { code } — first-time link. Requires the `line_pending` cookie (a LINE
// id verified moments ago via OAuth) plus a valid staff-issued claim code.
// On success: patients.line_id = the LINE id, mark code used, set session.
export async function POST(req: NextRequest) {
  const lineUserId = req.cookies.get('line_pending')?.value
  if (!lineUserId) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบด้วย LINE ก่อน' }, { status: 401 })
  }

  const { code } = (await req.json().catch(() => ({}))) as { code?: string }
  const normalized = (code || '').trim().toUpperCase()
  if (!normalized) return NextResponse.json({ error: 'กรุณากรอกรหัส' }, { status: 400 })

  const { data: claim } = await supabaseAdmin
    .from('patient_claim_codes')
    .select('id, patient_id, expires_at, used_at')
    .eq('code', normalized)
    .maybeSingle()

  if (!claim || claim.used_at || new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'รหัสไม่ถูกต้องหรือหมดอายุ' }, { status: 400 })
  }

  // Link the LINE id to the patient and burn the code (best-effort atomic:
  // re-check used_at on the update to avoid a double-redeem race).
  const { error: linkErr } = await supabaseAdmin
    .from('patients')
    .update({ line_id: lineUserId })
    .eq('id', claim.patient_id)
  if (linkErr) return NextResponse.json({ error: 'ลิงก์บัญชีไม่สำเร็จ' }, { status: 500 })

  const { data: burned } = await supabaseAdmin
    .from('patient_claim_codes')
    .update({ used_at: new Date().toISOString(), used_by_line: lineUserId })
    .eq('id', claim.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()
  if (!burned) return NextResponse.json({ error: 'รหัสถูกใช้ไปแล้ว' }, { status: 400 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(patientCookieName(), makePatientSession(claim.patient_id, lineUserId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  res.cookies.delete('line_pending')
  return res
}
