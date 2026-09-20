'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import th from '@/lib/i18n/locales/th'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import HealthProgramLeadForm from '@/components/ui/HealthProgramLeadForm'
import { track, trackHealthProgramCallClick, trackHealthProgramLineClick } from '@/lib/analytics/track'

const PHONE_TEL = 'tel:0819023540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'
const VERIFY_URL = 'https://mrd.hss.moph.go.th/mrd1_hss/?p=12942'

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'โปรแกรมดูแลสุขภาพแรงงานข้ามชาติ — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/foreign/health-program',
  specialty: 'Occupational Medicine',
}

// FAQ schema stays pinned to Thai (primary SEO market) regardless of the
// visitor's locale — same reasoning as ForeignMouClient.
const thHp = th.foreignHealthProgram
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { q: thHp.faq1q, a: thHp.faq1a }, { q: thHp.faq2q, a: thHp.faq2a },
    { q: thHp.faq3q, a: thHp.faq3a }, { q: thHp.faq4q, a: thHp.faq4a },
    { q: thHp.faq5q, a: thHp.faq5a }, { q: thHp.faq6q, a: thHp.faq6a },
  ].map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

const PILLAR_ICONS = ['🩺', '💉', '📚', '🏥', '🧠', '🥗']

function CallButton({ position, label, className = '' }: { position: string; label: string; className?: string }) {
  return (
    <a href={PHONE_TEL} onClick={() => trackHealthProgramCallClick(position)}
      className={`flex items-center justify-center gap-2 bg-amber-500 text-white px-8 py-4 rounded-full font-bold text-base shadow-lg hover:bg-amber-600 transition-all hover:-translate-y-0.5 ${className}`}>
      {label}
    </a>
  )
}

export default function ForeignHealthProgramClient() {
  const { t } = useTranslation()
  const h = t.foreignHealthProgram

  const PILLARS = [
    { title: h.pillar1Title, desc: h.pillar1Desc },
    { title: h.pillar2Title, desc: h.pillar2Desc },
    { title: h.pillar3Title, desc: h.pillar3Desc },
    { title: h.pillar4Title, desc: h.pillar4Desc },
    { title: h.pillar5Title, desc: h.pillar5Desc },
    { title: h.pillar6Title, desc: h.pillar6Desc },
  ].map((p, i) => ({ ...p, icon: PILLAR_ICONS[i], n: i + 1 }))

  // Each pillar's detail block. `note` is the escape hatch that keeps an
  // unverified claim off the page: pillar 2 must never read as "we stock
  // these vaccines" (the partner has not confirmed a list), and pillar 5
  // must never promise an immediate session while MIND_WAITLIST_MODE is on
  // in src/lib/quiz/insight.ts.
  const DETAILS = [
    { title: h.p1Title, lead: h.p1Lead, bullets: [h.p1B1, h.p1B2, h.p1B3, h.p1B4], note: h.p1Note },
    { title: h.p2Title, lead: h.p2Lead, bullets: [h.p2B1, h.p2B2, h.p2B3, h.p2B4], note: h.p2Note },
    { title: h.p3Title, lead: h.p3Lead, bullets: [h.p3B1, h.p3B2, h.p3B3, h.p3B4], note: h.p3Note },
    { title: h.p4Title, lead: h.p4Lead, bullets: [h.p4B1, h.p4B2, h.p4B3, h.p4B4] },
    { title: h.p5Title, lead: h.p5Lead, bullets: [h.p5B1, h.p5B2, h.p5B3, h.p5B4] },
    { title: h.p6Title, lead: h.p6Lead, bullets: [h.p6B1, h.p6B2, h.p6B3, h.p6B4] },
  ].map((d, i) => ({ ...d, icon: PILLAR_ICONS[i], n: i + 1 }))

  const FAQS = [
    { q: h.faq1q, a: h.faq1a }, { q: h.faq2q, a: h.faq2a }, { q: h.faq3q, a: h.faq3a },
    { q: h.faq4q, a: h.faq4a }, { q: h.faq5q, a: h.faq5a }, { q: h.faq6q, a: h.faq6a },
  ]

  return (
    <main className="min-h-screen bg-cream pb-20 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NavBar ctaHref="#lead-form" ctaLabel={h.stickyLabel} />

      {/* Hero */}
      <section className="min-h-[70vh] flex items-center pt-20 pb-10 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">{h.heroTag}</div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {h.heroTitle1}<br />{h.heroTitle2}<br /><em className="text-amber-600">{h.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">{h.heroDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <CallButton position="hero" label={h.ctaCall} />
            <a href="#lead-form" className="flex items-center justify-center gap-2 border-2 border-forest/30 text-forest px-7 py-4 rounded-full text-sm font-semibold hover:bg-forest hover:text-white transition-all">{h.ctaQuote}</a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[h.trust1, h.trust2, h.trust3].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted"><span className="w-2 h-2 bg-amber-500 rounded-full" />{text}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience split — a worker landing from a ?lang=my ad must be able to
          self-identify above the second scroll, and an HR manager must see
          "this is for you" before the six-card wall of detail below. */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-3">{h.audienceTitle}</h2>
          <p className="text-muted mb-10 max-w-2xl">{h.audienceDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-7 flex flex-col">
              <h3 className="font-bold text-forest text-lg mb-2">{h.employerTitle}</h3>
              <p className="text-muted text-sm mb-4">{h.employerDesc}</p>
              <ul className="space-y-2 text-sm text-rtext mb-6 flex-1">
                {[h.employerB1, h.employerB2, h.employerB3].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">✓</span>{b}</li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <a href={PHONE_TEL} onClick={() => trackHealthProgramCallClick('employer_card')}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-full text-sm font-bold hover:bg-amber-600 transition-all">📞 081-902-3540</a>
                <a href="#lead-form" className="flex-1 flex items-center justify-center border border-forest/30 text-forest px-5 py-3 rounded-full text-sm font-semibold hover:bg-forest hover:text-white transition-all">{h.employerCta}</a>
              </div>
            </div>
            <div className="bg-cream border border-mint/15 rounded-2xl p-7 flex flex-col">
              <h3 className="font-bold text-forest text-lg mb-2">{h.workerTitle}</h3>
              <p className="text-muted text-sm mb-4">{h.workerDesc}</p>
              <ul className="space-y-2 text-sm text-rtext mb-6 flex-1">
                {[h.workerB1, h.workerB2, h.workerB3].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-mint mt-0.5">✓</span>{b}</li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <a href={PHONE_TEL} onClick={() => trackHealthProgramCallClick('worker_card')}
                  className="flex-1 flex items-center justify-center gap-2 bg-forest text-white px-5 py-3 rounded-full text-sm font-bold hover:bg-sage transition-all">📞 081-902-3540</a>
                <Link href="/advice" onClick={() => track('healthprogram_advice_click', { service: 'foreign', position: 'worker_card' })}
                  className="flex-1 flex items-center justify-center border border-forest/30 text-forest px-5 py-3 rounded-full text-sm font-semibold hover:bg-forest hover:text-white transition-all">{h.workerCta}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six pillars overview */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-forest">
        <div className="max-w-6xl mx-auto">
          <p className="text-mint text-sm font-semibold mb-2">{h.pillarsLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3">{h.pillarsTitle}</h2>
          <p className="text-white/70 mb-10 max-w-2xl">{h.pillarsDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map(p => (
              <div key={p.title} className="bg-white/10 border border-white/15 rounded-2xl p-6">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-white text-base mb-2">{p.n}. {p.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillar detail blocks */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-4xl mx-auto space-y-12">
          {DETAILS.map(d => (
            <div key={d.title} className="border-b border-gray-100 pb-12 last:border-0 last:pb-0">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-3xl shrink-0">{d.icon}</div>
                <h3 className="font-display text-2xl md:text-3xl text-forest leading-snug">{d.title}</h3>
              </div>
              <p className="text-muted text-sm md:text-base leading-relaxed mb-5">{d.lead}</p>
              <ul className="space-y-2.5 text-sm text-rtext">
                {d.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">✓</span>{b}</li>
                ))}
              </ul>
              {d.note && (
                <p className="mt-5 text-xs text-muted bg-cream border border-mint/15 rounded-xl p-4 leading-relaxed">{d.note}</p>
              )}
              {d.n === 4 && (
                <Link href="/advice" onClick={() => track('healthprogram_advice_click', { service: 'foreign', position: 'pillar_4' })}
                  className="inline-flex items-center gap-2 mt-5 text-forest font-semibold text-sm underline hover:text-sage">
                  {h.p4Cta} →
                </Link>
              )}
              {d.n === 5 && (
                <>
                  <p className="mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4 leading-relaxed font-medium">
                    {h.p5Hotline}
                  </p>
                  <Link href="/mind" className="inline-flex items-center gap-2 mt-4 text-forest font-semibold text-sm underline hover:text-sage">
                    {h.p5Note} →
                  </Link>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Credentials — wording per docs/foreign-worker-tiein.md: customer-facing
          copy says "มาตรฐาน MOPH LAB", never the LA certificate number, and the
          สบส. verification link stays wherever the licence is claimed. */}
      <section className="py-12 px-6 md:px-20 bg-cream">
        <div className="max-w-4xl mx-auto bg-white border border-mint/20 rounded-2xl p-6 md:p-8">
          <p className="text-xs font-semibold text-forest mb-2">{h.credsLabel}</p>
          <p className="text-sm text-muted leading-relaxed">
            {h.credsText}{' '}
            <a href={VERIFY_URL} target="_blank" rel="noopener noreferrer" className="text-forest underline hover:text-sage">
              {h.credsVerifyLink}
            </a>
          </p>
        </div>
      </section>

      {/* Lead form */}
      <section id="lead-form" className="py-16 md:py-24 px-6 md:px-20 bg-white scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          <Suspense fallback={<div className="bg-white rounded-3xl shadow-xl p-10 text-center text-muted">...</div>}>
            <HealthProgramLeadForm />
          </Suspense>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-8">{h.faqTitle}</h2>
          <div className="space-y-3">
            {FAQS.map(f => (
              <details key={f.q} className="bg-white border border-mint/15 rounded-2xl p-5 group">
                <summary className="font-semibold text-forest cursor-pointer text-sm md:text-base list-none flex justify-between items-center gap-4">
                  {f.q}<span className="text-mint group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="text-muted text-sm leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{h.ctaTitle}</h2>
          <p className="text-muted mb-8">{h.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CallButton position="final_cta" label={h.ctaCall} />
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackHealthProgramLineClick('final_cta')}
              className="flex items-center justify-center bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">💬 {h.ctaLine}</a>
          </div>
        </div>
      </section>

      <FooterMinimal />

      {/* Sticky mobile call bar — ads traffic is mostly mobile; keep the number one tap away */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 backdrop-blur border-t border-amber-200 md:hidden">
        <a href={PHONE_TEL} onClick={() => trackHealthProgramCallClick('sticky_bar')}
          className="flex items-center justify-center gap-2 bg-amber-500 text-white py-3.5 rounded-full font-bold text-base shadow-lg">
          📞 {h.stickyLabel}
        </a>
      </div>
    </main>
  )
}
