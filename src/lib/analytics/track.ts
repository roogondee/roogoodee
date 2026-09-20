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
  healthprogram_lead: 'ads_conversion_Contact_Us_1',
  healthprogram_call_click: 'ads_conversion_Contact_Us_1',
  healthprogram_line_click: 'ads_conversion_Contact_Us_1',
}

// Deliberately NOT mapped above, and the omission is the point:
// `healthprogram_entry_click` is a click on an internal link from /foreign —
// mapping it would count a scroll as a Contact and teach Smart Bidding to buy
// pageviews. `healthprogram_advice_click` hands the visitor to /advice, which
// fires its own advice_* conversions downstream; mapping the hand-off too
// would count the same person twice before any contact happened.

// Meta standard events, keyed by the internal event that means the same thing.
//
// track() only ever called fbq('trackCustom', …), so every contact from these
// pages arrived in Meta as a custom event named e.g. `workpermit_line_click`.
// Custom events carry no value and are not what Meta's Lead/Contact
// optimisation bids on, so a campaign could run perfectly and still look like
// it produced nothing. Mapping them to the standard events — alongside, not
// instead of, the existing custom ones so reporting built on those keeps
// working — fixes that without touching a single call site.
//
// `value` is a relative weight telling Meta which contacts matter more, not
// revenue: a submitted form outranks a tapped phone number, which outranks a
// tapped LINE button. Replace with real per-lead economics when we have them.
const META_STANDARD_EVENTS: Record<string, { event: string; value: number; contentName: string }> = {
  workpermit_lead: { event: 'Lead', value: 300, contentName: 'workpermit_form' },
  workpermit_chat_lead: { event: 'Lead', value: 300, contentName: 'workpermit_chat' },
  workpermit_call_click: { event: 'Contact', value: 200, contentName: 'phone_click' },
  workpermit_line_click: { event: 'Contact', value: 150, contentName: 'line_click' },
  // A health-program enquiry covers a whole workforce for a year, where a
  // work-permit lead is one worker's one visit — hence 500 against 300. The
  // call/LINE weights stay identical to the workpermit pair on purpose, so
  // the channel ranking stays comparable across the whole foreign pillar.
  // Changing these rewrites bidding history; do not "normalise" them.
  healthprogram_lead: { event: 'Lead', value: 500, contentName: 'health_program_form' },
  healthprogram_call_click: { event: 'Contact', value: 200, contentName: 'phone_click' },
  healthprogram_line_click: { event: 'Contact', value: 150, contentName: 'line_click' },
}

// Meta's pixel is consent-gated (src/components/analytics/Pixels.tsx): window.fbq
// simply does not exist until the PDPA banner is accepted, and track()'s
// optional chaining meant anything fired before that vanished with no trace —
// including the clicks of a visitor who taps Accept a second later. Holding
// them here and replaying once fbq installs recovers those without sending
// anything before consent, which is the part PDPA actually cares about.
type QueuedEvent = { name: string; params: Record<string, unknown> }
const pendingMetaEvents: QueuedEvent[] = []
const MAX_PENDING_META_EVENTS = 20

function sendToMeta({ name, params }: QueuedEvent) {
  try { window.fbq?.('trackCustom', name, params) } catch {}

  const standard = META_STANDARD_EVENTS[name]
  if (!standard) return
  try {
    window.fbq?.('track', standard.event, {
      ...params,
      value: standard.value,
      currency: 'THB',
      content_name: standard.contentName,
    })
  } catch {}
}

// Called by Pixels.tsx once the Meta snippet has installed window.fbq.
export function flushPendingMetaEvents() {
  if (typeof window === 'undefined' || !window.fbq) return
  while (pendingMetaEvents.length) sendToMeta(pendingMetaEvents.shift()!)
}

export function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', name, params) } catch {}

  if (window.fbq) {
    flushPendingMetaEvents()
    sendToMeta({ name, params })
  } else if (pendingMetaEvents.length < MAX_PENDING_META_EVENTS) {
    pendingMetaEvents.push({ name, params })
  }

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

// Lived in WorkPermitLeadForm.tsx, which meant HomeWorkPermitHero pulled the
// entire lead form — fields, validation, success screen — into the homepage
// bundle just to get these two lines.
export function trackWorkPermitCallClick(position: string) {
  track('workpermit_call_click', { service: 'foreign', position })
}

export function trackWorkPermitLineClick(position: string) {
  track('workpermit_line_click', { service: 'foreign', position })
}

// Same hoisting reason as the pair above: ForeignClient's entry card and the
// health-program sticky bar fire these without importing the lead form.
export function trackHealthProgramCallClick(position: string) {
  track('healthprogram_call_click', { service: 'foreign', position })
}

export function trackHealthProgramLineClick(position: string) {
  track('healthprogram_line_click', { service: 'foreign', position })
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
