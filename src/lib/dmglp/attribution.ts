// Landing-page attribution (§4.9): the landing page creates a short ref
// code, the LINE button pre-fills a message carrying it, and the LINE
// webhook links the first message back to the click. Only gclid + timestamp
// + conversion name ever leave for Google Ads.

import { LINE_OA_ID, REF_CODE_PREFIX } from './config.ts'

// DM-4821 — four digits is enough for a program of this size and is easy to
// read back over the phone; collisions are handled by retrying the insert.
export function generateRefCode(rand: () => number = Math.random): string {
  const n = Math.floor(rand() * 9000) + 1000
  return `${REF_CODE_PREFIX}-${n}`
}

const REF_RE = new RegExp(`\\b${REF_CODE_PREFIX}-(\\d{4})\\b`, 'i')

// Finds a ref code anywhere in a chat message ("สนใจคลินิกเบาหวาน (DM-4821)").
export function parseRefCode(text: string | null | undefined): string | null {
  if (!text) return null
  const m = REF_RE.exec(text)
  return m ? `${REF_CODE_PREFIX}-${m[1]}` : null
}

export const LINE_PREFILL_TEXT = 'สนใจคลินิกเบาหวาน'

// https://line.me/R/oaMessage/@roogondee/?<urlencoded text (DM-4821)>
export function lineDeepLink(refCode: string, oaId: string = LINE_OA_ID): string {
  const text = `${LINE_PREFILL_TEXT} (${refCode})`
  return `https://line.me/R/oaMessage/${encodeURIComponent(oaId)}/?${encodeURIComponent(text)}`
}

export type Channel = 'google' | 'facebook' | 'tiktok' | 'line' | 'partner' | 'factory' | 'walkin' | 'direct' | 'other'

// Channel from what the URL carried — gclid means Google whatever utm says.
export function detectChannel(params: { gclid?: string | null; utm_source?: string | null; ref?: string | null }): Channel {
  if (params.gclid) return 'google'
  const src = (params.utm_source || '').toLowerCase()
  if (params.ref) return 'partner'
  if (!src) return 'direct'
  if (src.includes('google')) return 'google'
  if (src.includes('facebook') || src.includes('fb') || src.includes('meta') || src.includes('ig')) return 'facebook'
  if (src.includes('tiktok')) return 'tiktok'
  if (src.includes('line')) return 'line'
  return 'other'
}
