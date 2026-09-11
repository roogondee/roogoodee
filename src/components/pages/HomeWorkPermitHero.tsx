'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import WorkPermitChat from '@/components/ui/WorkPermitChat'
import { trackWorkPermitCallClick, trackWorkPermitLineClick } from '@/components/ui/WorkPermitLeadForm'

// Campaign hero for the homepage while the 2569 work-permit renewal window is
// open (see src/lib/workpermit/deadline.ts). Sits ABOVE the regular voucher
// hero, which stays in place underneath so the other seven pillars are still
// one scroll away. Rendered only when page.tsx passes a non-null daysLeft —
// after 11 ธ.ค. 2569 the homepage goes back to the voucher hero on its own.
//
// The chat is the point of this section: the same WorkPermitChat that lives on
// /foreign/workpermit (fixed FACTS block, no invented dates or fees), placed so
// it is visible without scrolling on desktop and immediately under the
// headline on mobile. Copy reuses t.foreignWorkpermit.* wherever the wording
// already exists there (badge, key dates, trust chips, CTA labels); only the
// homepage-specific headline lives under t.home.wp*.

const PHONE_TEL = 'tel:0819023540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'
const POSITION = 'home_hero'

export default function HomeWorkPermitHero({ daysLeft }: { daysLeft: number }) {
  const { t } = useTranslation()
  const w = t.foreignWorkpermit
  const h = t.home

  const KEY_DATES = [
    { label: w.dateLabel1, value: w.dateValue1 },
    { label: w.dateLabel3, value: w.dateValue3 },
    { label: w.dateLabel5, value: w.dateValue5 },
  ]

  return (
    <section
      id="workpermit"
      className="pt-20 md:pt-24 pb-10 md:pb-16 px-6 md:px-20 bg-gradient-to-br from-forest via-sage to-mint relative overflow-hidden"
    >
      <div className="absolute top-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-mint/20 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Copy */}
        <div>
          <div className="inline-flex items-center gap-2 bg-red-500/90 text-white px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-5 md:mb-6 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {w.badgePrefix} {daysLeft} {w.badgeSuffix}
          </div>

          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl text-white leading-tight mb-4 md:mb-5">
            {h.wpTitle1}<br />
            {h.wpTitle2}<br />
            <em className="text-amber-300 not-italic">{h.wpTitle3}</em>
          </h1>

          <p className="text-sm md:text-lg text-white/80 leading-relaxed mb-6 md:mb-8 max-w-xl">
            {h.wpDesc}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <a
              href={PHONE_TEL}
              onClick={() => trackWorkPermitCallClick(POSITION)}
              className="flex items-center justify-center gap-2 bg-amber-500 text-white px-8 py-4 rounded-full text-sm md:text-base font-bold shadow-lg hover:bg-amber-600 transition-all hover:-translate-y-0.5"
            >
              {w.ctaCallLabel}
            </a>
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWorkPermitLineClick(POSITION)}
              className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-8 py-4 rounded-full text-sm md:text-base font-bold hover:bg-[#00B04B] transition-all hover:-translate-y-0.5"
            >
              {w.ctaLineLabel}
            </a>
          </div>

          <div className="flex flex-wrap gap-4 md:gap-5 text-xs md:text-sm text-white/75 mb-8">
            {[w.trust1, w.trust2, w.trust3].map(text => (
              <span key={text} className="flex items-center gap-2"><span className="text-amber-300">✓</span> {text}</span>
            ))}
          </div>

          {/* Key dates — the three facts a visitor most needs before the chat */}
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {KEY_DATES.map(d => (
              <div key={d.label} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-white/60 mb-1">{d.label}</p>
                <p className="text-sm font-semibold text-white leading-snug">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-amber-200 mb-3 text-center lg:text-left">{h.wpChatLabel}</p>
          <Suspense fallback={<div className="bg-white rounded-3xl p-10 shadow-xl text-center text-muted text-sm">...</div>}>
            <WorkPermitChat surface="home" />
          </Suspense>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs md:text-sm">
            <Link href="/foreign/workpermit" className="text-white font-semibold hover:text-amber-200 transition-colors">
              {h.wpDetailsLink}
            </Link>
            <a href="#services" className="text-white/70 hover:text-white transition-colors">
              {h.wpOtherServices}
            </a>
          </div>
        </div>

        {/* Key dates on mobile/tablet — after the chat so the chat stays close to the headline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:hidden">
          {KEY_DATES.map(d => (
            <div key={d.label} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-white/60 mb-1">{d.label}</p>
              <p className="text-sm font-semibold text-white leading-snug">{d.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
