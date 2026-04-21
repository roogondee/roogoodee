'use client'
import { hasConsent } from './consent'

export type StandardEvent =
  | 'PageView'
  | 'Lead'
  | 'Contact'
  | 'InitiateChat'
  | 'ViewContent'
  | 'SubmitApplication'
  | 'ClickLINE'
  | 'ClickCall'

type Params = Record<string, unknown>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    fbq?: (...args: unknown[]) => void
    ttq?: {
      track: (event: string, params?: Params) => void
      page: () => void
      load?: (id: string) => void
      instance?: (id: string) => unknown
    }
    _lt?: (...args: unknown[]) => void
  }
}

const GA_EVENT_MAP: Record<StandardEvent, string> = {
  PageView: 'page_view',
  Lead: 'generate_lead',
  Contact: 'contact',
  InitiateChat: 'begin_checkout',
  ViewContent: 'select_content',
  SubmitApplication: 'submit_application',
  ClickLINE: 'click_line',
  ClickCall: 'click_call',
}

export function track(event: StandardEvent, params: Params = {}) {
  if (typeof window === 'undefined') return
  if (!hasConsent()) return

  // GTM dataLayer (captures everything upstream; lets GTM fan out if configured)
  window.dataLayer?.push({ event, ...params })

  // GA4
  window.gtag?.('event', GA_EVENT_MAP[event] ?? event, params)

  // Meta Pixel — uses Meta's standard event names directly
  if (event !== 'PageView') {
    window.fbq?.('track', event === 'ClickLINE' || event === 'ClickCall' ? 'Contact' : event, params)
  }

  // TikTok Pixel
  window.ttq?.track(event === 'Lead' ? 'SubmitForm' : event, params)

  // LINE Tag — conversion event
  window._lt?.('send', 'cv', { type: event }, [])
}

export function trackPageView(url: string) {
  if (typeof window === 'undefined') return
  if (!hasConsent()) return

  window.dataLayer?.push({ event: 'page_view', page_path: url })
  window.gtag?.('event', 'page_view', { page_path: url })
  window.fbq?.('track', 'PageView')
  window.ttq?.page()
  window._lt?.('send', 'pv', {})
}
