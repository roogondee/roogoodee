import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requestIp } from '@/lib/auth'
import { isSearchRateLimited, logVerifyAttempt } from '@/lib/certs/access-log'

export const runtime = 'nodejs'

// POST /api/verify/search  { by: 'cert_no' | 'name', cert_no?, name?, code }
//
// PDPA gate for the public registry: a certificate is resolved to its token
// ONLY when the caller supplies the correct 6-digit personal verify_code
// alongside the name or certificate number. A name/number lookup without the
// matching code returns nothing, so no health data is ever disclosed by search
// alone. Every attempt is logged per-IP and rate-limited to stop code guessing.
// The QR flow bypasses this — the token itself is the secret.
export async function POST(req: NextRequest) {
  const ip = requestIp(req)
  if (await isSearchRateLimited(ip)) {
    return NextResponse.json({ error: 'ลองค้นหาบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const by = body.by === 'name' ? 'name' : 'cert_no'
  const code = (body.code ?? '').toString().trim()
  const certNo = (body.cert_no ?? '').toString().trim()
  const name = (body.name ?? '').toString().trim()

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'กรุณากรอกรหัสตรวจสอบส่วนบุคคล 6 หลัก' }, { status: 400 })
  }
  if (by === 'cert_no' && !certNo) {
    return NextResponse.json({ error: 'กรุณากรอกเลขที่ใบรับรอง' }, { status: 400 })
  }
  if (by === 'name' && !name) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อ-นามสกุล' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('medical_certificates')
    .select('public_token')
    .eq('verify_code', code)
    .in('status', ['issued', 'revoked'])
    .limit(1)

  query = by === 'cert_no'
    ? query.eq('cert_no', certNo)
    : query.ilike('patient_snapshot->>name', name)

  const { data, error } = await query.maybeSingle()

  const token = !error && data?.public_token ? (data.public_token as string) : null
  logVerifyAttempt(ip, !!token)

  if (!token) {
    // Generic message — never reveal whether the name/number existed but the
    // code was wrong, vs. no such certificate.
    return NextResponse.json(
      { error: 'ไม่พบใบรับรองที่ตรงกัน — ตรวจสอบข้อมูลและรหัสส่วนบุคคลอีกครั้ง' },
      { status: 404 },
    )
  }

  return NextResponse.json({ token })
}
