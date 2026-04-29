// TikTok Events API (server-side) — ส่ง event ตรงจาก backend → TikTok
// เพื่อกู้คืน event ที่หายจาก iOS/ad-blocker (~30-50%) และเพิ่ม match quality
//
// Dedup: client-side `ttq.track(name, props, { event_id })` กับ server-side
// payload ที่ใช้ `event_id` เดียวกัน → TikTok จะ merge ให้อัตโนมัติ
//
// Docs: https://business-api.tiktok.com/portal/docs?id=1771101303285761

import crypto from 'crypto'

const TIKTOK_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'

const PIXEL_CODE = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID
const PIXEL_CODE_MENS = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID_MENS
const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN
const ACCESS_TOKEN_MENS = process.env.TIKTOK_ACCESS_TOKEN_MENS
// Optional — copy from TikTok Events Manager → Test Events tab to verify
// payloads land before going live.
const TEST_EVENT_CODE = process.env.TIKTOK_TEST_EVENT_CODE

export type TikTokEventName =
  | 'ViewContent'
  | 'ClickButton'
  | 'InitiateCheckout'
  | 'AddToCart'
  | 'PlaceAnOrder'
  | 'CompletePayment'
  | 'SubmitForm'
  | 'CompleteRegistration'
  | 'Contact'
  | 'Subscribe'

export interface TikTokEventInput {
  event_name: TikTokEventName
  event_id: string
  event_time?: number
  user: {
    email?: string
    phone?: string
    external_id?: string
    ip?: string
    user_agent?: string
    ttclid?: string
    ttp?: string
  }
  properties?: {
    content_id?: string
    content_name?: string
    content_type?: string
    value?: number
    currency?: string
    [key: string]: unknown
  }
  // Service vertical — when 'mens' and the mens-specific pixel/token are set,
  // route to the isolated pixel so a flagged mens campaign cannot affect
  // the main account that GLP-1/STD/CKD/Foreign rely on.
  service?: string
  page?: {
    url?: string
    referrer?: string
  }
}

const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s.toLowerCase().trim()).digest('hex')

function normalizePhoneE164(phone: string): string {
  // TikTok wants E.164 (e.g. +66812345678) before hashing.
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0')) return `+66${digits.slice(1)}`
  return `+${digits}`
}

export async function sendTikTokEvent(input: TikTokEventInput): Promise<void> {
  // Pick mens-specific credentials only when both mens pixel + mens token are
  // configured; otherwise mens events fire NOTHING (safer than reusing the
  // shared pixel — see Pixels.tsx for matching client-side behavior).
  const useMens = input.service === 'mens'
  const pixelCode = useMens ? PIXEL_CODE_MENS : PIXEL_CODE
  const accessToken = useMens ? (ACCESS_TOKEN_MENS || ACCESS_TOKEN) : ACCESS_TOKEN
  if (!pixelCode || !accessToken) return

  const u = input.user
  const body = {
    event_source: 'web',
    event_source_id: pixelCode,
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
    data: [
      {
        event: input.event_name,
        event_time: input.event_time ?? Math.floor(Date.now() / 1000),
        event_id: input.event_id,
        user: {
          email: u.email ? sha256(u.email) : undefined,
          phone: u.phone ? sha256(normalizePhoneE164(u.phone)) : undefined,
          external_id: u.external_id ? sha256(u.external_id) : undefined,
          ip: u.ip,
          user_agent: u.user_agent,
          ttclid: u.ttclid,
          ttp: u.ttp,
        },
        properties: input.properties ?? {},
        page: input.page ?? {},
      },
    ],
  }

  try {
    const res = await fetch(TIKTOK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('[tiktok-events] HTTP', res.status, await res.text())
      return
    }
    const json = (await res.json()) as { code?: number; message?: string }
    if (json.code && json.code !== 0) {
      console.error('[tiktok-events] API error', json)
    }
  } catch (err) {
    console.error('[tiktok-events] fetch failed', err)
  }
}
