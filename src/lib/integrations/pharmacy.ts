// Read-only HN lookup in the W Medical pharmacy system (roogondee/wmedical-pharmacy).
//
// DMGLP staff used to retype the patient's HN by hand. The pharmacy already
// holds it — its own patient id, plus the hospital HIS HN for records
// imported from HIS — so the patient forms ask the pharmacy "who has this
// phone?" and staff pick from the answer.
//
// Direction: roogondee → pharmacy, server to server, from the DMGLP staff
// screens only. Phone numbers go out; HN + name come back. Nothing is stored
// until staff submit the patient form, and then only the HN (the program links
// to HIS by HN — it is not an EMR). Full map: docs/system-integration.md.
//
// Contract (pharmacy side; the key needs permission patients:lookup):
//   POST {PHARMACY_API_URL}/api/integrations/v1/patients/lookup
//   content-type: application/json, x-api-key: {PHARMACY_API_KEY}
//   body  { "phones": ["0812345678"] }                       1–5 local Thai numbers
//   200   { "patients": [{ "hn": "HN-2026-00012", "original_hn": 12345 | null,
//                          "name": "…", "phone": "0812345678" }] }   0–10 items
//   400 bad body · 401 missing/invalid/revoked/expired key · 403 key lacks the
//   permission · 429 rate limited · 5xx
//
// No DB and no Next imports, so `npm test` runs it directly with a stubbed
// fetch.

import { normalizeThaiPhone } from './wmedical.ts'

export const LOOKUP_PATH = '/api/integrations/v1/patients/lookup'
export const MAX_LOOKUP_PHONES = 5
export const MAX_LOOKUP_PATIENTS = 10
export const LOOKUP_TIMEOUT_MS = 5_000

// Ten short rows are ~2 KB; a body far bigger than that is not this contract.
const MAX_RESPONSE_CHARS = 64 * 1024
// dmglp_patients.hn is saved clipped to 40 characters (src/app/dmglp/staff/actions.ts). A
// longer id would be stored cut short — a wrong HN — so such a row is dropped.
const MAX_HN_CHARS = 40
const MAX_NAME_CHARS = 120
const MAX_PHONE_CHARS = 20

export interface PharmacyPatient {
  /** The pharmacy's patient id, e.g. "HN-2026-00012", or an HN imported from HIS. */
  hn: string
  /** The hospital HIS HN, when the pharmacy record was imported from HIS. */
  original_hn: number | null
  name: string
  /** Which of the requested numbers matched. */
  phone: string
}

export type PharmacyLookupFailure = 'not_configured' | 'unauthorized' | 'rate_limited' | 'unavailable' | 'bad_response'

export type PharmacyLookupResult =
  | { ok: true; patients: PharmacyPatient[] }
  | { ok: false; reason: PharmacyLookupFailure }

// What the staff patient forms get back from their server action
// (lookupPharmacyHn in src/app/dmglp/staff/actions.ts): each match carries the
// value that picking it puts into the HN input.
export type HnCandidate = PharmacyPatient & { fill: string }
export type HnLookupFailure = PharmacyLookupFailure | 'no_phone' | 'forbidden'
export type HnLookupResult =
  | { ok: true; patients: HnCandidate[] }
  | { ok: false; reason: HnLookupFailure }

// process.env, or a stand-in in tests. Reads PHARMACY_API_URL + PHARMACY_API_KEY.
export type PharmacyEnv = Record<string, string | undefined>

// ---------------------------------------------------------------------------
// Configuration

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

// Full lookup URL + key, or null when the lookup is off. The key travels in a
// header, so plain http is accepted only for a pharmacy running locally.
export function pharmacyConfig(env: PharmacyEnv = process.env): { url: string; key: string } | null {
  const base = (env.PHARMACY_API_URL ?? '').trim().replace(/\/+$/, '')
  const key = (env.PHARMACY_API_KEY ?? '').trim()
  if (!base || !key) return null
  let parsed: URL | null = null
  try {
    parsed = new URL(base)
  } catch {
    parsed = null
  }
  const local = parsed?.protocol === 'http:' && LOCAL_HOSTS.includes(parsed.hostname)
  if (parsed?.protocol !== 'https:' && !local) {
    // Set but unusable — say so, or "not connected" is all anyone sees.
    console.warn('[pharmacy] PHARMACY_API_URL must be an https URL (http only for localhost) — HN lookup is off')
    return null
  }
  return { url: `${base}${LOOKUP_PATH}`, key }
}

// ---------------------------------------------------------------------------
// Request: phone numbers

// The separators the pharmacy itself splits its free-text Patient.phone on, so
// "081-234-5678 / 089-999-9999" typed into one field becomes two numbers.
const PHONE_SEPARATORS = /[,;/|\n]+/

// Normalised (normalizeThaiPhone, shared with the webhook), invalid ones
// dropped, deduplicated, at most five — the contract's limit.
export function preparePhones(raw: readonly unknown[]): string[] {
  const out: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    for (const part of value.slice(0, 200).split(PHONE_SEPARATORS)) {
      const phone = normalizeThaiPhone(part)
      if (!phone || out.includes(phone)) continue
      out.push(phone)
      if (out.length === MAX_LOOKUP_PHONES) return out
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Response

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function parsePatient(item: unknown): PharmacyPatient | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const o = item as Record<string, unknown>

  // Identifiers are never clipped — a shortened HN is a different HN.
  const hn = typeof o.hn === 'string' ? o.hn.trim() : ''
  if (!hn || hn.length > MAX_HN_CHARS) return null

  let original_hn: number | null = null
  if (o.original_hn !== null && o.original_hn !== undefined) {
    const v = o.original_hn
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v <= 0) return null
    original_hn = v
  }

  const name = text(o.name, MAX_NAME_CHARS)
  const phone = text(o.phone, MAX_PHONE_CHARS)
  if (!name || !phone) return null

  // Built field by field: anything else the pharmacy might add is dropped.
  return { hn, original_hn, name, phone }
}

// The 200 body, checked strictly: not `{ patients: [...] }` → null (the whole
// answer is unusable); malformed rows dropped; a patient matched by two of the
// numbers listed once; at most ten rows.
export function parseLookupResponse(json: unknown): PharmacyPatient[] | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const list = (json as { patients?: unknown }).patients
  if (!Array.isArray(list)) return null
  const out: PharmacyPatient[] = []
  for (const item of list) {
    const patient = parsePatient(item)
    if (!patient || out.some(p => p.hn === patient.hn)) continue
    out.push(patient)
    if (out.length === MAX_LOOKUP_PATIENTS) break
  }
  return out
}

// What goes into dmglp_patients.hn when staff pick a match: the hospital HIS
// HN when the pharmacy has one, otherwise the pharmacy's own id.
export function hnForDmglp(p: PharmacyPatient): string {
  return p.original_hn !== null ? String(p.original_hn) : p.hn
}

// Non-2xx status → failure. A 400 means this side broke the contract and a
// 3xx (redirects are not followed — the key must not travel on) means a wrong
// base URL; both are configuration problems, reported as bad_response.
export function failureForStatus(status: number): PharmacyLookupFailure | null {
  if (status >= 200 && status < 300) return null
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 429) return 'rate_limited'
  if (status === 408 || status >= 500) return 'unavailable'
  return 'bad_response'
}

// ---------------------------------------------------------------------------
// The call

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : 'error'
}

// Logs carry the HTTP status or error name only — never a phone number, a
// name or an HN.
export async function lookupPharmacyPatients(
  phones: readonly string[],
  options: { env?: PharmacyEnv } = {},
): Promise<PharmacyLookupResult> {
  const config = pharmacyConfig(options.env)
  if (!config) return { ok: false, reason: 'not_configured' }
  const list = preparePhones(phones)
  if (list.length === 0) return { ok: true, patients: [] }

  let res: Response
  try {
    res = await fetch(config.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': config.key },
      body: JSON.stringify({ phones: list }),
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      redirect: 'manual',
      // Names and HNs must never land in Next's data cache.
      cache: 'no-store',
    })
  } catch (err) {
    console.warn(`[pharmacy] HN lookup failed: ${errorName(err)}`)
    return { ok: false, reason: 'unavailable' }
  }

  const failure = failureForStatus(res.status)
  if (failure) {
    console.warn(`[pharmacy] HN lookup failed: HTTP ${res.status} → ${failure}`)
    return { ok: false, reason: failure }
  }

  let body: string
  try {
    body = await res.text()
  } catch (err) {
    // The 5 s timeout also covers reading the body.
    console.warn(`[pharmacy] HN lookup failed reading the body: ${errorName(err)}`)
    return { ok: false, reason: 'unavailable' }
  }

  let json: unknown = null
  if (body.length <= MAX_RESPONSE_CHARS) {
    try {
      json = JSON.parse(body)
    } catch {
      json = null
    }
  }
  const patients = parseLookupResponse(json)
  if (!patients) {
    console.warn('[pharmacy] HN lookup failed: the response does not match the contract')
    return { ok: false, reason: 'bad_response' }
  }
  return { ok: true, patients }
}
