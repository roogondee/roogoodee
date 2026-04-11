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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
      <Link href="/" className="font-display text-xl md:text-2xl text-forest">
        {locale === 'th' ? <>รู้ก่อน<span className="text-mint italic">ดี</span><span className="text-muted ml-1">(รู้งี้)</span></> : <>RooGon<span className="text-mint italic">Dee</span></>}
      </Link>
      <div className="hidden md:flex items-center gap-5 text-sm text-muted">
        <Link href="/tools" className="hover:text-forest transition-colors">{t.common.calculator}</Link>
        <Link href="/ask" className="hover:text-forest transition-colors">{t.common.askExpert}</Link>
        <Link href="/blog" className="hover:text-forest transition-colors">{t.common.articles}</Link>
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
