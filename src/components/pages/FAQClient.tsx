'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'

export default function FAQClient() {
  const { t } = useTranslation()
  const f = t.faqPage

  const FAQS = [
    {
      category: f.catGeneral, color: 'bg-forest/5 text-forest',
      items: [
        { q: f.gQ1, a: f.gA1 }, { q: f.gQ2, a: f.gA2 },
        { q: f.gQ3, a: f.gA3 }, { q: f.gQ4, a: f.gA4 },
      ],
    },
    {
      category: f.catStd, color: 'bg-rose-100 text-rose-700',
      items: [
        { q: f.sQ1, a: f.sA1 }, { q: f.sQ2, a: f.sA2 },
        { q: f.sQ3, a: f.sA3 }, { q: f.sQ4, a: f.sA4 },
      ],
    },
    {
      category: f.catGlp1, color: 'bg-emerald-100 text-emerald-700',
      items: [
        { q: f.glQ1, a: f.glA1 }, { q: f.glQ2, a: f.glA2 },
        { q: f.glQ3, a: f.glA3 }, { q: f.glQ4, a: f.glA4 },
      ],
    },
    {
      category: f.catCkd, color: 'bg-blue-100 text-blue-700',
      items: [
        { q: f.cQ1, a: f.cA1 }, { q: f.cQ2, a: f.cA2 },
        { q: f.cQ3, a: f.cA3 }, { q: f.cQ4, a: f.cA4 },
      ],
    },
    {
      category: f.catForeign, color: 'bg-amber-100 text-amber-700',
      items: [
        { q: f.fQ1, a: f.fA1 }, { q: f.fQ2, a: f.fA2 },
        { q: f.fQ3, a: f.fA3 }, { q: f.fQ4, a: f.fA4 },
      ],
    },
  ]

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />
      <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">FAQ</p>
          <h1 className="font-display text-3xl md:text-4xl text-forest mb-3">{f.title}</h1>
          <p className="text-muted text-sm">{f.askExpertLink} <Link href="/ask" className="text-forest underline">{t.common.askExpert} →</Link></p>
        </div>

        <div className="space-y-10">
          {FAQS.map(cat => (
            <div key={cat.category}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${cat.color}`}>{cat.category}</span>
              </div>
              <div className="space-y-3">
                {cat.items.map((faq, i) => (
                  <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none hover:bg-mint/5 transition-colors">
                      <span className="text-sm font-semibold text-forest">{faq.q}</span>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-mint/10 text-forest flex items-center justify-center text-xs font-bold transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-mint/10 pt-4">{faq.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 bg-gradient-to-br from-forest to-sage rounded-2xl p-7 text-white text-center">
          <h2 className="font-display text-xl mb-2">{f.ctaTitle}</h2>
          <p className="text-white/70 text-sm mb-5">{f.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/contact" className="bg-white text-forest px-6 py-3 rounded-full font-bold text-sm hover:bg-cream transition-all">📝 {t.common.consultFree}</Link>
            <Link href="/ask" className="bg-white/15 border border-white/30 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-white/25 transition-all">💬 {t.common.askExpert}</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
