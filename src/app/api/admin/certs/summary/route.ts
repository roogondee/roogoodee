import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { CERT_TYPE_LABEL, FIT_STATUS_LABEL, type CertType, type FitStatus } from '@/lib/certs/types'

export const runtime = 'nodejs'

function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

// GET /api/admin/certs/summary?month=YYYY-MM&format=csv
// Monthly hospital submission summary: every certificate issued in the month.
// Read-only accounts may export it (reporting only, no health-data disclosure
// beyond the registry the same staff can already browse).
export async function GET(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const month = req.nextUrl.searchParams.get('month') ?? ''
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month ต้องเป็นรูปแบบ YYYY-MM' }, { status: 400 })
  }
  const start = `${month}-01`
  const end = nextMonthStart(month)

  const { data, error } = await supabaseAdmin
    .from('medical_certificates')
    .select('cert_no, cert_type, status, visit_date, valid_until, fit_status, patient_snapshot, doctor_name, issued_at')
    .gte('issued_at', start)
    .lt('issued_at', end)
    .order('cert_no', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as {
    cert_no: string | null; cert_type: CertType; status: string
    visit_date: string; valid_until: string | null; fit_status: FitStatus | null
    patient_snapshot: { name?: string } | null; doctor_name: string | null
  }[]

  const header = ['เลขที่', 'ชื่อ', 'ประเภท', 'วันที่ตรวจ', 'ใช้ได้ถึง', 'ผลสรุป', 'แพทย์', 'สถานะ']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      r.cert_no ?? '',
      r.patient_snapshot?.name ?? '',
      CERT_TYPE_LABEL[r.cert_type] ?? r.cert_type,
      r.visit_date ?? '',
      r.valid_until ?? '',
      r.fit_status ? FIT_STATUS_LABEL[r.fit_status] : '',
      r.doctor_name ?? '',
      r.status === 'revoked' ? 'เพิกถอน' : 'ออกแล้ว',
    ].map((c) => csvCell(String(c))).join(','))
  }

  logLeadAccess({ actor: me.email, action: 'cert_summary_export', details: { month, count: rows.length }, ip: requestIp(req) })

  // UTF-8 BOM so Excel opens Thai correctly.
  const body = '﻿' + lines.join('\r\n')
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cert-summary-${month}.csv"`,
    },
  })
}
