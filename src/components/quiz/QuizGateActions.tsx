'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Service } from '@/types'
import { readAttribution } from '@/lib/analytics/track'

// Interactive island of the LINE gate: campaign passthrough + pixel events.
//
// Deliberately reads window.location.search in an effect instead of
// useSearchParams — the latter opts the whole route out of static
// prerendering, which would leave ad traffic (and Google) looking at an empty
// page. The button ships with a working href and only gains utm params after
// hydration.

const PHONE_DISPLAY = '081-902-3540'
const PHONE_TEL = 'tel:0819023540'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const

function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', name, params) } catch {}
  try { window.fbq?.('trackCustom', name, params) } catch {}
  try { window.ttq?.track(name, params) } catch {}
}

export default function QuizGateActions({
  service, baseHref, dark,
}: { service: Service; baseHref: string; dark?: boolean }) {
  const [href, setHref] = useState(baseHref)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    track('quiz_gate_view', { service })

    // Carry the visitor's attribution into LINE so the lead created inside
    // LIFF still reports the ad / article that brought them in.
    //
    // utm answers "which campaign", the click ids answer "which click" — and
    // only the latter lets the Conversions API attribute the lead back to the
    // ad that paid for it. They have to ride the URL: the LIFF quiz opens in
    // LINE's in-app browser, which cannot see cookies set here.
    try {
      const here = new URLSearchParams(window.location.search)
      const url = new URL(baseHref)
      let changed = false
      for (const k of UTM_KEYS) {
        const v = here.get(k)
        if (v) { url.searchParams.set(k, v); changed = true }
      }
      for (const [k, v] of Object.entries(readAttribution())) {
        url.searchParams.set(k, v)
        changed = true
      }
      if (changed) setHref(url.toString())
    } catch {}
  }, [service, baseHref])

  const onStart = () => {
    track('quiz_gate_line_click', { service })
    try { window.fbq?.('track', 'Contact', { content_category: service }) } catch {}
    try { window.ttq?.track('Contact', { content_id: `quiz-${service}`, content_type: 'lead' }) } catch {}
  }

  return (
    <>
      <a
        href={href}
        target="_blank" rel="noopener noreferrer"
        onClick={onStart}
        className="block text-center bg-[#06C755] text-white py-4 rounded-full font-bold text-base mb-2 hover:bg-[#00B04B] transition-all shadow-lg"
      >
        💬 เพิ่มเพื่อน LINE แล้วเริ่มประเมิน
      </a>
      <p className={`text-xs text-center mb-5 ${dark ? 'text-white/40' : 'text-muted'}`}>
        ข้อมูลของคุณอยู่ในแชทส่วนตัว ไม่เปิดเผยกับใคร •{' '}
        <Link href="/privacy" target="_blank" className="underline">นโยบาย PDPA</Link>
      </p>
      <a
        href={PHONE_TEL}
        onClick={() => track('quiz_gate_call_click', { service })}
        className={`block text-center py-3 rounded-full font-semibold text-sm border-2 transition-all ${dark ? 'border-mint/40 text-mint hover:bg-mint/10' : 'border-forest/30 text-forest hover:bg-mint/10'}`}
      >
        📞 ไม่สะดวกใช้ LINE? โทร {PHONE_DISPLAY}
      </a>
    </>
  )
}
