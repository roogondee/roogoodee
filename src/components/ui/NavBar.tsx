'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from './LanguageSwitcher'

interface NavBarProps {
  ctaHref?: string
  ctaLabel?: string
}

export default function NavBar({ ctaHref = '/contact', ctaLabel }: NavBarProps) {
  const { locale, t } = useTranslation()
  const label = ctaLabel || `💬 ${t.common.consultFree}`

  // Same eight verticals the mobile drawer lists, in the same order.
  const SERVICE_LINKS = [
    { href: '/std',     label: t.nav.std },
    { href: '/glp1',    label: t.nav.glp1 },
    { href: '/ckd',     label: t.nav.ckd },
    { href: '/foreign', label: t.nav.foreign },
    { href: '/mens',    label: t.nav.mens },
    { href: '/women',   label: t.nav.women },
    { href: '/mind',    label: t.nav.mind },
    { href: '/dna',     label: t.nav.dna },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
      <Link href="/" className="font-display text-xl md:text-2xl text-forest">
        {locale === 'th' ? <>รู้ก่อน<span className="text-mint italic">ดี</span><span className="text-muted ml-1">(รู้งี้)</span></> : <>RooGon<span className="text-mint italic">Dee</span></>}
      </Link>
      <div className="hidden md:flex items-center gap-5 text-sm text-muted">
        {/* Services were reachable only from the homepage cards, the footer,
            and the mobile drawer — desktop visitors had no way to see the full
            list. focus-within keeps it usable from the keyboard. */}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center gap-1 hover:text-forest transition-colors py-2"
            aria-haspopup="true"
          >
            {t.common.services}
            <span className="text-[10px] transition-transform group-hover:rotate-180">▾</span>
          </button>
          <div className="absolute left-0 top-full w-64 pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-mint/15 py-2 overflow-hidden">
              {SERVICE_LINKS.map(s => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="block px-5 py-2.5 text-sm text-muted hover:bg-mint/10 hover:text-forest transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <Link href="/tools" className="hover:text-forest transition-colors">{t.common.calculator}</Link>
        <Link href="/ask" className="hover:text-forest transition-colors">{t.common.askExpert}</Link>
        <Link href="/blog" className="hover:text-forest transition-colors">{t.common.articles}</Link>
        <Link href="/news" className="hover:text-forest transition-colors">{locale === 'th' ? 'ข่าวสาร' : 'News'}</Link>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Link href={ctaHref} className="bg-forest text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold hover:bg-sage transition-all hover:-translate-y-0.5 hover:shadow-lg">
          {label}
        </Link>
      </div>
    </nav>
  )
}
