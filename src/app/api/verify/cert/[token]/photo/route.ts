import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { downloadCertPhoto } from '@/lib/certs/photo'

export const runtime = 'nodejs'

// GET /api/verify/cert/[token]/photo — streams the patient photo for an
// issued/revoked cert, gated by the unguessable token. Keeps the cert-files
// bucket private (no public URL) and never cached by shared caches / crawlers.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data: cert } = await supabaseAdmin
    .from('medical_certificates')
    .select('photo_path, status')
    .eq('public_token', params.token)
    .in('status', ['issued', 'revoked'])
    .maybeSingle()

  if (!cert?.photo_path) return new NextResponse(null, { status: 404 })

  const photo = await downloadCertPhoto(cert.photo_path)
  if (!photo) return new NextResponse(null, { status: 404 })

  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      'Content-Type': photo.contentType,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
