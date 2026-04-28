export const CONSENT_KEY = 'pdpa_consent'
export const CONSENT_AT_KEY = 'pdpa_consent_at'
export const CONSENT_EVENT = 'pdpa:consent-change'

export type ConsentValue = 'accepted' | 'declined'

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(CONSENT_KEY)
  return v === 'accepted' || v === 'declined' ? v : null
}

export function setConsent(v: ConsentValue) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONSENT_KEY, v)
  window.localStorage.setItem(CONSENT_AT_KEY, new Date().toISOString())
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: v }))
}

export function hasConsent(): boolean {
  return getConsent() === 'accepted'
}
