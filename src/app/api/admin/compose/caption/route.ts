import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateCaptionFromImage } from '@/lib/anthropic/content-gen'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { imageUrl?: string; service?: string }
  const imageUrl = (body.imageUrl || '').trim()
  const service = body.service as 'glp1' | 'std' | 'ckd' | 'foreign' | undefined
  if (!imageUrl || !service) {
    return NextResponse.json({ error: 'imageUrl + service required' }, { status: 400 })
  }
  if (!['glp1', 'std', 'ckd', 'foreign'].includes(service)) {
    return NextResponse.json({ error: 'invalid service' }, { status: 400 })
  }

  try {
    const bundle = await generateCaptionFromImage({ imageUrl, service })
    return NextResponse.json(bundle)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
