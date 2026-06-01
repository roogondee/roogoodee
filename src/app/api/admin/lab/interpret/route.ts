import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { extractLabReport } from '@/lib/lab/extract'
import { buildTimeline } from '@/lib/lab/compare'
import type { LabReport } from '@/lib/lab/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = 'lab-files'

// POST { patientId, path, contentType, reportDate? }
// Downloads the uploaded file, runs AI extraction, inserts a pending_review
// report, and returns it alongside the year-over-year timeline.
export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const { patientId, path, contentType } = body ?? {}
  if (!patientId || !path || !contentType) {
    return NextResponse.json({ error: 'missing patientId/path/contentType' }, { status: 400 })
  }

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id, gender, dob')
    .eq('id', patientId)
    .maybeSingle()
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 })

  const { data: file, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(path)
  if (dlErr || !file) {
    return NextResponse.json({ error: `download failed: ${dlErr?.message}` }, { status: 500 })
  }
  const fileBytes = Buffer.from(await file.arrayBuffer())

  let result
  try {
    result = await extractLabReport({
      fileBytes,
      contentType,
      patient: { gender: patient.gender, dob: patient.dob },
    })
  } catch (e) {
    return NextResponse.json({ error: `extraction failed: ${(e as Error).message}` }, { status: 502 })
  }

  const reportDate = body.reportDate || result.report_date || new Date().toISOString().slice(0, 10)

  const { data: report, error } = await supabaseAdmin
    .from('lab_reports')
    .insert([{
      patient_id: patientId,
      report_date: reportDate,
      lab_name: result.lab_name,
      source_file_path: path,
      source_file_type: contentType,
      raw_extraction: result,
      analytes: result.analytes,
      interpretation: result.interpretation,
      interpretation_en: result.interpretation_en ?? null,
      upsell: result.upsell,
      health_score: result.interpretation?.health_score ?? null,
      risk_level: result.interpretation?.risk_level ?? null,
      status: 'pending_review',
      created_by: me.id,
    }])
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Year-over-year: prior CONFIRMED reports + this one.
  const { data: prior } = await supabaseAdmin
    .from('lab_reports')
    .select('id, report_date, analytes')
    .eq('patient_id', patientId)
    .eq('status', 'confirmed')

  const timeline = buildTimeline([
    ...(prior ?? []),
    { id: report.id, report_date: report.report_date, analytes: report.analytes },
  ] as { id: string; report_date: string; analytes: LabReport['analytes'] }[])
  timeline.patient_id = patientId

  logLeadAccess({ actor: me.email, action: 'lab_create', details: { patient_id: patientId, report_id: report.id }, ip: requestIp(req) })
  return NextResponse.json({ report, timeline })
}
