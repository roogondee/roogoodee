'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import { track } from '@/lib/analytics/track'

// Site-wide promo for /medical-certificate — the verifiable certificate
// (cert.roogondee.com QR) is the selling point against certificates sold
// without an exam. Reuses the homepage `home.cert*` copy so every placement
// says the same thing in th/en/my. `position` tags the click so placements
// can be compared; medcert_banner_click is internal navigation and is
// deliberately NOT an Ads conversion (the contact events fire on the page).
export default function CertPromoBanner({ position, className = '' }: { position: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <aside className={`rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 ${className}`}>
      <div className="flex-1">
        <p className="text-[11px] font-bold tracking-widest uppercase text-emerald-800 mb-1">{t.home.certTag}</p>
        <p className="font-display text-lg md:text-xl text-forest leading-snug mb-2">{t.home.certTitle}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm text-rtext">
          {[t.home.certPoint1, t.home.certPoint2, t.home.certPoint3].map(p => (
            <li key={p} className="flex gap-1.5"><span className="text-mint font-bold">✓</span>{p}</li>
          ))}
        </ul>
      </div>
      <Link
        href={`/medical-certificate?utm_source=site&utm_medium=banner&utm_campaign=${encodeURIComponent(position)}`}
        onClick={() => track('medcert_banner_click', { position })}
        className="inline-flex items-center justify-center bg-forest text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-sage transition-colors flex-shrink-0"
      >
        {t.home.certCta}
      </Link>
    </aside>
  )
}
