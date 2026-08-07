// Shared client-side LIFF SDK surface. The SDK is loaded from LINE's CDN via
// next/script (no npm dep) — these types cover only the calls we use.
// The window.liff global is declared once here; every LIFF page imports from
// this module instead of redeclaring it.

export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export interface LiffSDK {
  init: (config: { liffId: string }) => Promise<void>
  isLoggedIn: () => boolean
  isInClient: () => boolean
  getProfile: () => Promise<LiffProfile>
  getIDToken: () => string | null
  closeWindow: () => void
}

declare global {
  interface Window {
    liff?: LiffSDK
  }
}

export const LIFF_SDK_URL = 'https://static.line-scdn.net/liff/edge/2/sdk.js'

// Identity handed to QuizRunner by the LIFF wrapper. idToken null = SDK
// unavailable / not logged in → the quiz falls back to the session-based
// claim flow unchanged.
export interface LiffIdentity {
  idToken: string | null
  displayName: string | null
  inClient: boolean
  close?: () => void
}
