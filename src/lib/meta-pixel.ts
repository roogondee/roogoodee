// Browser-side helper for Meta Pixel + Conversions API double-write.
//
// Pairs a `fbq('track', name, props, { eventID })` call with a POST to
// /api/track/conversion using the same event_id, so Meta dedupes the two
// when both arrive. PDPA consent is checked first via `hasConsent`.
//
// The base Pixel (`fbq('init', …)`) is loaded by `Pixels.tsx`; this file
// only fires events. If consent has not been granted, every call is a
// no-op (no Pixel call AND no CAPI call) — the same gate that protects
// the rest of the analytics stack.
//
// IMPORTANT — health & wellness compliance: never pass drug names, BMI,
// weight, or other clinical fields in `customData`. Use service tier
// codes (tier_1/2/3) and anonymized content categories instead.

import { hasConsent } from '@/lib/analytics/consent'

declare global {
  interface Window {
    fbq?: (
      command: 'track' | 'trackCustom',
      name: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string },
    ) => void
  }
}

export function generateEventId(prefix = 'evt'): string {
  const rand = Math.random().toString(36).slice(2, 11)
  return `${prefix}_${Date.now()}_${rand}`
}

export interface MetaUserDataInput {
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  external_id?: string
}

export interface TrackMetaOptions {
  eventName: string
  customData?: Record<string, unknown>
  userData?: MetaUserDataInput
  // Stable id shared between Pixel and CAPI for dedup. If omitted, one is
  // generated; pass an explicit id (e.g. voucher.code) when you want the
  // server-side CAPI fired by your own backend to dedupe with this call.
  eventId?: string
  service?: string
  // 'track' for Meta standard events (Lead/Purchase/etc.), 'trackCustom'
  // for everything else.
  kind?: 'track' | 'trackCustom'
}

/**
 * Fires the same conversion event to (a) the in-page Pixel and (b) our
 * /api/track/conversion endpoint, both with the same eventID for dedup.
 * Returns the eventId so callers that want to chain a same-event server
 * call (e.g. /api/quiz issuing a voucher) can reuse it.
 */
export async function trackMetaEvent({
  eventName,
  customData = {},
  userData = {},
  eventId,
  service,
  kind = 'track',
}: TrackMetaOptions): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!hasConsent()) return null

  const id = eventId ?? generateEventId(eventName.toLowerCase())

  try {
    window.fbq?.(kind, eventName, customData, { eventID: id })
  } catch {
    // pixel script not loaded yet — server-side CAPI will still fire below
  }

  try {
    await fetch('/api/track/conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: id,
        event_source_url: window.location.href,
        service,
        user: userData,
        custom_data: customData,
      }),
      keepalive: true,
    })
  } catch (err) {
    // CAPI failure is non-fatal — the browser Pixel above already fired.
    console.error('[meta-pixel] CAPI relay failed', err)
  }

  return id
}
