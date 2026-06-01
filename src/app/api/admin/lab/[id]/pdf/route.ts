import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { buildTimeline } from '@/lib/lab/compare'
import { LabReportPdf } from '@/lib/lab/pdf/LabReportPdf'
import type { LabReport } from '@/lib/lab/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET /api/admin/lab/[id]/pdf?lang=th|en  — streams the signed PDF report.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'th'

  const { data: report } = await supabaseAdmin
    .from('lab_reports')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (report.status !== 'confirmed') {
    return NextResponse.json({ error: 'report must be confirmed before export' }, { status: 409 })
  }

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('name')
    .eq('id', report.patient_id)
    .maybeSingle()

  const { data: confirmed } = await supabaseAdmin
    .from('lab_reports')
    .select('id, report_date, analytes')
    .eq('patient_id', report.patient_id)
    .eq('status', 'confirmed')

  const timeline = buildTimeline((confirmed ?? []) as { id: string; report_date: string; analytes: LabReport['analytes'] }[])
  timeline.patient_id = report.patient_id

  const base = process.env.SITE_BASE_URL || 'https://roogondee.com'
  const verifyUrl = report.public_token ? `${base}/verify/lab/${report.public_token}` : undefined
  const qrDataUrl = verifyUrl ? await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 }) : undefined

  const element = React.createElement(LabReportPdf, {
    patientName: patient?.name ?? '-',
    report: report as LabReport,
    timeline,
    qrDataUrl,
    verifyUrl,
    lang,
  }) as unknown as Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(element)

  logLeadAccess({ actor: me.email, action: 'lab_export', details: { patient_id: report.patient_id, report_id: params.id }, ip: requestIp(req) })

  const filename = `lab-${(patient?.name ?? 'report').replace(/\s+/g, '_')}-${report.report_date}.pdf`
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
