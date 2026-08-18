// Shared client-side analytics helpers — fan out to GA4, Meta Pixel, TikTok.
// Extracted from the QuizRunner pattern so non-quiz pages (e.g. the MOU ads
// landing) can fire the same events without duplicating the globals.
import type { ReadonlyURLSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void
    fbq?: (command: 'track' | 'trackCustom', name: string, params?: Record<string, unknown>, options?: { eventID?: string }) => void
    ttq?: {
      track: (name: string, params?: Record<string, unknown>, options?: { event_id?: string }) => void
      page?: () => void
      identify?: (params: Record<string, unknown>) => void
    }
  }
}

// Google Ads conversion events, keyed by the internal event that means the
// conversion actually happened.
//
// Google Ads' setup screen tells you to paste the gtag('event',
// 'ads_conversion_…') snippet into <head> "right after the Google tag". Do
// NOT do that here: in <head> it runs on every page load, so every pageview
// — the 404, the blog, someone bouncing in two seconds — would be reported
// as a Contact. Smart Bidding would then optimise toward pageviews. The
// snippet belongs at the moment the conversion occurs, which is what this
// map does: `track()` fires the paired Ads event whenever the real event
// fires, so no call site has to know Google Ads exists.
//
// Deliberately NOT mapped:
// - advice_1669_call_click — that is someone calling emergency services.
//   Counting a medical emergency as an ad conversion is both wrong and would
//   teach bidding to chase emergencies.
// - advice_start / advice_message / advice_assessment — engagement, not
//   contact. See docs/advice-google-ads.md for why those must never become
//   conversions.
//
// If a visitor both leaves a phone number and taps LINE, this fires twice.
// That is handled on the Google Ads side by setting the conversion action's
// Count to "One" per click, not by suppressing it here.
const ADS_CONVERSIONS: Record<string, string> = {
  advice_lead: 'ads_conversion_Contact_Us_1',
  advice_followup_call_click: 'ads_conversion_Contact_Us_1',
  advice_followup_line_click: 'ads_conversion_Contact_Us_1',
}

export function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', name, params) } catch {}
  try { window.fbq?.('trackCustom', name, params) } catch {}
  try { window.ttq?.track(name, params) } catch {}

  // Reaches Google Ads only once the tag carries an AW- destination — either
  // NEXT_PUBLIC_GOOGLE_ADS_ID in src/app/layout.tsx or the Ads account
  // sharing the Google tag. Consent Mode still gates it: ad_storage is
  // denied until the PDPA banner is accepted, so conversions under-report.
  const adsEvent = ADS_CONVERSIONS[name]
  if (adsEvent) {
    try { window.gtag?.('event', adsEvent, params) } catch {}
  }
}

export function readUtm(searchParams: ReadonlyURLSearchParams | null) {
  return {
    utm_source:   searchParams?.get('utm_source')   || undefined,
    utm_medium:   searchParams?.get('utm_medium')   || undefined,
    utm_campaign: searchParams?.get('utm_campaign') || undefined,
  }
}

export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

// Persist a click id (e.g. ttclid) from the landing URL into a 30-day cookie
// so it survives until form submit.
export function persistClickId(name: string, value: string | null | undefined) {
  if (!value || typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`
}
