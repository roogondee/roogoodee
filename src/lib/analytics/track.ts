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
// advice_cta_line_click / advice_cta_call_click (AdviceContactCtas.tsx,
// placement="hero" | "sticky") are the same LINE/call action as
// advice_followup_*, just tapped before 3 chat messages instead of after —
// added for the Smart-campaign variant of /advice, where a visitor may want
// a human immediately rather than a chat. Same conversion action.
//
// The MOU landing (/foreign/mou) maps the same three contact actions —
// phone number left, call tapped, LINE tapped — from both its page form and
// its inline Q&A assistant. It shares `ads_conversion_Contact_Us_1` rather
// than getting its own action because that action already exists in the Ads
// account: a new action name here would fire into nothing until someone
// creates it in the UI. MOU performance is still readable on its own, since
// conversions attribute to the campaign that produced the click. Split it
// into a dedicated action only when MOU needs its own bidding target — see
// "foreign" in docs/pillar-google-ads.md.
//
// NOT mapped on that page, for the same engagement-vs-contact reason as
// /advice: mou_landing_view, mou_chat_view, mou_chat_question,
// mou_chat_no_match, mou_chat_lead_open (opening the callback form is not
// submitting it).
//
// workpermit_* (src/components/pages/ForeignWorkPermitClient.tsx,
// WorkPermitChat.tsx, WorkPermitLeadForm.tsx) is the dated
// /foreign/workpermit renewal campaign — same action, same reasoning.
// workpermit_chat_start is deliberately NOT mapped (engagement, not contact).
//
// If a visitor both leaves a phone number and taps LINE, this fires twice.
// The same goes for the call button on the MOU form's success screen, tapped
// seconds after the form itself converted. That is handled on the Google Ads
// side by setting the conversion action's Count to "One" per click, not by
// suppressing it here.
const ADS_CONVERSIONS: Record<string, string> = {
  advice_lead: 'ads_conversion_Contact_Us_1',
  advice_followup_call_click: 'ads_conversion_Contact_Us_1',
  advice_followup_line_click: 'ads_conversion_Contact_Us_1',
  advice_cta_call_click: 'ads_conversion_Contact_Us_1',
  advice_cta_line_click: 'ads_conversion_Contact_Us_1',
  mou_lead_submit: 'ads_conversion_Contact_Us_1',
  mou_chat_lead_submit: 'ads_conversion_Contact_Us_1',
  mou_call_click: 'ads_conversion_Contact_Us_1',
  mou_line_click: 'ads_conversion_Contact_Us_1',
  mou_chat_line_click: 'ads_conversion_Contact_Us_1',
  workpermit_lead: 'ads_conversion_Contact_Us_1',
  workpermit_chat_lead: 'ads_conversion_Contact_Us_1',
  workpermit_call_click: 'ads_conversion_Contact_Us_1',
  workpermit_line_click: 'ads_conversion_Contact_Us_1',
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
