// Browser → server bridge for Meta Conversions API.
// The browser-side Pixel is gated by Pixels.tsx behind PDPA consent in
// localStorage; this endpoint expects the caller to have already verified
// consent before posting (it will not load consent itself because it lives
// in localStorage and so isn't readable from a Next.js Route Handler).
//
// Dedup: caller MUST supply a stable `event_id`. Pair it with the browser
// `fbq('track', name, props, { eventID })` call to enable Meta dedup.
//
// Standard usage from the browser wrapper (src/lib/meta-pixel.ts):
//   POST /api/track/conversion
//   { event_name, event_id, user, custom_data, event_source_url, service? }
//
// The endpoint is intentionally permissive about which event names it will
// forward — Meta itself enforces the standard event taxonomy on its side.
// Health-related fields are stripped via `sanitizeCustomData`.

import { NextRequest, NextResponse } from 'next/server'
import { sendMetaCAPIEvent, type MetaCAPIInput } from '@/lib/meta-capi'

interface BodyShape {
  event_name?: string
  event_id?: string
  event_source_url?: string
  user?: Partial<MetaCAPIInput['user']>
  custom_data?: Record<string, unknown>
  service?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyShape

    if (!body.event_name || !body.event_id) {
      return NextResponse.json({ error: 'event_name and event_id required' }, { status: 400 })
    }

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    const ua = req.headers.get('user-agent') || undefined
    const fbc = req.cookies.get('_fbc')?.value
    const fbp = req.cookies.get('_fbp')?.value

    await sendMetaCAPIEvent({
      event_name: body.event_name as MetaCAPIInput['event_name'],
      event_id: body.event_id,
      event_source_url: body.event_source_url || req.headers.get('referer') || undefined,
      service: body.service,
      user: {
        email: body.user?.email ?? null,
        phone: body.user?.phone ?? null,
        first_name: body.user?.first_name ?? null,
        last_name: body.user?.last_name ?? null,
        external_id: body.user?.external_id ?? null,
        ip: ip || null,
        user_agent: ua || null,
        fbc: fbc || null,
        fbp: fbp || null,
      },
      custom_data: body.custom_data,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[track/conversion] error', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'tracking failed' },
      { status: 500 },
    )
  }
}
