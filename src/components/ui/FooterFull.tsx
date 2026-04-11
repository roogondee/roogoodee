'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'

export default function FooterFull() {
  const { locale, t } = useTranslation()

  return (
    <footer className="bg-dark py-12 md:py-16 px-6 md:px-20 text-white/50">
      <div className="flex flex-col md:flex-row justify-between gap-8 mb-8 md:mb-12 pb-8 md:pb-12 border-b border-white/10">
        <div>
          <div className="font-display text-2xl md:text-3xl text-white mb-2 md:mb-3">
            {locale === 'th' ? <>รู้ก่อน<span className="text-mint italic">ดี</span><span className="text-sm text-white/40 ml-1">(รู้งี้)</span></> : <>RooGon<span className="text-mint italic">Dee</span></>}
          </div>
          <p className="text-sm text-white/40 max-w-xs leading-relaxed">{t.common.brandTagline}</p>
        </div>
        <div>
          <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-4 md:mb-5">{t.home.footerServices}</h4>
          <ul className="space-y-2 text-sm text-white/45">
            <li><Link href="/std" className="hover:text-white transition-colors">{t.home.footerStd}</Link></li>
            <li><Link href="/glp1" className="hover:text-white transition-colors">{t.home.footerGlp1}</Link></li>
            <li><Link href="/ckd" className="hover:text-white transition-colors">{t.home.footerCkd}</Link></li>
            <li><Link href="/foreign" className="hover:text-white transition-colors">{t.home.footerForeign}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-4 md:mb-5">{t.home.footerTools}</h4>
          <ul className="space-y-2 text-sm text-white/45">
            <li><Link href="/tools" className="hover:text-white transition-colors">{t.home.footerCalc}</Link></li>
            <li><Link href="/ask" className="hover:text-white transition-colors">{t.home.footerAsk}</Link></li>
            <li><Link href="/blog" className="hover:text-white transition-colors">{t.home.footerBlog}</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-colors">{t.home.footerFaq}</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">{t.home.footerAbout}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-4 md:mb-5">{t.home.footerContact}</h4>
          <ul className="space-y-2 text-sm text-white/45">
            <li>LINE: @roogondee</li>
            <li>📞 081-902-3540</li>
            <li>roogondee.com</li>
            <li>{t.common.samutsakhon}</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between gap-2 text-xs">
        <span>{t.common.copyright}</span>
        <div className="flex gap-4 text-white/40">
          <Link href="/privacy" className="hover:text-white transition-colors">{t.common.privacyPolicy}</Link>
          <Link href="/terms" className="hover:text-white transition-colors">{t.common.termsOfService}</Link>
        </div>
      </div>
    </footer>
  )
}
