'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl mb-6">🌿</div>
      <h1 className="font-display text-5xl md:text-6xl text-forest mb-4">404</h1>
      <p className="text-xl text-forest font-semibold mb-2">{t.notFound.title}</p>
      <p className="text-muted text-sm md:text-base mb-10 max-w-sm leading-relaxed">{t.notFound.desc}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="bg-forest text-white px-8 py-3.5 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
          ← {t.notFound.backHome}
        </Link>
        <Link href="/contact" className="border-2 border-forest text-forest px-8 py-3.5 rounded-full text-sm font-bold hover:bg-forest hover:text-white transition-all">
          💬 {t.common.consultFree}
        </Link>
      </div>
      <div className="mt-14 flex flex-wrap justify-center gap-3 max-w-md">
        {[
          { href: '/std', label: '🔴 STD & PrEP' },
          { href: '/glp1', label: '💉 GLP-1' },
          { href: '/ckd', label: '🫘 CKD' },
          { href: '/tools', label: '🧮 ' + t.common.calculator },
          { href: '/ask', label: '💬 ' + t.common.askExpert },
          { href: '/blog', label: '📚 ' + t.common.articles },
        ].map(l => (
          <Link key={l.href} href={l.href} className="text-xs font-medium text-sage bg-mint/10 border border-mint/20 px-4 py-2 rounded-full hover:bg-mint/20 transition-colors">{l.label}</Link>
        ))}
      </div>
    </main>
  )
}
