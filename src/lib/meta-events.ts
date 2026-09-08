// Meta Conversions API (server-side) — ส่ง event ตรงจาก backend → Meta
//
// จำเป็นกว่าฝั่ง TikTok ด้วยซ้ำ เพราะตั้งแต่ web quiz ถูกปิด (PR #139)
// conversion จริงเกิด "ใน LINE" ที่ Meta Pixel ฝั่ง browser มองไม่เห็นเลย
// ถ้าไม่มี CAPI จะ optimize ได้แค่ proxy event (`Contact` ตอนกดออกไป LINE) ตลอดไป
//
// Dedup: client-side `fbq('track', name, props, { eventID })` กับ payload ฝั่ง server
// ที่ใช้ `event_id` เดียวกัน → Meta merge ให้อัตโนมัติ (คอนเวนชันเดียวกับ tiktok-events.ts
// คือใช้ voucher code เป็น event id)
//
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api

import crypto from 'crypto'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const PIXEL_ID_MENS = process.env.NEXT_PUBLIC_META_PIXEL_ID_MENS
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const ACCESS_TOKEN_MENS = process.env.META_CAPI_ACCESS_TOKEN_MENS
// Optional — copy from Events Manager → Test Events tab to verify payloads
// land before going live.
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE

export type MetaEventName =
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'Schedule'
  | 'SubmitApplication'

export interface MetaEventInput {
  event_name: MetaEventName
  event_id: string
  event_time?: number
  user: {
    email?: string
    phone?: string
    external_id?: string
    ip?: string
    user_agent?: string
    /** `fb.1.<ms>.<fbclid>` — built at the ad landing page, see buildFbc() */
    fbc?: string
    /** `_fbp` cookie value, verbatim */
    fbp?: string
  }
  custom_data?: {
    content_name?: string
    content_type?: string
    content_category?: string
    value?: number
    currency?: string
    [key: string]: unknown
  }
  event_source_url?: string
  // Service vertical — when 'mens' and the mens-specific pixel/token are set,
  // route to the isolated pixel so a flagged mens campaign cannot affect the
  // main account the other verticals rely on (mirrors tiktok-events.ts).
  service?: string
}

const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s.toLowerCase().trim()).digest('hex')

/**
 * Meta wants digits only, country code included, NO leading '+' or zeros —
 * deliberately different from the E.164 shape TikTok asks for, so this does
 * not share a normalizer with tiktok-events.ts.
 */
function normalizePhoneForMeta(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // 0812345678 (local Thai) → 66812345678
  if (digits.startsWith('0')) return `66${digits.slice(1)}`
  return digits
}

export async function sendMetaEvent(input: MetaEventInput): Promise<void> {
  const useMens = input.service === 'mens'
  const pixelId = useMens ? PIXEL_ID_MENS : PIXEL_ID
  const accessToken = useMens ? (ACCESS_TOKEN_MENS || ACCESS_TOKEN) : ACCESS_TOKEN
  // No pixel or no token = nothing to send. Silent by design: this must never
  // become a reason a voucher fails to issue.
  if (!pixelId || !accessToken) return

  const u = input.user
  const userData: Record<string, unknown> = {
    em: u.email ? sha256(u.email) : undefined,
    ph: u.phone ? sha256(normalizePhoneForMeta(u.phone)) : undefined,
    external_id: u.external_id ? sha256(u.external_id) : undefined,
    client_ip_address: u.ip,
    client_user_agent: u.user_agent,
    // fbc/fbp are the ONLY user_data fields Meta wants unhashed.
    fbc: u.fbc,
    fbp: u.fbp,
  }
  for (const k of Object.keys(userData)) {
    if (userData[k] === undefined) delete userData[k]
  }

  const body = {
    data: [
      {
        event_name: input.event_name,
        event_time: input.event_time ?? Math.floor(Date.now() / 1000),
        event_id: input.event_id,
        action_source: 'website',
        ...(input.event_source_url ? { event_source_url: input.event_source_url } : {}),
        user_data: userData,
        custom_data: input.custom_data ?? {},
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      // ไม่ log ตัว token — error body ของ Graph ไม่มี token อยู่แล้ว
      console.error('[meta-events] HTTP', res.status, (await res.text()).slice(0, 500))
      return
    }
    const json = (await res.json()) as { events_received?: number; error?: unknown }
    if (json.error) console.error('[meta-events] API error', json.error)
  } catch (err) {
    console.error('[meta-events] fetch failed', err)
  }
}
