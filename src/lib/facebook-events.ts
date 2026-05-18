// Facebook Conversions API (CAPI) — ส่ง event ตรงจาก backend → Meta
// เพื่อกู้ event ที่หายจาก iOS 14.5 / cookie restriction / ad-blocker (~30-40%)
// และเพิ่ม Event Match Quality
//
// Dedup: client-side `fbq('track', 'Lead', props, { eventID })` กับ server-side
// payload ที่ใช้ `event_id` เดียวกัน → Meta จะ merge ให้อัตโนมัติ
//
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api

import crypto from 'crypto'

const FB_API_VERSION = 'v19.0'

const PIXEL_ID = process.env.FB_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
const PIXEL_ID_MENS = process.env.FB_PIXEL_ID_MENS || process.env.NEXT_PUBLIC_META_PIXEL_ID_MENS
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN
const ACCESS_TOKEN_MENS = process.env.FB_ACCESS_TOKEN_MENS
// Optional — copy from Events Manager → Test Events tab to verify the
// payload lands before going live.
const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE

export type FacebookStandardEvent =
  | 'Lead'
  | 'CompleteRegistration'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'Contact'
  | 'Subscribe'

export interface FacebookEventInput {
  event_name: FacebookStandardEvent
  event_id: string
  event_time?: number
  event_source_url?: string
  user: {
    email?: string
    phone?: string
    external_id?: string
    ip?: string
    user_agent?: string
    fbp?: string
    fbc?: string
    fbclid?: string
  }
  custom_data?: {
    content_category?: string
    content_name?: string
    content_ids?: string[]
    value?: number
    currency?: string
    [key: string]: unknown
  }
  // Route mens traffic to isolated pixel when configured — matches the
  // Pixels.tsx + tiktok-events.ts behavior so a flagged mens campaign cannot
  // affect the main account that GLP-1/STD/CKD/Foreign rely on.
  service?: string
}

const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s.toLowerCase().trim()).digest('hex')

function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('0')) return `+66${digits.slice(1)}`
  return `+${digits}`
}

// Meta accepts `fbc` formatted as `fb.1.<unix_ms>.<fbclid>`. Synthesize it
// from a raw fbclid when the _fbc cookie isn't available — improves match
// quality on first-touch visitors who haven't been on the site before.
function resolveFbc(fbc?: string, fbclid?: string): string | undefined {
  if (fbc) return fbc
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`
  return undefined
}

export async function sendFacebookEvent(input: FacebookEventInput): Promise<void> {
  const useMens = input.service === 'mens'
  const pixelId = useMens ? PIXEL_ID_MENS : PIXEL_ID
  const accessToken = useMens ? (ACCESS_TOKEN_MENS || ACCESS_TOKEN) : ACCESS_TOKEN
  if (!pixelId || !accessToken) return

  const u = input.user
  const userData: Record<string, unknown> = {}
  if (u.email) userData.em = [sha256(u.email)]
  if (u.phone) userData.ph = [sha256(normalizePhoneE164(u.phone))]
  if (u.external_id) userData.external_id = [sha256(u.external_id)]
  if (u.ip) userData.client_ip_address = u.ip
  if (u.user_agent) userData.client_user_agent = u.user_agent
  if (u.fbp) userData.fbp = u.fbp
  const fbc = resolveFbc(u.fbc, u.fbclid)
  if (fbc) userData.fbc = fbc

  const body = {
    data: [
      {
        event_name: input.event_name,
        event_time: input.event_time ?? Math.floor(Date.now() / 1000),
        event_id: input.event_id,
        action_source: 'website',
        event_source_url: input.event_source_url,
        user_data: userData,
        custom_data: input.custom_data ?? {},
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  }

  const url = `https://graph.facebook.com/${FB_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('[facebook-events] HTTP', res.status, await res.text())
      return
    }
    const json = (await res.json()) as { events_received?: number; messages?: unknown[]; fbtrace_id?: string }
    if (json.messages && json.messages.length > 0) {
      console.error('[facebook-events] API messages', json)
    }
  } catch (err) {
    console.error('[facebook-events] fetch failed', err)
  }
}
