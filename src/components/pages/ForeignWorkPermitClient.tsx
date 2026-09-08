'use client'
import { Suspense } from 'react'
import { useTranslation } from '@/lib/i18n/context'
import th from '@/lib/i18n/locales/th'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import WorkPermitChat from '@/components/ui/WorkPermitChat'
import WorkPermitLeadForm, { trackWorkPermitCallClick, trackWorkPermitLineClick } from '@/components/ui/WorkPermitLeadForm'

const PHONE_TEL = 'tel:0819023540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'
const NATION_FLAGS = ['🇱🇦', '🇲🇲', '🇻🇳']

// FAQ schema stays pinned to Thai (primary SEO market) regardless of the visitor's locale
const w0 = th.foreignWorkpermit
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { q: w0.faq1q, a: w0.faq1a }, { q: w0.faq2q, a: w0.faq2a }, { q: w0.faq3q, a: w0.faq3a },
    { q: w0.faq4q, a: w0.faq4a }, { q: w0.faq5q, a: w0.faq5a }, { q: w0.faq6q, a: w0.faq6a },
  ].map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}
const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ต่ออายุใบอนุญาตทำงานแรงงานต่างด้าว 2569 — ตรวจสุขภาพที่ W Medical Hospital',
  url: 'https://roogondee.com/foreign/workpermit',
  specialty: 'Occupational Medicine',
}

function CallButton({ position, label, className = '' }: { position: string; label: string; className?: string }) {
  return (
    <a href={PHONE_TEL} onClick={() => trackWorkPermitCallClick(position)}
      className={`flex items-center justify-center gap-2 bg-amber-500 text-white px-8 py-4 rounded-full text-sm md:text-base font-bold shadow-lg hover:bg-amber-600 transition-all hover:-translate-y-0.5 ${className}`}>
      {label}
    </a>
  )
}
function LineButton({ position, label, className = '' }: { position: string; label: string; className?: string }) {
  return (
    <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackWorkPermitLineClick(position)}
      className={`flex items-center justify-center gap-2 bg-[#06C755] text-white px-8 py-4 rounded-full text-sm md:text-base font-bold hover:bg-[#00B04B] transition-all hover:-translate-y-0.5 ${className}`}>
      {label}
    </a>
  )
}

export default function ForeignWorkPermitClient({ daysLeft }: { daysLeft: number }) {
  const { t } = useTranslation()
  const w = t.foreignWorkpermit

  const KEY_DATES = [
    { label: w.dateLabel1, value: w.dateValue1 },
    { label: w.dateLabel2, value: w.dateValue2 },
    { label: w.dateLabel3, value: w.dateValue3 },
    { label: w.dateLabel4, value: w.dateValue4 },
    { label: w.dateLabel5, value: w.dateValue5 },
  ]

  // 9-step hospital checkup, from the W Medical infographic — supersedes the
  // 7-step version on the older /foreign pages (no Iris-Scan-only highlight;
  // TRCBAS identity verification is now step 2, kept highlighted as the newest
  // requirement).
  const HOSPITAL_STEPS = [
    { num: '1', title: w.hstep1Title, desc: w.hstep1Desc },
    { num: '2', title: w.hstep2Title, desc: w.hstep2Desc, highlight: true },
    { num: '3', title: w.hstep3Title, desc: w.hstep3Desc },
    { num: '4', title: w.hstep4Title, desc: w.hstep4Desc },
    { num: '5', title: w.hstep5Title, desc: w.hstep5Desc },
    { num: '6', title: w.hstep6Title, desc: w.hstep6Desc },
    { num: '7', title: w.hstep7Title, desc: w.hstep7Desc },
    { num: '8', title: w.hstep8Title, desc: w.hstep8Desc },
    { num: '9', title: w.hstep9Title, desc: w.hstep9Desc },
  ]

  const DISEASES = [w.disease1, w.disease2, w.disease3, w.disease4, w.disease5, w.disease6]
  const NATIONALITIES = [w.nation1, w.nation2, w.nation3].map((label, i) => ({ flag: NATION_FLAGS[i], label }))

  // The employer-facing eWorkPermit filing flow — distinct from the hospital
  // checkup above. Health checkup is step 1 here; steps 2-9 happen on
  // eworkpermit.doe.go.th, which we do not file on the employer's behalf.
  const EMPLOYER_STEPS = [
    { num: '1', title: w.estep1Title, desc: w.estep1Desc },
    { num: '2', title: w.estep2Title, desc: w.estep2Desc },
    { num: '3', title: w.estep3Title, desc: w.estep3Desc },
    { num: '4', title: w.estep4Title, desc: w.estep4Desc },
    { num: '5', title: w.estep5Title, desc: w.estep5Desc },
    { num: '6', title: w.estep6Title, desc: w.estep6Desc },
    { num: '7', title: w.estep7Title, desc: w.estep7Desc },
    { num: '8', title: w.estep8Title, desc: w.estep8Desc },
    { num: '9', title: w.estep9Title, desc: w.estep9Desc },
  ]

  const COMMON_MISTAKES = [w.mistake1, w.mistake2, w.mistake3]

  const FAQS = [
    { q: w.faq1q, a: w.faq1a }, { q: w.faq2q, a: w.faq2a }, { q: w.faq3q, a: w.faq3a },
    { q: w.faq4q, a: w.faq4a }, { q: w.faq5q, a: w.faq5a }, { q: w.faq6q, a: w.faq6a },
  ]

  return (
    <main className="min-h-screen bg-cream pb-20 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NavBar ctaHref="#cta" ctaLabel={w.navCta} />

      {/* Hero */}
      <section className="pt-20 pb-10 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            {w.badgePrefix} {daysLeft} {w.badgeSuffix}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {w.heroTitle1}<br />{w.heroTitle2}<br /><em className="text-amber-600">{w.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            {w.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <CallButton position="hero" label={w.ctaCallLabel} />
            <LineButton position="hero" label={w.ctaLineLabel} />
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[w.trust1, w.trust2, w.trust3].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted"><span className="w-2 h-2 bg-amber-500 rounded-full" />{text}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Q&A bot */}
      <section className="px-6 md:px-20 pb-16 md:pb-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3 text-center">{w.chatLabel}</p>
          <Suspense fallback={<div className="bg-white rounded-3xl p-10 shadow-xl text-center text-muted text-sm">...</div>}>
            <WorkPermitChat />
          </Suspense>
        </div>
      </section>

      {/* Key dates strip */}
      <section className="py-10 px-6 md:px-20 bg-forest">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {KEY_DATES.map(d => (
              <div key={d.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/50 text-[11px] mb-1">{d.label}</p>
                <p className="text-white font-semibold text-sm leading-snug">{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why a connected hospital */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{w.whyLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-6">{w.whyTitle}</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3 text-sm text-rtext leading-relaxed">
            <p>{w.whyPara1}</p>
            <p>{w.whyPara2}</p>
            <p className="text-xs text-muted">{w.whyNote}</p>
          </div>
        </div>
      </section>

      {/* 9-step hospital checkup */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{w.hospLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-3">{w.hospTitle}</h2>
          <p className="text-muted text-sm md:text-base mb-10 max-w-2xl">{w.hospDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOSPITAL_STEPS.map(s => (
              <div key={s.num} className={`relative rounded-2xl p-5 border ${s.highlight ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-mint/15'}`}>
                {s.highlight && (
                  <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">{w.trcbasBadge}</span>
                )}
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${s.highlight ? 'bg-amber-500 text-white' : 'bg-mint/15 text-mint'}`}>{s.num}</span>
                  <div>
                    <h3 className="font-semibold text-forest text-sm mb-1 leading-snug">{s.title}</h3>
                    <p className="text-muted text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* License numbers and the hospital name are legal proper nouns — kept as-is across locales */}
          <div className="mt-8 bg-mint/5 border border-mint/15 rounded-2xl p-5 text-xs text-muted leading-relaxed">
            <strong className="text-forest">{w.credsLabel}</strong> {w.credsText}{' '}
            <a href="https://mrd.hss.moph.go.th/mrd1_hss/?p=12942" target="_blank" rel="noopener noreferrer" className="text-mint hover:underline">{w.credsVerifyLink}</a>
            <div className="mt-2">{w.credsAddress}</div>
          </div>
        </div>
      </section>

      {/* 6 diseases + 3 nationalities */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{w.diseasesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{w.diseasesTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {DISEASES.map(d => (
              <div key={d} className="bg-cream border border-mint/15 rounded-2xl p-5">
                <h3 className="font-semibold text-forest text-sm">{d}</h3>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {NATIONALITIES.map(n => (
              <div key={n.label} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-5 py-3">
                <span className="text-xl">{n.flag}</span>
                <span className="font-semibold text-forest text-sm">{n.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Employer's 9-step eWorkPermit flow */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-forest">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{w.employerLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3">{w.employerTitle}</h2>
          <p className="text-white/60 text-sm md:text-base mb-10 max-w-2xl">{w.employerDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {EMPLOYER_STEPS.map(s => (
              <div key={s.num} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">{s.num}</span>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1 leading-snug">{s.title}</h3>
                    <p className="text-white/60 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <h3 className="font-bold text-amber-300 text-sm mb-2">{w.mistakesTitle}</h3>
            <ul className="space-y-1.5">
              {COMMON_MISTAKES.map(m => (
                <li key={m} className="text-white/70 text-xs leading-relaxed flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>{m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Lead form */}
      <section id="lead-form" className="py-16 md:py-24 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream scroll-mt-20">
        <div className="max-w-xl mx-auto">
          <Suspense fallback={<div className="bg-white rounded-3xl p-10 shadow-xl text-center text-muted text-sm">...</div>}>
            <WorkPermitLeadForm />
          </Suspense>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{w.faqLabel}</p>
          <h2 className="font-display text-3xl text-forest mb-10">{w.faqTitle}</h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-cream border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm hover:bg-mint/5 transition-colors">{item.q}<span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">＋</span></summary>
                <div className="px-6 pb-5 text-muted text-sm leading-relaxed border-t border-mint/10 pt-4">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="py-16 px-6 md:px-20 bg-cream scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-2">{w.ctaTitlePrefix} {daysLeft} {w.ctaTitleSuffix}</h2>
          <p className="text-muted mb-8">{w.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CallButton position="final_cta" label={w.ctaCallLabel} />
            <LineButton position="final_cta" label={w.ctaLineLabel} />
          </div>
        </div>
      </section>

      <FooterMinimal />

      {/* Sticky mobile CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 backdrop-blur border-t border-amber-200 md:hidden flex gap-2">
        <a href={PHONE_TEL} onClick={() => trackWorkPermitCallClick('sticky_bar')}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
          {w.stickyCall}
        </a>
        <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackWorkPermitLineClick('sticky_bar')}
          className="flex-1 flex items-center justify-center gap-2 bg-[#06C755] text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
          {w.stickyLine}
        </a>
      </div>
    </main>
  )
}
