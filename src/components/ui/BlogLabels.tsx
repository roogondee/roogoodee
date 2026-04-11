'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'

export function BlogHeader() {
  const { t } = useTranslation()
  return (
    <div className="mb-8 md:mb-12">
      <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.blog.label}</p>
      <h1 className="font-display text-3xl md:text-5xl text-forest mb-3">{t.blog.title}</h1>
      <p className="text-muted text-base md:text-lg max-w-lg">{t.blog.desc}</p>
    </div>
  )
}

export function BlogEmpty() {
  const { t } = useTranslation()
  return (
    <div className="text-center py-16 md:py-24 text-muted">
      <div className="text-6xl mb-4">📰</div>
      <p className="text-lg">{t.blog.empty}</p>
    </div>
  )
}

export function BlogAllLabel({ count }: { count: number }) {
  const { t } = useTranslation()
  return (
    <span className="text-xs font-semibold text-forest bg-forest/10 border border-forest/20 px-4 py-2 rounded-full">
      {t.blog.all} ({count})
    </span>
  )
}

export function BlogLatestBadge() {
  const { t } = useTranslation()
  return <span className="text-xs font-bold text-mint bg-mint/10 px-2 py-1 rounded-full">{t.blog.latest}</span>
}

export function BlogReadMore() {
  const { t } = useTranslation()
  return <span className="text-sm font-bold text-forest flex items-center gap-1">{t.blog.readMore}</span>
}

export function BlogToolsCTA() {
  const { t } = useTranslation()
  return (
    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { href: '/tools#bmi', icon: '💉', label: t.blog.calculateBmi },
        { href: '/tools#egfr', icon: '🫘', label: t.blog.calculateEgfr },
        { href: '/ask', icon: '💬', label: t.blog.askExpertFree },
      ].map(item => (
        <Link key={item.href} href={item.href} className="flex items-center gap-3 bg-white border border-mint/20 rounded-xl px-5 py-4 hover:border-mint hover:shadow-sm transition-all text-sm font-semibold text-forest">
          <span className="text-xl">{item.icon}</span>{item.label} →
        </Link>
      ))}
    </div>
  )
}

// For blog/[slug] page
export function BlogPostCTA({ service }: { service: string }) {
  const { t } = useTranslation()
  return (
    <div className="mt-8 bg-gradient-to-br from-forest to-sage rounded-2xl p-7 md:p-8 text-white text-center">
      <h3 className="font-display text-xl md:text-2xl mb-2">{t.blog.needMoreConsult}</h3>
      <p className="text-white/70 text-sm mb-5">{t.blog.needMoreConsultDesc}</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link href={`/contact?service=${service}`} className="bg-white text-forest px-7 py-3 rounded-full font-bold text-sm hover:bg-cream transition-all">
          📝 {t.common.consultFree}
        </Link>
      </div>
    </div>
  )
}

export function BlogShareLabel() {
  const { t } = useTranslation()
  return <p className="text-sm font-semibold text-forest">{t.blog.shareArticle}</p>
}

export function BlogAskMore() {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex items-center gap-4 bg-white border border-mint/20 rounded-2xl px-5 py-4">
      <span className="text-2xl">💬</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-forest">{t.blog.moreQuestion}</p>
        <p className="text-xs text-muted">{t.blog.moreQuestionDesc}</p>
      </div>
      <Link href="/ask" className="flex-shrink-0 text-xs font-bold text-forest border border-forest px-4 py-2 rounded-full hover:bg-forest hover:text-white transition-all">{t.blog.askNow}</Link>
    </div>
  )
}

export function BlogRelatedTitle() {
  const { t } = useTranslation()
  return <h2 className="font-display text-xl text-forest mb-5">{t.blog.relatedArticles}</h2>
}

export function BlogBreadcrumb({ service }: { service: string }) {
  const { t } = useTranslation()
  const SERVICE_PAGES: Record<string, string> = { std: '/std', glp1: '/glp1', ckd: '/ckd', foreign: '/foreign' }
  const SERVICE_LABELS: Record<string, string> = { std: 'STD & PrEP HIV', glp1: 'GLP-1', ckd: 'CKD Clinic', foreign: 'Foreign Worker' }
  const SERVICE_COLORS: Record<string, string> = { std: 'bg-rose-100 text-rose-700', glp1: 'bg-emerald-100 text-emerald-700', ckd: 'bg-blue-100 text-blue-700', foreign: 'bg-amber-100 text-amber-700' }

  return (
    <div className="flex items-center gap-2 text-xs text-muted mb-6 flex-wrap">
      <Link href="/" className="hover:text-forest transition-colors">{t.common.home}</Link>
      <span>›</span>
      <Link href="/blog" className="hover:text-forest transition-colors">{t.blog.label}</Link>
      {service && SERVICE_PAGES[service] && (
        <>
          <span>›</span>
          <Link href={SERVICE_PAGES[service]} className={`font-semibold hover:opacity-80 transition-opacity px-2 py-0.5 rounded-full text-xs ${SERVICE_COLORS[service] || ''}`}>
            {SERVICE_LABELS[service]}
          </Link>
        </>
      )}
    </div>
  )
}

export function BlogServiceCTA({ service }: { service: string }) {
  const { t } = useTranslation()
  const SERVICE_PAGES: Record<string, string> = { std: '/std', glp1: '/glp1', ckd: '/ckd', foreign: '/foreign' }
  const SERVICE_LABELS: Record<string, string> = { std: 'STD & PrEP HIV', glp1: 'GLP-1', ckd: 'CKD Clinic', foreign: 'Foreign Worker' }

  if (!service || !SERVICE_PAGES[service]) return null

  return (
    <div className="mt-10 bg-gradient-to-br from-forest/5 to-mint/10 border border-mint/20 rounded-2xl p-6">
      <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">{t.blog.relatedService}</p>
      <h3 className="font-display text-xl text-forest mb-2">{SERVICE_LABELS[service]}</h3>
      <p className="text-muted text-sm mb-4">{t.blog.viewService}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link href={SERVICE_PAGES[service]} className="flex-1 text-center border-2 border-forest text-forest font-semibold text-sm py-2.5 rounded-full hover:bg-forest hover:text-white transition-all">
          {t.blog.viewService} {SERVICE_LABELS[service]} →
        </Link>
        <Link href={`/contact?service=${service}`} className="flex-1 text-center bg-forest text-white font-semibold text-sm py-2.5 rounded-full hover:bg-sage transition-all">
          📝 {t.common.consultFree}
        </Link>
      </div>
    </div>
  )
}

export function BlogAssessBefore({ href, icon, label }: { href: string; icon: string; label: string }) {
  const { t } = useTranslation()
  return (
    <div className="mb-8 bg-mint/5 border border-mint/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
      <p className="text-sm text-forest font-medium">{t.blog.assessBefore}</p>
      <Link href={href} className="flex-shrink-0 text-xs font-bold bg-forest text-white px-4 py-2 rounded-full hover:bg-sage transition-colors">{icon} {label}</Link>
    </div>
  )
}
