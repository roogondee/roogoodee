// Contract for events the W Medical systems push into roogondee.com.
//
// roogondee.com runs on its own Supabase project, while the hospital website
// (roogondee/wmedicalhospital), the pharmacy system (roogondee/wmedical-pharmacy)
// and the certificate site (roogondee/medicalcertificate) share the
// "wmedical" project. Nothing crossed that line before, so a lead who booked
// on the hospital site never reached the sales pipeline here, and a patient
// who actually came was only counted when someone remembered to redeem a
// voucher or drag the card to "visited". Full map: docs/system-integration.md.
//
// Transport: POST /api/integrations/wmedical, JSON body, header
//   x-wmh-signature: sha256=<hex HMAC-SHA256 of the raw body>
// — the format the hospital's lib/crm.ts already sends. Secret:
// WMEDICAL_WEBHOOK_SECRET here, CRM_WEBHOOK_SECRET on the sending side.
//
// Two events:
//   lead.created     (hospital) someone asked to be contacted — carries name
//                    and phone because sales has to call them.
//   visit.completed  (hospital, pharmacy) a patient was actually seen. Carries
//                    ONLY sha256 hashes of the phone number: roogondee may link
//                    it to a lead it already has, and learns nothing about
//                    patients who were never its leads. No diagnosis, drug or
//                    service ever travels in either event.
//
// Pure module (no DB, no Next imports) so `npm test` can run it directly.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const SIGNATURE_HEADER = 'x-wmh-signature'

// A visit is linked only to a lead created within this window — the same
// 90 days Google Ads accepts for an offline click conversion.
export const VISIT_MATCH_WINDOW_DAYS = 90

export const LEAD_TYPES = ['booking', 'group_booking', 'follow_up', 'subscriber'] as const
export type WmhLeadType = (typeof LEAD_TYPES)[number]

export const VISIT_SYSTEMS = ['hospital', 'pharmacy'] as const
export type WmhVisitSystem = (typeof VISIT_SYSTEMS)[number]

export interface WmhAttribution {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  fbclid?: string
  gclid?: string
}

export interface WmhLeadCreated {
  event: 'lead.created'
  created_at: string | null
  /** The hospital's own channel label (Facebook / LINE / Google / …). */
  channel: string | null
  type: WmhLeadType
  id: string | null
  name: string
  phone: string
  lang: string | null
  company: string | null
  service: string | null
  attribution: WmhAttribution
  marketing_consent: boolean
}

export interface WmhVisitCompleted {
  event: 'visit.completed'
  created_at: string | null
  system: WmhVisitSystem
  /** booking | group_booking | dispense — only used for the idempotency key. */
  type: string
  id: string
  phone_sha256: string[]
}

export type WmhEvent = WmhLeadCreated | WmhVisitCompleted

// ---------------------------------------------------------------------------
// Signature

export function signBody(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

export function verifySignature(body: string, header: string | null, secret: string): boolean {
  if (!secret || !header) return false
  const expected = Buffer.from(signBody(body, secret))
  const given = Buffer.from(header.trim())
  return expected.length === given.length && timingSafeEqual(expected, given)
}

// ---------------------------------------------------------------------------
// Phone numbers
//
// Same rule as public.normalize_th_phone in both Supabase projects:
// digits only, "+66 81-234-5678" → "0812345678". A result that is not a Thai
// number (0 + 8 or 9 digits) has no hash — bot leads keep a platform user id
// in `phone`, and those must never match anything.

export function normalizeThaiPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^0-9]/g, '').replace(/^66([0-9]{8,9})$/, '0$1')
  return /^0[0-9]{8,9}$/.test(digits) ? digits : null
}

// Must equal public.th_phone_sha256() (migration add_phone_sha256_to_leads.sql),
// which fills leads.phone_sha256.
export function phoneSha256(raw: string | null | undefined): string | null {
  const phone = normalizeThaiPhone(raw)
  return phone ? createHash('sha256').update(phone).digest('hex') : null
}

// ---------------------------------------------------------------------------
// Parsing — the endpoint is public, so every field is checked and clipped.

type Parsed = { ok: true; event: WmhEvent } | { ok: false; error: string; ignorable?: boolean }

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'] as const
const HASH_RE = /^[0-9a-f]{64}$/

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function isoOrNull(value: unknown): string | null {
  const s = str(value, 40)
  return s && !Number.isNaN(Date.parse(s)) ? s : null
}

export function parseEvent(input: unknown): Parsed {
  if (!input || typeof input !== 'object') return { ok: false, error: 'body must be a JSON object' }
  const o = input as Record<string, unknown>

  if (o.event === 'lead.created') {
    const type = o.type as WmhLeadType
    if (!LEAD_TYPES.includes(type)) return { ok: false, error: 'unknown lead type' }
    const name = str(o.name, 120)
    const phone = str(o.phone, 40)
    if (!name || !phone) return { ok: false, error: 'name and phone are required' }
    const attribution: WmhAttribution = {}
    if (o.attribution && typeof o.attribution === 'object') {
      const a = o.attribution as Record<string, unknown>
      for (const key of ATTRIBUTION_KEYS) {
        const v = str(a[key], 200)
        if (v) attribution[key] = v
      }
    }
    return {
      ok: true,
      event: {
        event: 'lead.created',
        created_at: isoOrNull(o.created_at),
        channel: str(o.source, 40),
        type,
        id: str(o.id, 64),
        name,
        phone,
        lang: str(o.lang, 8),
        company: str(o.company, 200),
        service: str(o.service, 40),
        attribution,
        marketing_consent: o.marketing_consent === true,
      },
    }
  }

  if (o.event === 'visit.completed') {
    const system = o.system as WmhVisitSystem
    if (!VISIT_SYSTEMS.includes(system)) return { ok: false, error: 'unknown system' }
    const type = str(o.type, 32)
    const id = str(o.id, 64)
    if (!type || !id) return { ok: false, error: 'type and id are required' }
    const hashes = Array.isArray(o.phone_sha256) ? o.phone_sha256 : []
    const phone_sha256 = Array.from(new Set(hashes.filter((h): h is string => typeof h === 'string' && HASH_RE.test(h)))).slice(0, 5)
    if (phone_sha256.length === 0) return { ok: false, error: 'phone_sha256 must hold at least one sha256 hex digest' }
    return {
      ok: true,
      event: { event: 'visit.completed', created_at: isoOrNull(o.created_at), system, type, id, phone_sha256 },
    }
  }

  // A newer sender may know events this side doesn't yet — acknowledge them
  // so it doesn't log a failure for every one.
  return { ok: false, error: 'unknown event', ignorable: typeof o.event === 'string' }
}

// One row per delivered event in processed_webhook_events. Events without an
// id (newsletter and follow-up sign-ups) can't be deduplicated — the senders
// don't retry, so that only matters if someone replays a request by hand.
export function idempotencyKey(e: WmhEvent): string | null {
  if (e.event === 'lead.created') return e.id ? `wmedical:lead.created:${e.type}:${e.id}` : null
  return `wmedical:visit.completed:${e.system}:${e.type}:${e.id}`
}

// ---------------------------------------------------------------------------
// Mapping a hospital lead onto roogondee's leads table

export const LEAD_SOURCES: Record<WmhLeadType, string> = {
  booking: 'wmh-booking',
  group_booking: 'wmh-group-booking',
  follow_up: 'wmh-follow-up',
  subscriber: 'wmh-subscriber',
}

const TYPE_LABELS: Record<WmhLeadType, string> = {
  booking: 'จองนัดหมอ',
  group_booking: 'จองตรวจสุขภาพแรงงานแบบกลุ่ม (MOU)',
  follow_up: 'ขอให้ติดตามอาการ',
  subscriber: 'สมัครรับข่าวสาร',
}

// What the hospital booking form calls its services (lib/booking.ts there).
const HOSPITAL_SERVICE_LABELS: Record<string, string> = {
  general: 'ตรวจทั่วไป',
  teleconsult: 'ปรึกษาแพทย์ออนไลน์',
  checkup: 'ตรวจสุขภาพ',
  acupuncture: 'ฝังเข็ม',
}

// Short label for the sales LINE group and the lead's source column.
export function typeLabel(type: WmhLeadType): string {
  return TYPE_LABELS[type]
}

// Group bookings are migrant-worker screening for an employer — the
// `foreign` pillar. Everything else on the hospital site is general care.
export function leadService(e: WmhLeadCreated): string {
  return e.type === 'group_booking' ? 'foreign' : 'general'
}

// Ref in square brackets so a repeated delivery can be spotted in the
// activity timeline of a lead the event was merged into.
export function eventRef(e: WmhLeadCreated): string | null {
  return e.id ? `[wmh:${e.type}:${e.id}]` : null
}

// One line for people: what they asked for, where they came from.
export function leadSummary(e: WmhLeadCreated): string {
  const parts = [`เว็บโรงพยาบาล W Medical — ${TYPE_LABELS[e.type]}`]
  if (e.service) parts.push(`บริการ: ${HOSPITAL_SERVICE_LABELS[e.service] ?? e.service}`)
  if (e.company) parts.push(`บริษัท: ${e.company}`)
  if (e.channel) parts.push(`ช่องทาง: ${e.channel}`)
  if (e.lang && e.lang !== 'th') parts.push(`ภาษา: ${e.lang}`)
  if (!e.marketing_consent) parts.push('ไม่ได้ยินยอมรับข่าวสารการตลาด')
  return parts.join(' | ')
}

// What is stored on the lead / its timeline: the summary plus the event ref.
export function leadNote(e: WmhLeadCreated): string {
  const ref = eventRef(e)
  return ref ? `${leadSummary(e)} | ${ref}` : leadSummary(e)
}

export interface LeadInsert {
  service: string
  first_name: string
  phone: string
  company: string | null
  note: string
  source: string
  status: string
  consent_pdpa: boolean
  consent_at: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  gclid: string | null
  fbc: string | null
}

export function leadInsert(e: WmhLeadCreated, now: Date = new Date()): LeadInsert {
  const a = e.attribution
  const at = e.created_at ?? now.toISOString()
  return {
    service: leadService(e),
    first_name: e.name,
    phone: e.phone,
    company: e.company,
    note: leadNote(e),
    source: LEAD_SOURCES[e.type],
    // A booking is already an appointment; the other types still need a call.
    status: e.type === 'booking' ? 'booked' : 'new',
    // Only the newsletter sign-up carries marketing consent on the hospital
    // side. Without it the lead is never reported to an ad platform
    // (markLeadVisited checks consent_pdpa before Meta CAPI).
    consent_pdpa: e.marketing_consent,
    consent_at: e.marketing_consent ? at : null,
    utm_source: a.utm_source ?? null,
    utm_medium: a.utm_medium ?? null,
    utm_campaign: a.utm_campaign ?? null,
    gclid: a.gclid ?? null,
    // Meta's click-id cookie format, rebuilt from the fbclid the hospital
    // site captured: fb.1.<ms when the click was seen>.<fbclid>.
    fbc: a.fbclid ? `fb.1.${Date.parse(at)}.${a.fbclid}` : null,
  }
}

// Pipeline stages a hospital event may move a lead forward from. Anything
// later (visited/customer/legacy converted) is left alone.
export const BOOKABLE_STATUSES = ['new', 'contacted', 'qualified', 'lost']
export const VISITABLE_STATUSES = ['new', 'contacted', 'qualified', 'booked', 'lost']

export function visitActivityBody(e: WmhVisitCompleted): string {
  const from = e.system === 'pharmacy' ? 'ระบบห้องยา' : 'ระบบนัดหมายโรงพยาบาล'
  return `มาที่ W Medical แล้ว — ยืนยันอัตโนมัติจาก${from} [wmh:${e.system}:${e.type}:${e.id}]`
}
