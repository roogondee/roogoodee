import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'RuGonDee — Confidential Health Consultation | Samut Sakhon',
  description: 'Free, confidential health consultation. STD & PrEP HIV testing, GLP-1 weight loss, CKD Clinic, and migrant worker health checks in Samut Sakhon, Thailand.',
  alternates: { canonical: 'https://roogondee.com/en' },
  openGraph: {
    title: 'RuGonDee — Know Before It\'s Too Late',
    description: 'Confidential health consultation. No judgment. Response within 30 minutes.',
    url: 'https://roogondee.com/en',
    locale: 'en_US',
  },
}

const SERVICES = [
  {
    icon: '🔴',
    title: 'STD & PrEP HIV',
    desc: 'Comprehensive STD testing, PrEP (pre-exposure prophylaxis), and PEP (post-exposure). Confidential, same-day results.',
    href: '/contact?service=std',
    bg: 'bg-rose-50 border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
  },
  {
    icon: '💉',
    title: 'GLP-1 Weight Loss',
    desc: 'FDA-approved GLP-1 medications (Semaglutide, Liraglutide). Doctor-supervised program tailored to your body.',
    href: '/contact?service=glp1',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: '🫘',
    title: 'CKD Clinic',
    desc: 'Chronic kidney disease management. eGFR testing, dietary planning, and specialist referral.',
    href: '/contact?service=ckd',
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    icon: '🧪',
    title: 'Migrant Worker Health',
    desc: 'Health certificates for Myanmar, Cambodia, Laos & Vietnam workers. B2B packages available. Same-day certificates.',
    href: '/contact?service=foreign',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
]

const TRUST = [
  { value: '500+', label: 'Patients served' },
  { value: '30 min', label: 'Response time' },
  { value: '4', label: 'Specialties' },
  { value: '100%', label: 'Confidential' },
]

const FAQS = [
  { q: 'Is the consultation really free?', a: 'Yes. Initial consultation via form or LINE is completely free. Fees only apply when you book an appointment or receive treatment.' },
  { q: 'How is my privacy protected?', a: 'All data is encrypted and stored under Thai PDPA law. Your information is never shared with third parties without explicit consent.' },
  { q: 'Where are you located?', a: 'We operate in partnership with W Medical Hospital, Samut Sakhon. For migrant worker B2B services, we can come on-site to your factory.' },
  { q: 'Do you have English-speaking staff?', a: 'Yes. Our team can communicate in English, Thai, and with interpreters for Burmese, Khmer, Lao, and Vietnamese.' },
]

export default function EnglishPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    name: 'RuGonDee',
    url: 'https://roogondee.com/en',
    description: 'Confidential health consultation — STD/PrEP, GLP-1, CKD, Migrant Worker Health in Samut Sakhon, Thailand',
    address: { '@type': 'PostalAddress', addressLocality: 'Samut Sakhon', addressCountry: 'TH' },
    availableLanguage: ['Thai', 'English', 'Burmese', 'Khmer'],
  }

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
          <span className="text-xs text-muted border border-mint/30 px-2 py-0.5 rounded-full">EN</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-muted hover:text-forest transition-colors hidden md:block">ภาษาไทย</Link>
          <Link href="/contact" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">💬 Free Consult</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-6 md:px-20 max-w-5xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-mint/10 border border-mint/20 text-sage px-4 py-2 rounded-full text-xs font-semibold mb-6">
            🌿 Confidential · No Judgment · 30-min Response
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            Know Before<br /><em className="text-mint">It&apos;s Too Late</em>
          </h1>
          <p className="text-muted text-base md:text-xl max-w-xl mx-auto leading-relaxed mb-8">
            Private health consultation with specialists. STD testing, weight management, kidney care, and occupational health — all in Samut Sakhon.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="bg-forest text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-sage transition-all hover:-translate-y-0.5 shadow-lg">
              📝 Get Free Consultation
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer"
              className="bg-[#06C755] text-white px-8 py-4 rounded-full font-bold text-sm hover:opacity-90 transition-all hover:-translate-y-0.5">
              💬 LINE: @roogondee
            </a>
          </div>
        </div>

        {/* Trust stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 md:mb-20">
          {TRUST.map(t => (
            <div key={t.value} className="bg-white rounded-2xl p-5 text-center border border-mint/10 shadow-sm">
              <p className="font-display text-3xl md:text-4xl text-forest mb-1">{t.value}</p>
              <p className="text-xs text-muted">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Services */}
        <div className="mb-16 md:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">Our Services</p>
            <h2 className="font-display text-2xl md:text-3xl text-forest">What We Offer</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICES.map(s => (
              <Link key={s.title} href={s.href}
                className={`border rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all ${s.bg}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{s.icon}</span>
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${s.badge}`}>{s.title}</span>
                    <p className="text-sm text-forest/80 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-forest mt-4 flex items-center gap-1">Learn more →</p>
              </Link>
            ))}
          </div>
        </div>

        {/* For Migrant Workers */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-3xl p-7 md:p-10 mb-12 md:mb-16">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <span className="text-5xl">🌏</span>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-2">For Migrant Workers</p>
              <h2 className="font-display text-2xl text-forest mb-3">Health Certificates & Work Permits</h2>
              <p className="text-sm text-forest/70 leading-relaxed mb-4">
                We support Myanmar, Cambodia, Laos, and Vietnam workers with legal health certificates required for work permits in Thailand. B2B packages available for factories and employers.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {['🇲🇲 Myanmar', '🇰🇭 Cambodia', '🇱🇦 Laos', '🇻🇳 Vietnam'].map(f => (
                  <span key={f} className="text-xs bg-white border border-amber-200 text-amber-800 px-3 py-1 rounded-full">{f}</span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/contact?service=foreign" className="bg-forest text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-sage transition-all text-center">
                  Request B2B Quote
                </Link>
                <a href="tel:0819023540" className="border-2 border-forest text-forest text-sm font-bold px-5 py-2.5 rounded-full hover:bg-forest hover:text-white transition-all text-center">
                  📞 081-902-3540
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl text-forest">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none hover:bg-mint/5 transition-colors">
                  <span className="text-sm font-semibold text-forest">{f.q}</span>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-mint/10 text-forest flex items-center justify-center text-xs font-bold transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-mint/10 pt-4">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="font-display text-2xl md:text-3xl mb-2">Ready to Get Started?</h2>
          <p className="text-white/70 text-sm mb-6">Our specialists respond within 30 minutes. Free, confidential, no commitment.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="bg-white text-forest px-8 py-3.5 rounded-full font-bold text-sm hover:bg-cream transition-all">
              📝 Free Consultation
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer"
              className="bg-white/15 border border-white/30 text-white px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-white/25 transition-all">
              💬 LINE: @roogondee
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark py-8 px-6 text-white/40 text-center text-xs">
        <p>© 2025 บริษัท เจียรักษา จำกัด | roogondee.com | Samut Sakhon, Thailand</p>
        <p className="mt-1">
          <Link href="/" className="hover:text-white transition-colors">ภาษาไทย</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy (PDPA)</Link>
        </p>
      </footer>
    </main>
  )
}
