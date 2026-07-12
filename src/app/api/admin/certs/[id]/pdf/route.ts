import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { CertificatePdf } from '@/lib/certs/pdf/CertificatePdf'
import { certPhotoDataUrl } from '@/lib/certs/photo'
import type { MedicalCertificate } from '@/lib/certs/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET /api/admin/certs/[id]/pdf — streams the certificate PDF (issued/revoked).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: cert } = await supabaseAdmin
    .from('medical_certificates')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!cert) return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 })
  if (cert.status === 'draft') {
    return NextResponse.json({ error: 'ต้องออกใบรับรอง (issue) ก่อนจึงจะพิมพ์ PDF ได้' }, { status: 409 })
  }

  const base = process.env.SITE_BASE_URL || 'https://roogondee.com'
  const verifyUrl = cert.public_token ? `${base}/verify/cert/${cert.public_token}` : undefined
  const qrDataUrl = verifyUrl ? await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 }) : undefined
  const photoDataUrl = await certPhotoDataUrl(cert.photo_path)

  const element = React.createElement(CertificatePdf, {
    cert: cert as MedicalCertificate, qrDataUrl, verifyUrl, photoDataUrl,
  }) as unknown as Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(element)

  logLeadAccess({ actor: me.email, action: 'cert_export', details: { cert_id: params.id, cert_no: cert.cert_no }, ip: requestIp(req) })

  const filename = `cert-${cert.cert_no ?? params.id}.pdf`
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
