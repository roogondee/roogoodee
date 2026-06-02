import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { extractLabReport } from '@/lib/lab/extract'

export const runtime = 'nodejs'
// Runs the same AI vision extraction as the admin path; give it headroom.
export const maxDuration = 300

const BUCKET = 'lab-files'
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 15 * 1024 * 1024
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
}
const DAILY_IP_LIMIT = 5

// Public patient self-submission. Stores the file, runs AI extraction, and
// queues a pending_review report for staff to verify and confirm — patients
// never see the AI draft, only the confirmed result via their LINE link.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid form' }, { status: 400 })

  const file = form.get('file')
  const name = String(form.get('name') ?? '').trim()
  const phone = String(form.get('phone') ?? '').trim()
  const consent = String(form.get('consent') ?? '') === 'true'

  if (!name || !phone) return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทร' }, { status: 400 })
  if (!consent) return NextResponse.json({ error: 'กรุณายินยอมให้จัดเก็บข้อมูล (PDPA)' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'กรุณาเลือกไฟล์ผลตรวจ' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: `ไฟล์ไม่รองรับ: ${file.type}` }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (เกิน 15MB)' }, { status: 400 })

  const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()

  // Per-IP daily rate limit (fails open if the count query errors).
  if (clientIp) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('lab_reports')
      .select('id', { count: 'exact', head: true })
      .eq('submit_ip', clientIp)
      .eq('submitted_by_patient', true)
      .gte('created_at', since)
    if ((count ?? 0) >= DAILY_IP_LIMIT) {
      return NextResponse.json({ error: 'ส่งผลตรวจครบจำนวนต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้ หรือทักไลน์เรา' }, { status: 429 })
    }
  }

  // Find or create a lightweight patient keyed by phone. national_id_hash is
  // NOT NULL/unique; for self-submission we derive it from the phone so repeat
  // uploads link to the same patient. Staff can merge with a real ID later.
  const idHash = createHash('sha256').update(`selfsubmit:${phone}`).digest('hex')
  let patientId: string
  const { data: existing } = await supabaseAdmin
    .from('patients').select('id').eq('national_id_hash', idHash).maybeSingle()
  if (existing) {
    patientId = existing.id
  } else {
    const { data: created, error: pErr } = await supabaseAdmin
      .from('patients')
      .insert([{ name, phone, national_id_hash: idHash, consent_pdpa: true, consent_at: new Date().toISOString() }])
      .select('id').single()
    if (pErr || !created) return NextResponse.json({ error: 'บันทึกข้อมูลผู้ป่วยไม่สำเร็จ' }, { status: 500 })
    patientId = created.id
  }

  // Upload to the private bucket.
  const path = `lab/incoming/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${EXT[file.type]}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: file.type })
  if (upErr) return NextResponse.json({ error: 'อัปโหลดไฟล์ไม่สำเร็จ' }, { status: 500 })

  // AI extraction (queued for staff review — not shown to the patient).
  let result
  try {
    result = await extractLabReport({ fileBytes: buf, contentType: file.type })
  } catch {
    return NextResponse.json({ error: 'อ่านผลตรวจไม่สำเร็จ กรุณาถ่ายให้ชัดแล้วลองใหม่ หรือทักไลน์เรา' }, { status: 502 })
  }

  const reportDate = result.report_date || new Date().toISOString().slice(0, 10)
  const { error: rErr } = await supabaseAdmin.from('lab_reports').insert([{
    patient_id: patientId,
    report_date: reportDate,
    lab_name: result.lab_name,
    source_file_path: path,
    source_file_type: file.type,
    raw_extraction: result,
    analytes: result.analytes,
    interpretation: result.interpretation,
    interpretation_en: result.interpretation_en ?? null,
    upsell: result.upsell,
    health_score: result.interpretation?.health_score ?? null,
    risk_level: result.interpretation?.risk_level ?? null,
    status: 'pending_review',
    submitted_by_patient: true,
    submit_ip: clientIp || null,
  }])
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
