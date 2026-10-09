'use client'
import { useEffect, useState } from 'react'
import { CONSENT_EVENT, getConsent, type ConsentValue } from '@/lib/analytics/consent'
import { persistClickId, readCookie } from '@/lib/analytics/track'
import { LINE_OA_URL } from '@/lib/liff-links'
import type { RefProgram } from '@/lib/refcodes'

// Mints this visit's website ref code (MC-xxxxx / CL-xxxxx) once per tab
// session and returns it with a LINE link that pre-fills it. Until the code
// arrives (or if minting fails) the LINE link is the plain OA link, so every
// button works from the first paint. See src/lib/growth/ref-visits.ts.

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

// What this tab remembers about the code it minted. gclid and consent are
// kept so a later ad click or banner answer can be told apart from what the
// code was minted with.
interface CachedRef { ref_code: string; line_url: string; gclid?: string | null; consent?: boolean }

function readCache(key: string): CachedRef | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CachedRef) : null
  } catch { return null }
}
function writeCache(key: string, c: CachedRef) {
  try { sessionStorage.setItem(key, JSON.stringify(c)) } catch {}
}

export function useRefCode(program: RefProgram): { refCode: string | null; lineUrl: string } {
  const [state, setState] = useState<{ refCode: string | null; lineUrl: string }>({ refCode: null, lineUrl: LINE_OA_URL })

  useEffect(() => {
    let cancelled = false
    const key = `ref_${program}`
    const q = new URLSearchParams(window.location.search)
    const gclidFromUrl = q.get('gclid')

    // Reuse this tab's code — unless an ad click has arrived since it was
    // minted (organic visit, then a Google ad in the same tab): that visit
    // needs its own code, or it could never be reported to Google.
    const cached = readCache(key)
    if (cached && !(gclidFromUrl && cached.gclid !== gclidFromUrl)) {
      setState({ refCode: cached.ref_code, lineUrl: cached.line_url })
      return
    }
    persistClickId('gclid', gclidFromUrl)
    const fbclid = q.get('fbclid')
    const consentAtMint = getConsent() === 'accepted'
    const gclid = gclidFromUrl || readCookie('gclid')
    const body: Record<string, unknown> = {
      program,
      gclid,
      // Meta's own cookie keeps the real click time; rebuild it from the URL
      // only when the (consent-gated) pixel has not set one.
      fbc: readCookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined),
      fbp: readCookie('_fbp'),
      consent: consentAtMint,
      path: window.location.pathname + window.location.search.slice(0, 200),
    }
    for (const k of UTM_KEYS) { const v = q.get(k); if (v) body[k] = v }

    fetch('/api/ref', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { ref_code: string; line_url: string } | null) => {
        if (!d || cancelled) return
        setState({ refCode: d.ref_code, lineUrl: d.line_url })
        writeCache(key, { ...d, gclid, consent: consentAtMint })
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [program])

  // The PDPA banner is often answered after the code exists — or before the
  // mint request came back, or on another page of this tab. Sync once when
  // the code appears (if the answer now differs from what it was minted
  // with), then on every later answer.
  useEffect(() => {
    const refCode = state.refCode
    if (!refCode) return
    const key = `ref_${program}`
    const send = (consent: boolean) => {
      fetch('/api/ref', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: refCode, consent }),
      }).catch(() => undefined)
      const c = readCache(key)
      if (c) writeCache(key, { ...c, consent })
    }
    const now = getConsent() === 'accepted'
    const cached = readCache(key)
    if (cached && cached.ref_code === refCode && cached.consent !== undefined && cached.consent !== now) send(now)

    const onChange = (e: Event) => send((e as CustomEvent<ConsentValue>).detail === 'accepted')
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [state.refCode, program])

  return state
}
