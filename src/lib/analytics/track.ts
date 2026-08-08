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

export function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', name, params) } catch {}
  try { window.fbq?.('trackCustom', name, params) } catch {}
  try { window.ttq?.track(name, params) } catch {}
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

// Meta's click id has to be reshaped into `fb.<subdomainIndex>.<clickTimeMs>.<fbclid>`
// before the Conversions API will match it. We build it ourselves at the landing
// page rather than reading the `_fbc` cookie, because the cookie only exists once
// a pixel id is configured — and it never crosses into the LINE in-app browser
// where the conversion now happens.
//
// subdomainIndex 1 = the cookie's domain is `roogondee.com` ('com' would be 0,
// 'www.roogondee.com' 2). Meta's own pixel writes 1 for an apex-domain cookie.
const FBC_SUBDOMAIN_INDEX = 1

export function buildFbc(fbclid: string | null | undefined, nowMs = Date.now()): string | undefined {
  if (!fbclid) return undefined
  return `fb.${FBC_SUBDOMAIN_INDEX}.${nowMs}.${fbclid}`
}

// Click ids + browser ids carried from the ad landing page into the LINE funnel.
//
// These MUST travel as URL params. The LIFF quiz renders inside LINE's in-app
// browser, which has its own cookie jar — anything stored as a cookie on the
// gate page in Chrome/Safari is invisible by the time the lead is created, so
// a cookie-only approach silently loses every paid click.
/**
 * Collect attribution ids from the current page: click ids come from the URL
 * (`fbclid` / `ttclid`), browser ids from the first-party cookies the pixels set.
 * Already-forwarded `fbc` in the URL wins, so a second hop does not restamp the
 * click time.
 */
export function readAttribution(search?: string): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(search ?? window.location.search)
  const out: Record<string, string> = {}

  const fbc = params.get('fbc') || buildFbc(params.get('fbclid')) || readCookie('_fbc')
  if (fbc) out.fbc = fbc

  const fbp = params.get('fbp') || readCookie('_fbp')
  if (fbp) out.fbp = fbp

  const ttclid = params.get('ttclid') || readCookie('ttclid')
  if (ttclid) out.ttclid = ttclid

  const ttp = params.get('ttp') || readCookie('_ttp')
  if (ttp) out.ttp = ttp

  return out
}
