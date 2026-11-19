export const CONSENT_EVENT = 'pdpa:consent-change'
export type ConsentValue = 'accepted' | 'declined'

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  const choice = (window as Window & {
    jiaConsent?: { analytics?: boolean; marketing?: boolean } | null
  }).jiaConsent
  if (!choice) return null
  return choice.analytics || choice.marketing ? 'accepted' : 'declined'
}

export function hasConsent(): boolean {
  return getConsent() === 'accepted'
}
