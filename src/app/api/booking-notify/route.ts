import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 15

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_NOTIFY_GROUP_ID = process.env.LINE_NOTIFY_GROUP_ID || ''

const ALLOWED_ORIGINS = new Set([
  'https://booking-dun-mu.vercel.app',
  'https://www.roogondee.com',
  'https://roogondee.com',
])

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD & PrEP',
  glp1: 'GLP-1 ลดน้ำหนัก',
  ckd: 'CKD โรคไต',
  foreign: 'แรงงานต่างด้าว',
  general: 'ทั่วไป',
}

interface BookingPayload {
  name?: string
  phone?: string
  service?: string
  date?: string
  time?: string
  note?: string
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
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  let body: BookingPayload
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
  const note = (body.note || '').toString().trim().slice(0, 300)
  const source = (body.source || 'booking-page').toString().trim().slice(0, 50)

  if (!name && !phone) {
    return NextResponse.json({ ok: false, error: 'missing_contact' }, { status: 400, headers })
  }

  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_NOTIFY_GROUP_ID) {
    console.error('booking-notify: LINE env not configured')
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500, headers })
  }

  const label = SERVICE_LABELS[service] || service
  const sep = '━━━━━━━━━━━━━━━'
  const lines = [
    `📅 จองคิวใหม่ — ${label}`,
    sep,
    `👤 ${name || '-'}`,
    `📞 ${phone || '-'}`,
    date || time ? `🕐 ${[date, time].filter(Boolean).join(' ')}` : null,
    note ? `💬 ${note}` : null,
    sep,
    `🌐 ที่มา: ${source}`,
    `🔧 https://www.roogondee.com/admin`,
  ].filter((l): l is string => Boolean(l))

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_NOTIFY_GROUP_ID,
        messages: [{ type: 'text', text: lines.join('\n') }],
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('LINE push failed:', res.status, errText)
      return NextResponse.json({ ok: false, error: 'line_push_failed' }, { status: 502, headers })
    }
  } catch (err) {
    console.error('LINE push error:', err)
    return NextResponse.json({ ok: false, error: 'line_push_error' }, { status: 502, headers })
  }

  return NextResponse.json({ ok: true }, { headers })
}
