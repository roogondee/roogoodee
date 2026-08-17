'use client'
import { Suspense } from 'react'
import { useTranslation } from '@/lib/i18n/context'
import th from '@/lib/i18n/locales/th'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import AdviceChat from '@/components/ui/AdviceChat'

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ปรึกษาอาการเจ็บป่วยฟรี AI + แพทย์จริง — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/advice',
  about: { '@type': 'MedicalCondition', name: 'General symptom triage' },
  audience: { '@type': 'Patient' },
}

// FAQ schema stays pinned to Thai (primary SEO market) regardless of the
// visitor's locale — same pattern as ForeignMouClient.
const a = th.advice
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { q: a.faq1q, a: a.faq1a }, { q: a.faq2q, a: a.faq2a }, { q: a.faq3q, a: a.faq3a },
    { q: a.faq4q, a: a.faq4a }, { q: a.faq5q, a: a.faq5a }, { q: a.faq6q, a: a.faq6a },
  ].map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

const CHAT_FALLBACK = (
  <div className="bg-white rounded-3xl shadow-xl border border-mint/15 p-10 text-center text-muted text-sm min-h-[420px] flex items-center justify-center">
    ...
  </div>
)

export default function AdviceClient() {
  const { t } = useTranslation()
  const m = t.advice

  const SYMPTOMS = [
    { title: m.symptom1Title, desc: m.symptom1Desc, query: m.symptom1Query, icon: '🤒' },
    { title: m.symptom2Title, desc: m.symptom2Desc, query: m.symptom2Query, icon: '🤢' },
    { title: m.symptom3Title, desc: m.symptom3Desc, query: m.symptom3Query, icon: '🤕' },
    { title: m.symptom4Title, desc: m.symptom4Desc, query: m.symptom4Query, icon: '🔴' },
    { title: m.symptom5Title, desc: m.symptom5Desc, query: m.symptom5Query, icon: '🚻' },
    { title: m.symptom6Title, desc: m.symptom6Desc, query: m.symptom6Query, icon: '😮‍💨' },
  ]
  const STEPS = [
    { num: '01', title: m.step1Title, desc: m.step1Desc },
    { num: '02', title: m.step2Title, desc: m.step2Desc },
    { num: '03', title: m.step3Title, desc: m.step3Desc },
  ]
  const FAQS = [
    { q: m.faq1q, a: m.faq1a }, { q: m.faq2q, a: m.faq2a }, { q: m.faq3q, a: m.faq3a },
    { q: m.faq4q, a: m.faq4a }, { q: m.faq5q, a: m.faq5a }, { q: m.faq6q, a: m.faq6a },
  ]

  return (
    <main className="min-h-screen bg-cream pb-16 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NavBar ctaHref="#advice-chat" ctaLabel={m.finalCtaButton} />

      {/* Hero — chat is order-1 on mobile so it renders above the fold;
          ads traffic needs to start typing immediately, not scroll first. */}
      <section id="advice-chat" className="pt-20 pb-12 md:pt-28 md:pb-20 px-6 md:px-20 bg-gradient-to-br from-mint/10 via-cream to-cream scroll-mt-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="order-1 md:order-2">
            <Suspense fallback={CHAT_FALLBACK}>
              <AdviceChat />
            </Suspense>
          </div>
          <div className="order-2 md:order-1 md:pt-6">
            <div className="inline-flex items-center gap-2 bg-mint/15 border border-mint/25 text-forest px-4 py-2 rounded-full text-xs font-semibold mb-5">{m.heroTag}</div>
            <h1 className="font-display text-3xl md:text-5xl text-forest leading-tight mb-4">
              {m.heroTitle1}<br />{m.heroTitle2}<br /><em className="text-mint not-italic">{m.heroTitle3}</em>
            </h1>
            <p className="text-muted text-base leading-relaxed mb-6 whitespace-pre-line">{m.heroDesc}</p>
            <div className="flex flex-wrap gap-4">
              {[m.trustHospital, m.trustDoctor, m.trustFree].map(text => (
                <div key={text} className="flex items-center gap-2 text-sm text-rtext"><span className="w-2 h-2 bg-mint rounded-full flex-shrink-0" />{text}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Common symptoms → deep-link into the chat with a prefilled message */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{m.symptomsLabel}</p>
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-10">{m.symptomsTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SYMPTOMS.map(s => (
              <a
                key={s.title}
                href={`/advice?symptom=${encodeURIComponent(s.query)}#advice-chat`}
                className="bg-cream border border-mint/15 rounded-2xl p-5 hover:border-mint/50 hover:-translate-y-0.5 transition-all"
              >
                <div className="text-2xl mb-2">{s.icon}</div>
                <h3 className="font-semibold text-forest text-sm mb-1">{s.title}</h3>
                <p className="text-muted text-xs leading-relaxed">{s.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 3 steps */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{m.stepsLabel}</p>
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-10">{m.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.num} className="bg-white border border-mint/15 rounded-2xl p-6">
                <span className="inline-flex w-9 h-9 rounded-full bg-mint/15 text-mint font-bold text-sm items-center justify-center mb-4">{s.num}</span>
                <h3 className="font-semibold text-forest text-base mb-1.5">{s.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency numbers — always visible, not gated behind chatting */}
      <section className="py-12 px-6 md:px-20 bg-red-700">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-red-200 mb-3">{m.emergencyLabel}</p>
          <h2 className="font-display text-2xl text-white mb-6">{m.emergencyTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tel: '1669', title: m.emergency1669Title, desc: m.emergency1669Desc },
              { tel: '1323', title: m.crisis1323Title, desc: m.crisis1323Desc },
              { tel: '1300', title: m.violence1300Title, desc: m.violence1300Desc },
            ].map(x => (
              <a key={x.tel} href={`tel:${x.tel}`} className="bg-white/10 border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-colors">
                <p className="text-white font-bold text-lg mb-1">📞 {x.title}</p>
                <p className="text-red-100 text-xs leading-relaxed">{x.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{m.faqLabel}</p>
          <h2 className="font-display text-3xl text-forest mb-10">{t.common.faq}</h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-cream border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm hover:bg-mint/5 transition-colors">
                  {item.q}
                  <span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">＋</span>
                </summary>
                <div className="px-6 pb-5 text-muted text-sm leading-relaxed border-t border-mint/10 pt-4">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 md:px-20 bg-forest">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-white mb-4">{m.finalCtaTitle}</h2>
          <p className="text-white/70 mb-8">{m.finalCtaDesc}</p>
          <a href="#advice-chat" className="inline-flex items-center justify-center gap-2 bg-mint text-forest px-8 py-4 rounded-full text-sm font-bold hover:bg-leaf transition-all">
            {m.finalCtaButton}
          </a>
        </div>
      </section>

      <FooterMinimal />

      {/* Sticky mobile CTA — ads traffic is mostly mobile; one tap back to chat */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-mint/20 md:hidden">
        <a href="#advice-chat" className="flex items-center justify-center gap-2 bg-forest text-white py-3.5 rounded-full font-bold text-base shadow-lg">
          🩺 {m.finalCtaButton}
        </a>
      </div>
    </main>
  )
}
