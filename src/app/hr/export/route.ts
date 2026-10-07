import { NextRequest, NextResponse } from 'next/server'
import { CERT_TYPE_LABEL, FIT_STATUS_LABEL, type CertType, type FitStatus } from '@/lib/certs/types'
import { EMPLOYER_RECHECK_DAYS } from '@/lib/growth/config'
import { EMPLOYER_COOKIE, employerByToken, fetchEmployerCertificates, logEmployerAccess, workersFromCerts } from '@/lib/growth/employer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function cell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  // Neutralise spreadsheet formula injection from free-text names.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export async function GET(req: NextRequest) {
  const employer = await employerByToken(req.cookies.get(EMPLOYER_COOKIE)?.value || '')
  if (!employer) return new NextResponse('Not found', { status: 404 })

  await logEmployerAccess(
    employer.id, 'export',
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim(),
    req.headers.get('user-agent'),
  )

  const certs = await fetchEmployerCertificates(employer.match_names)
  const workers = workersFromCerts(certs, Date.now(), EMPLOYER_RECHECK_DAYS)
  const site = req.nextUrl.origin

  const lines = [
    ['ชื่อ', 'สัญชาติ', 'เลขใบอนุญาตทำงาน', 'ประเภท', 'เลขที่ใบรับรอง', 'วันที่ตรวจ', 'ผล', 'ใช้ยื่นได้ถึง', 'ตรวจครั้งถัดไป', 'ลิงก์ตรวจสอบ'],
    ...workers.map(w => {
      const c = w.latest
      return [
        c.patient_snapshot?.name, c.patient_snapshot?.nationality, c.patient_snapshot?.work_permit_no,
        CERT_TYPE_LABEL[c.cert_type as CertType] || c.cert_type, c.cert_no, c.visit_date,
        c.fit_status ? FIT_STATUS_LABEL[c.fit_status as FitStatus] : '', c.valid_until, w.nextDue,
        c.public_token ? `${site}/verify/cert/${c.public_token}` : '',
      ]
    }),
  ].map(r => r.map(cell).join(','))

  // BOM so Excel opens Thai text as UTF-8.
  return new NextResponse('﻿' + lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="workers-health-status.csv"',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
