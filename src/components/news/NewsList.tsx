'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SERVICES } from '@/types'

export interface NewsItem {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  news_pillar?: string | null
  image_url: string
  published_at: string
  meta_desc: string
}

const PILLAR_ORDER = ['glp1', 'std', 'ckd', 'foreign', 'mens', 'women', 'mind'] as const

const PILLAR_COLORS: Record<string, string> = {
  std: 'bg-rose-100 text-rose-700',
  glp1: 'bg-emerald-100 text-emerald-700',
  ckd: 'bg-blue-100 text-blue-700',
  foreign: 'bg-amber-100 text-amber-700',
  mens: 'bg-indigo-100 text-indigo-700',
  women: 'bg-pink-100 text-pink-700',
  mind: 'bg-violet-100 text-violet-700',
}

function pillarMeta(p?: string | null) {
  if (!p) return null
  return SERVICES[p as keyof typeof SERVICES] || null
}

function PillarBadge({ pillar }: { pillar?: string | null }) {
  const meta = pillarMeta(pillar)
  if (!pillar || !meta) return null
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${PILLAR_COLORS[pillar] || 'bg-mint/15 text-sage'}`}>
      {meta.emoji} {meta.name}
    </span>
  )
}

export default function NewsList({ posts }: { posts: NewsItem[] }) {
  const [active, setActive] = useState<string | null>(null)

  // tabs: only pillars that actually have at least one news item
  const available = PILLAR_ORDER.filter(p => posts.some(x => x.news_pillar === p))
  const filtered = active ? posts.filter(p => p.news_pillar === active) : posts
  const featured = filtered[0]
  const rest = filtered.slice(1)

  return (
    <>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-7 md:mb-9">
          <button
            onClick={() => setActive(null)}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
              active === null ? 'bg-forest text-white' : 'bg-white text-muted hover:bg-mint/10 hover:text-forest'
            }`}
          >
            ทั้งหมด
          </button>
          {available.map(p => {
            const meta = pillarMeta(p)
            return (
              <button
                key={p}
                onClick={() => setActive(p)}
                className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
                  active === p ? 'bg-forest text-white' : 'bg-white text-muted hover:bg-mint/10 hover:text-forest'
                }`}
              >
                {meta?.emoji} {meta?.name}
              </button>
            )
          })}
        </div>
      )}

      {featured ? (
        <>
          <Link href={`/news/${featured.slug}`} className="block bg-white rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 mb-6 md:mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {featured.image_url ? (
                <div className="aspect-video md:aspect-auto md:min-h-64 bg-gray-100 overflow-hidden relative">
                  <Image src={featured.image_url} alt={featured.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
              ) : (
                <div className="aspect-video md:aspect-auto md:min-h-64 bg-gradient-to-br from-forest/10 to-mint/20 flex items-center justify-center text-6xl">📰</div>
              )}
              <div className="p-7 md:p-10 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <PillarBadge pillar={featured.news_pillar} />
                  {featured.category && <span className="text-xs font-bold px-2 py-1 rounded-full bg-mint/15 text-sage">{featured.category}</span>}
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">ล่าสุด</span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl text-forest leading-tight mb-3">{featured.title}</h2>
                <p className="text-muted text-sm leading-relaxed line-clamp-3 mb-4">{featured.meta_desc || featured.excerpt}</p>
                <p className="text-xs text-muted/60">{featured.published_at ? new Date(featured.published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {rest.map(post => (
              <Link key={post.id} href={`/news/${post.slug}`} className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                {post.image_url ? (
                  <div className="aspect-video bg-gray-100 overflow-hidden relative"><Image src={post.image_url} alt={post.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /></div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-forest/10 to-mint/20 flex items-center justify-center text-4xl">📰</div>
                )}
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PillarBadge pillar={post.news_pillar} />
                    {post.category && <span className="text-xs font-bold px-2 py-1 rounded-full bg-mint/15 text-sage">{post.category}</span>}
                  </div>
                  <h2 className="font-display text-lg md:text-xl text-forest mt-3 mb-2 leading-tight">{post.title}</h2>
                  <p className="text-muted text-sm leading-relaxed line-clamp-2">{post.meta_desc || post.excerpt}</p>
                  <p className="text-xs text-muted/60 mt-3">{post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH') : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 md:py-24 text-muted">
          <div className="text-5xl mb-4">📰</div>
          <p>ยังไม่มีข่าวในหมวดนี้ — ลองดูหมวดอื่น</p>
        </div>
      )}
    </>
  )
}
