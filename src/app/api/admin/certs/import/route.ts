import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, canWrite } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { parseCsv, mapCsvRows, parseThaiDate, type CsvCertRow } from '@/lib/certs/csv'
import { readSpreadsheet } from '@/lib/certs/spreadsheet'
import { upsertPatient, isValidThaiId, type IdType } from '@/lib/certs/patients'
import { buildAnalyte } from '@/lib/certs/labs'
import { newCertToken, nextCertNo, buildPatientSnapshot, defaultValidUntil, generateVerifyCode } from '@/lib/certs/issue'
import { seedDiseaseItems, type CertType, type FitStatus, type CertDiseaseItem } from '@/lib/certs/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_ROWS = 500
const CERT_TYPES: CertType[] = ['general', 'annual_checkup', 'risk_based', 'work_permit']
const FIT_VALUES: FitStatus[] = ['normal', 'fit', 'fit_with_condition', 'unfit']

interface RowError { row: number; field: string; message_th: string }
interface BatchDefaults {
  cert_type: CertType
  visit_date?: string
  doctor_name?: string
  doctor_license?: string
  employer_name?: string
}

function num(v: string | undefined): number | undefined {
  if (!v) return undefined
  const n = Number(v.replace(/,/g, ''))
  return Number.isNaN(n) ? undefined : n
}

function validateRow(r: CsvCertRow, defaults: BatchDefaults): RowError[] {
  const errs: RowError[] = []
  const f = r.fields
  if (!f.name) errs.push({ row: r.rowNumber, field: 'name', message_th: 'ไม่มีชื่อ' })
  const idType = (f.id_type as IdType) || 'thai_id'
  const doc = f.national_id ?? ''
  if (!doc) errs.push({ row: r.rowNumber, field: 'national_id', message_th: 'ไม่มีเลขบัตร/พาสปอร์ต' })
  else if (idType === 'thai_id' && !isValidThaiId(doc)) errs.push({ row: r.rowNumber, field: 'national_id', message_th: 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ผิด)' })
  const visitRaw = f.visit_date || defaults.visit_date || ''
  if (!visitRaw) errs.push({ row: r.rowNumber, field: 'visit_date', message_th: 'ไม่มีวันที่ตรวจ' })
  else if (!parseThaiDate(visitRaw)) errs.push({ row: r.rowNumber, field: 'visit_date', message_th: 'รูปแบบวันที่ไม่ถูกต้อง' })
  if (f.fit_status && !FIT_VALUES.includes(f.fit_status as FitStatus)) errs.push({ row: r.rowNumber, field: 'fit_status', message_th: 'ค่า fit_status ไม่ถูกต้อง' })
  return errs
}

function buildDiseaseItems(r: CsvCertRow, certType: CertType): CertDiseaseItem[] {
  const items = seedDiseaseItems(certType)
  // item:1..N overrides map by position; value 'abnormal'/'ผิดปกติ'/'พบ' flags it.
  Object.entries(r.items).forEach(([k, v]) => {
    const idx = Number(k) - 1
    if (idx < 0 || idx >= items.length) return
    const val = v.toLowerCase()
    items[idx].result = /(abnormal|ผิดปกติ|พบ|positive|reactive)/.test(val) ? 'abnormal'
      : /(n\/a|not tested|ไม่ได้ตรวจ)/.test(val) ? 'not_tested' : 'normal'
    if (items[idx].result !== 'normal') items[idx].detail = v
  })
  return items
}

// POST /api/admin/certs/import  (multipart: file, mode, defaults JSON)
export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!canWrite(me)) return NextResponse.json({ error: 'บัญชีนี้เป็นแบบดูอย่างเดียว' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file')
  const mode = (form.get('mode') ?? 'validate').toString()
  const defaults: BatchDefaults = JSON.parse((form.get('defaults') ?? '{}').toString())

  if (!(file instanceof File)) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })
  if (!CERT_TYPES.includes(defaults.cert_type)) {
    return NextResponse.json({ error: 'ต้องเลือกประเภทใบรับรองสำหรับทั้งไฟล์' }, { status: 400 })
  }

  // Accept both CSV and Excel (.xlsx/.xls). Both are normalised to a raw
  // string grid, then fed through the same header-mapping/validation pipeline.
  let grid: string[][]
  try {
    grid = /\.xlsx?$/i.test(file.name)
      ? await readSpreadsheet(Buffer.from(await file.arrayBuffer()))
      : parseCsv(await file.text())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ' }, { status: 400 })
  }
  const { rows, unknownHeaders } = mapCsvRows(grid)
  if (rows.length === 0) return NextResponse.json({ error: 'ไฟล์ว่างหรือไม่มีข้อมูล' }, { status: 400 })
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `จำกัด ${MAX_ROWS} แถวต่อไฟล์ (พบ ${rows.length})` }, { status: 400 })
  }

  // Validate every row; also flag in-file duplicates by identity doc.
  const errors: RowError[] = []
  const seenDocs = new Map<string, number>()
  for (const r of rows) {
    errors.push(...validateRow(r, defaults))
    const doc = (r.fields.national_id ?? '').replace(/[^0-9a-z]/gi, '').toUpperCase()
    if (doc) {
      if (seenDocs.has(doc)) errors.push({ row: r.rowNumber, field: 'national_id', message_th: `ซ้ำกับแถว ${seenDocs.get(doc)} ในไฟล์เดียวกัน` })
      else seenDocs.set(doc, r.rowNumber)
    }
  }

  if (mode === 'validate') {
    const preview = rows.map((r) => ({
      row: r.rowNumber,
      name: r.fields.name ?? '',
      national_id_masked: (r.fields.national_id ?? '').slice(-4),
      visit_date: parseThaiDate(r.fields.visit_date || defaults.visit_date || '') ?? (r.fields.visit_date || defaults.visit_date || ''),
      labs: Object.keys(r.labs).length,
    }))
    return NextResponse.json({ preview, errors, unknownHeaders, rowCount: rows.length })
  }

  // ── commit ──────────────────────────────────────────────────────────────
  if (errors.some((e) => e.field !== 'unknownHeader')) {
    return NextResponse.json({ error: 'ยังมีข้อผิดพลาด — แก้ไขก่อน commit', errors }, { status: 400 })
  }

  const { data: batch, error: batchErr } = await supabaseAdmin
    .from('certificate_import_batches')
    .insert([{ filename: file.name, cert_type: defaults.cert_type, row_count: rows.length, defaults, created_by: me.id }])
    .select('id')
    .single()
  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 })

  const rowErrors: RowError[] = []
  let success = 0
  for (const r of rows) {
    try {
      const f = r.fields
      const idType = (f.id_type as IdType) || 'thai_id'
      const patient = await upsertPatient({
        name: f.name, id_type: idType, national_id: f.national_id ?? '',
        phone: f.phone, dob: parseThaiDate(f.dob ?? '') || f.dob || null,
        gender: f.gender, nationality: f.nationality, consent_pdpa: true, created_by: me.id,
      })
      const visitDate = parseThaiDate(f.visit_date || defaults.visit_date || '')!
      const analytes = Object.entries(r.labs).map(([test, value]) =>
        buildAnalyte(test, value, { gender: (patient.gender as 'male' | 'female' | 'other' | null), dob: patient.dob }))
      const employer = f.employer_name || defaults.employer_name || null
      const exam = {
        weight_kg: num(f.weight_kg), height_cm: num(f.height_cm),
        bp_sys: num(f.bp_sys), bp_dia: num(f.bp_dia), pulse: num(f.pulse),
        employer_name: employer, work_permit_no: f.work_permit_no || null,
      }
      const snapshot = await buildPatientSnapshot(patient.id, { employer_name: employer, work_permit_no: f.work_permit_no || null })
      const doctorName = defaults.doctor_name || me.name || 'แพทย์ผู้ตรวจ'

      const { error: insErr } = await supabaseAdmin.from('medical_certificates').insert([{
        cert_type: defaults.cert_type, patient_id: patient.id, visit_date: visitDate,
        patient_snapshot: snapshot, exam,
        disease_items: buildDiseaseItems(r, defaults.cert_type),
        lab_analytes: analytes, summary: f.summary || null,
        fit_status: (f.fit_status as FitStatus) || null,
        status: 'issued', cert_no: await nextCertNo(visitDate), public_token: newCertToken(),
        verify_code: generateVerifyCode(),
        valid_until: defaultValidUntil(defaults.cert_type, visitDate),
        doctor_name: doctorName, doctor_license: defaults.doctor_license || null,
        issued_by: me.id, issued_at: new Date().toISOString(),
        import_batch_id: batch.id, created_by: me.id,
      }])
      if (insErr) throw new Error(insErr.message)
      success++
    } catch (err) {
      rowErrors.push({ row: r.rowNumber, field: 'commit', message_th: err instanceof Error ? err.message : 'error' })
    }
  }

  await supabaseAdmin.from('certificate_import_batches').update({
    success_count: success, error_count: rowErrors.length, errors: rowErrors,
    status: rowErrors.length === rows.length ? 'failed' : 'committed',
  }).eq('id', batch.id)

  logLeadAccess({ actor: me.email, action: 'cert_import', details: { batch_id: batch.id, success, failed: rowErrors.length }, ip: requestIp(req) })
  return NextResponse.json({ batch_id: batch.id, success_count: success, error_count: rowErrors.length, errors: rowErrors })
}
