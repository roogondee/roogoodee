import { NextRequest, NextResponse } from 'next/server'
import { notifyBookingCancel } from '@/lib/line-notify'

export const runtime = 'nodejs'
export const maxDuration = 15

const ALLOWED_ORIGINS = new Set([
  'https://booking-dun-mu.vercel.app',
  'https://www.roogondee.com',
  'https://roogondee.com',
])

interface CancelPayload {
  name?: string
  phone?: string
  service?: string
  date?: string
  time?: string
  reason?: string
  source?: string
}

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://booking-dun-mu.vercel.app'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get('origin'))

  let body: CancelPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers })
  }

  const name = (body.name || '').toString().trim().slice(0, 100)
  const phone = (body.phone || '').toString().trim().slice(0, 30)
  const service = (body.service || 'general').toString().trim().slice(0, 30)
  const date = (body.date || '').toString().trim().slice(0, 30)
  const time = (body.time || '').toString().trim().slice(0, 30)
  const reason = (body.reason || '').toString().trim().slice(0, 300)
  const source = (body.source || 'booking-page').toString().trim().slice(0, 50)

  if (!name && !phone) {
    return NextResponse.json({ ok: false, error: 'missing_contact' }, { status: 400, headers })
  }

  try {
    await notifyBookingCancel({ name, phone, service, date, time, reason, source })
  } catch (err) {
    console.error('booking-cancel notify error:', err)
    return NextResponse.json({ ok: false, error: 'line_push_error' }, { status: 502, headers })
  }

  return NextResponse.json({ ok: true }, { headers })
}
