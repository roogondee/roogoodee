// Meta Conversions API (server-side) — fire conversion events directly from
// our backend → Meta so iOS/ad-blocker losses (~30-50%) and EMQ score recover
// vs. relying on the browser Pixel alone.
//
// Dedup contract: client fires
//   fbq('track', 'Lead', props, { eventID: voucher.code })
// and server fires the same event_name with `event_id = voucher.code`. Meta
// merges the two by event_id when the timestamps are within ~7 days.
//
// Compliance (Meta Health & Wellness + PDPA):
//   - PII (em/ph/fn/ln/external_id) is SHA-256 hashed lowercase+trim.
//   - Phone is normalized to E.164 with no leading `+` (e.g. `66812345678`)
//     before hashing.
//   - sanitizeCustomData strips drug names + clinical fields so a careless
//     caller can't leak Ozempic/BMI/etc. into ads infrastructure.
//
// Per-vertical pixel routing mirrors tiktok-events.ts: when service='mens'
// and the mens pixel/token are set, route there instead of the main pixel
// to isolate higher-risk Andropause / Sexual Wellness traffic.
//
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api

import crypto from 'crypto'

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const PIXEL_ID_MENS = process.env.NEXT_PUBLIC_META_PIXEL_ID_MENS
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const ACCESS_TOKEN_MENS = process.env.META_CAPI_ACCESS_TOKEN_MENS
// Optional — copy from Meta Events Manager → Test Events tab to verify
// payloads land before going live. MUST be empty in production.
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE

export type MetaStandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'Schedule'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Subscribe'

export interface MetaCAPIInput {
  event_name: MetaStandardEvent | string
  event_id: string
  event_time?: number
  action_source?: 'website' | 'app' | 'chat' | 'email' | 'phone_call' | 'physical_store' | 'system_generated' | 'other'
  event_source_url?: string
  user: {
    email?: string | null
    phone?: string | null
    first_name?: string | null
    last_name?: string | null
    external_id?: string | null
    ip?: string | null
    user_agent?: string | null
    fbc?: string | null
    fbp?: string | null
  }
  custom_data?: Record<string, unknown>
  // When 'mens' and mens credentials are configured, route to the isolated
  // pixel so a flagged mens campaign cannot freeze the shared ad account.
  service?: string
}

const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s.toLowerCase().trim()).digest('hex')

// Meta wants E.164 *without* the leading `+` (e.g. 66812345678) before
// hashing. tiktok-events.ts uses the +-prefixed variant — keep them separate
// to avoid silently breaking either dedup chain.
function normalizePhoneE164NoPlus(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('66')) return digits
  if (digits.startsWith('0')) return `66${digits.slice(1)}`
  return digits
}

// Health & wellness ad policy — these keys/values must NEVER reach Meta.
// Caller-side mistakes (e.g. someone passes `bmi` or `ozempic` in custom_data)
// are silently dropped here rather than aborting the event.
const PROHIBITED_KEYS = new Set([
  'bmi',
  'weight',
  'height',
  'blood_pressure',
  'glucose',
  'hba1c',
  'fbs',
  'icd_code',
  'diagnosis',
  'symptom',
  'symptoms',
  'medication',
])

const PROHIBITED_VALUE_PATTERN = /\b(ozempic|wegovy|saxenda|mounjaro|rybelsus|semaglutide|tirzepatide|liraglutide)\b/i

export function sanitizeCustomData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!data) return {}
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (PROHIBITED_KEYS.has(key.toLowerCase())) continue
    if (typeof value === 'string' && PROHIBITED_VALUE_PATTERN.test(value)) continue
    cleaned[key] = value
  }
  return cleaned
}

interface MetaUserData {
  em?: string[]
  ph?: string[]
  fn?: string[]
  ln?: string[]
  external_id?: string[]
  client_ip_address?: string
  client_user_agent?: string
  fbc?: string
  fbp?: string
}

function buildUserData(u: MetaCAPIInput['user']): MetaUserData {
  const ud: MetaUserData = {}
  if (u.email) ud.em = [sha256(u.email)]
  if (u.phone) ud.ph = [sha256(normalizePhoneE164NoPlus(u.phone))]
  if (u.first_name) ud.fn = [sha256(u.first_name)]
  if (u.last_name) ud.ln = [sha256(u.last_name)]
  if (u.external_id) ud.external_id = [sha256(u.external_id)]
  if (u.ip) ud.client_ip_address = u.ip
  if (u.user_agent) ud.client_user_agent = u.user_agent
  if (u.fbc) ud.fbc = u.fbc
  if (u.fbp) ud.fbp = u.fbp
  return ud
}

export async function sendMetaCAPIEvent(input: MetaCAPIInput): Promise<void> {
  // Pick mens-specific credentials only when both mens pixel + mens token are
  // configured; otherwise fall through to the shared pixel only when it's
  // NOT a mens event. For a mens event without mens creds we fire NOTHING
  // — same isolation policy as Pixels.tsx + tiktok-events.ts.
  const useMens = input.service === 'mens'
  const pixelId = useMens ? PIXEL_ID_MENS : PIXEL_ID
  const accessToken = useMens ? (ACCESS_TOKEN_MENS || ACCESS_TOKEN) : ACCESS_TOKEN
  if (!pixelId || !accessToken) return

  const payload = {
    data: [
      {
        event_name: input.event_name,
        event_time: input.event_time ?? Math.floor(Date.now() / 1000),
        event_id: input.event_id,
        action_source: input.action_source ?? 'website',
        event_source_url: input.event_source_url,
        user_data: buildUserData(input.user),
        custom_data: sanitizeCustomData(input.custom_data),
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  }

  try {
    const res = await fetch(
      `${META_API_BASE}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!res.ok) {
      console.error('[meta-capi] HTTP', res.status, await res.text())
      return
    }
    const json = (await res.json()) as { events_received?: number; fbtrace_id?: string; error?: unknown }
    if (json.error) {
      console.error('[meta-capi] API error', json.error)
    }
  } catch (err) {
    console.error('[meta-capi] fetch failed', err)
  }
}
