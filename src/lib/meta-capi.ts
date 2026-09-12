// Meta Conversions API (server-side) — ส่ง event ตรงจาก backend → Meta
// เพื่อกู้คืน event ที่หายจาก iOS/ad-blocker และจากเคสสำคัญของ funnel เรา:
// quiz จบใน LIFF (LINE in-app browser) ที่ผู้ใช้แทบไม่เคยกดรับ PDPA banner
// → client pixel ไม่โหลด → CAPI คือทางเดียวที่ Meta จะเห็น quiz complete
//
// PDPA: เรียกเฉพาะหลัง lead ถูกสร้างด้วย consent_pdpa=true เท่านั้น
// (จุดเรียกอยู่ท้าย /api/quiz และ /api/quiz/claim-line หลังออก voucher)
//
// Dedup: client-side `fbq('track', name, props, { eventID })` กับ payload
// ฝั่งนี้ที่ใช้ `event_id` เดียวกัน (= voucher code) → Meta merge อัตโนมัติ
// โดย dedup คิดต่อคู่ (event_name, event_id) จึงใช้ voucher code ซ้ำได้
// ทั้ง Lead และ CompleteRegistration
//
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api

import crypto from 'crypto'

const GRAPH_VERSION = 'v21.0'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
// Per-vertical isolation — same policy as Pixels.tsx / tiktok-events.ts:
// mens runs on its own pixel when configured; if the mens pixel is unset,
// mens events fire NOTHING rather than polluting the shared pixel.
const PIXEL_ID_MENS = process.env.NEXT_PUBLIC_META_PIXEL_ID_MENS
const ACCESS_TOKEN_MENS = process.env.META_CAPI_ACCESS_TOKEN_MENS
// Optional — copy from Events Manager → Test Events tab to verify payloads
// land before going live.
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE

export type MetaEventName =
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'SubmitApplication'

export interface MetaEventsInput {
  // One user_data + custom_data shared by every event in the batch; each
  // entry becomes its own row in `data` with its own name + dedup id.
  events: { event_name: MetaEventName; event_id: string }[]
  user: {
    email?: string
    phone?: string
    external_id?: string
    ip?: string
    user_agent?: string
    // fbc = click id cookie ("fb.1.<ts>.<fbclid>"), fbp = browser id cookie.
    // Sent raw, never hashed.
    fbc?: string
    fbp?: string
  }
  custom_data?: Record<string, unknown>
  event_source_url?: string
  // Service vertical — 'mens' routes to the isolated mens pixel (see above).
  service?: string
}

const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s.toLowerCase().trim()).digest('hex')

function normalizePhoneForMeta(phone: string): string {
  // Meta wants digits only with country code, no '+' (e.g. 66812345678),
  // before hashing.
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('66')) return digits
  if (digits.startsWith('0')) return `66${digits.slice(1)}`
  return digits
}

export async function sendMetaEvents(input: MetaEventsInput): Promise<void> {
  const useMens = input.service === 'mens'
  const pixelId = useMens ? PIXEL_ID_MENS : PIXEL_ID
  const accessToken = useMens ? (ACCESS_TOKEN_MENS || ACCESS_TOKEN) : ACCESS_TOKEN
  if (!pixelId || !accessToken || input.events.length === 0) return

  const u = input.user
  const userData = {
    em: u.email ? [sha256(u.email)] : undefined,
    ph: u.phone ? [sha256(normalizePhoneForMeta(u.phone))] : undefined,
    external_id: u.external_id ? [sha256(u.external_id)] : undefined,
    client_ip_address: u.ip,
    client_user_agent: u.user_agent,
    fbc: u.fbc,
    fbp: u.fbp,
  }
  const eventTime = Math.floor(Date.now() / 1000)

  const body = {
    data: input.events.map(e => ({
      event_name: e.event_name,
      event_time: eventTime,
      event_id: e.event_id,
      action_source: 'website',
      event_source_url: input.event_source_url,
      user_data: userData,
      custom_data: input.custom_data ?? {},
    })),
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
    access_token: accessToken,
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      // Graph error bodies name the field that failed — keep them, but they
      // never contain the token (that only travels in our request).
      console.error('[meta-capi] HTTP', res.status, await res.text())
    }
  } catch (err) {
    console.error('[meta-capi] fetch failed', err)
  }
}
