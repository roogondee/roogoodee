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
