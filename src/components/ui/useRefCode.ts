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

export function useRefCode(program: RefProgram): { refCode: string | null; lineUrl: string } {
  const [state, setState] = useState<{ refCode: string | null; lineUrl: string }>({ refCode: null, lineUrl: LINE_OA_URL })

  useEffect(() => {
    let cancelled = false
    const key = `ref_${program}`
    try {
      const cached = sessionStorage.getItem(key)
      if (cached) {
        const c = JSON.parse(cached) as { ref_code: string; line_url: string }
        setState({ refCode: c.ref_code, lineUrl: c.line_url })
        return
      }
    } catch {}

    const q = new URLSearchParams(window.location.search)
    const gclidFromUrl = q.get('gclid')
    persistClickId('gclid', gclidFromUrl)
    const fbclid = q.get('fbclid')
    const body: Record<string, unknown> = {
      program,
      gclid: gclidFromUrl || readCookie('gclid'),
      // Meta's own cookie keeps the real click time; rebuild it from the URL
      // only when the (consent-gated) pixel has not set one.
      fbc: readCookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined),
      fbp: readCookie('_fbp'),
      consent: getConsent() === 'accepted',
      path: window.location.pathname + window.location.search.slice(0, 200),
    }
    for (const k of UTM_KEYS) { const v = q.get(k); if (v) body[k] = v }

    fetch('/api/ref', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { ref_code: string; line_url: string } | null) => {
        if (!d || cancelled) return
        setState({ refCode: d.ref_code, lineUrl: d.line_url })
        try { sessionStorage.setItem(key, JSON.stringify(d)) } catch {}
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [program])

  // The PDPA banner is often answered after the code exists.
  useEffect(() => {
    const refCode = state.refCode
    if (!refCode) return
    const onChange = (e: Event) => {
      const consent = (e as CustomEvent<ConsentValue>).detail === 'accepted'
      fetch('/api/ref', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: refCode, consent }),
      }).catch(() => undefined)
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [state.refCode])

  return state
}
