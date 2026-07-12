import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { CertificateBatchPdf, type CertificatePdfProps } from '@/lib/certs/pdf/CertificatePdf'
import { certPhotoDataUrl } from '@/lib/certs/photo'
import type { MedicalCertificate } from '@/lib/certs/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// GET /api/admin/certs/import/[batchId]/pdf — one combined PDF, one page per
// certificate in the batch (print the whole factory stack at once).
export async function GET(req: NextRequest, { params }: { params: { batchId: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: certs } = await supabaseAdmin
    .from('medical_certificates')
    .select('*')
    .eq('import_batch_id', params.batchId)
    .eq('status', 'issued')
    .order('cert_no', { ascending: true })
  if (!certs || certs.length === 0) {
    return NextResponse.json({ error: 'ไม่พบใบรับรองในชุดนี้' }, { status: 404 })
  }

  const base = process.env.SITE_BASE_URL || 'https://roogondee.com'
  const items: CertificatePdfProps[] = await Promise.all((certs as MedicalCertificate[]).map(async (cert) => {
    const verifyUrl = cert.public_token ? `${base}/verify/cert/${cert.public_token}` : undefined
    const qrDataUrl = verifyUrl ? await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 }) : undefined
    const photoDataUrl = await certPhotoDataUrl(cert.photo_path)
    return { cert, qrDataUrl, verifyUrl, photoDataUrl }
  }))

  const element = React.createElement(CertificateBatchPdf, { items }) as unknown as Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(element)

  logLeadAccess({ actor: me.email, action: 'cert_export', details: { batch_id: params.batchId, count: items.length }, ip: requestIp(req) })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certs-batch-${params.batchId.slice(0, 8)}.pdf"`,
    },
  })
}
