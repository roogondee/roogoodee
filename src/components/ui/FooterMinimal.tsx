'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'

export default function FooterMinimal() {
  const { t } = useTranslation()

  return (
    <footer className="bg-dark py-8 px-6 md:px-20 text-white/40 text-xs flex flex-col md:flex-row justify-between gap-2">
      <span>{t.common.copyright}</span>
      <div className="flex gap-4">
        <Link href="/privacy" className="hover:text-white transition-colors">{t.common.privacyPolicy}</Link>
        <Link href="/terms" className="hover:text-white transition-colors">{t.common.termsOfService}</Link>
        <Link href="/" className="hover:text-white transition-colors">{t.common.home}</Link>
      </div>
    </footer>
  )
}
