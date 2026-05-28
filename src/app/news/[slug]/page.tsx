import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ShareButtons from '@/components/ui/ShareButtons'
import NavBar from '@/components/ui/NavBar'
import MediaBlock from '@/components/ui/MediaBlock'
import { SERVICES } from '@/types'

const PILLAR_QUIZ = ['glp1', 'std', 'ckd', 'mens', 'women', 'mind']

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 60

export async function generateStaticParams() {
  const { data } = await supabase
    .from('posts')
    .select('slug')
    .eq('service', 'news')
    .eq('status', 'published')
  return (data || []).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug)
  const { data } = await supabase.from('posts').select('title,meta_desc,image_url,focus_kw').eq('slug', slug).eq('service', 'news').single()
  if (!data) return {}
  return {
    title: data.title + ' — ข่าวรู้ก่อนดี(รู้งี้)',
    description: data.meta_desc,
    keywords: data.focus_kw,
    openGraph: {
      title: data.title + ' — ข่าวรู้ก่อนดี(รู้งี้)',
      description: data.meta_desc,
      images: data.image_url ? [data.image_url] : [],
      type: 'article',
    },
    alternates: { canonical: `https://roogondee.com/news/${slug}` },
  }
}

export default async function NewsPostPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug)
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('service', 'news')
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  const { data: related } = await supabase
    .from('posts')
    .select('id,title,slug,image_url,published_at')
    .eq('service', 'news')
    .eq('status', 'published')
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .limit(3)

  const pillar: string | undefined = post.news_pillar || undefined
  const pillarMeta = pillar ? SERVICES[pillar as keyof typeof SERVICES] : null
  const ctaHref = pillar
    ? (PILLAR_QUIZ.includes(pillar)
        ? `/quiz/${pillar}?utm_source=news&utm_medium=news_cta&utm_campaign=${post.slug}`
        : `/${pillar}?utm_source=news&utm_medium=news_cta&utm_campaign=${post.slug}`)
    : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.meta_desc || post.excerpt || '',
    image: post.image_url || '',
    datePublished: post.published_at || '',
    dateModified: post.published_at || '',
    author: { '@type': 'Organization', name: 'รู้ก่อนดี(รู้งี้)', url: 'https://roogondee.com' },
    publisher: {
      '@type': 'Organization',
      name: 'รู้ก่อนดี(รู้งี้) — บริษัท เจียรักษา จำกัด',
      url: 'https://roogondee.com',
      logo: { '@type': 'ImageObject', url: 'https://roogondee.com/favicon.ico' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://roogondee.com/news/${post.slug}` },
    inLanguage: 'th',
  }

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <NavBar />

      <article className="pt-24 md:pt-28 pb-16 md:pb-24 max-w-3xl mx-auto px-6">
        <div className="text-sm text-muted mb-4">
          <Link href="/" className="hover:text-forest">หน้าแรก</Link>
          <span className="mx-2">/</span>
          <Link href="/news" className="hover:text-forest">ข่าวสาร</Link>
        </div>

        {(post.video_url || post.image_url) && (
          <div className="mb-6 md:mb-8">
            <MediaBlock
              imageUrl={post.image_url}
              videoUrl={post.video_url}
              alt={post.title}
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <h1 className="font-display text-3xl md:text-4xl text-forest leading-tight mb-3 md:mb-4">{post.title}</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 md:mb-10">
          <p className="text-muted text-sm">
            {post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            {pillarMeta && <span className="ml-3 text-xs font-bold px-2 py-1 rounded-full bg-mint/15 text-sage">{pillarMeta.emoji} {pillarMeta.name}</span>}
            {post.category && <span className="ml-2 text-xs font-bold px-2 py-1 rounded-full bg-mint/15 text-sage">{post.category}</span>}
          </p>
          <div className="sm:ml-auto">
            <ShareButtons url={`https://roogondee.com/news/${post.slug}`} title={post.title} />
          </div>
        </div>

        <div className="article-body" dangerouslySetInnerHTML={{ __html: post.content || '' }} />

        {/* CTA — pillar-aware funnel when the news is tagged to a pillar */}
        <div className="mt-10 bg-gradient-to-br from-forest to-sage rounded-3xl p-7 md:p-10 text-white text-center">
          <div className="text-4xl mb-3">{pillarMeta ? pillarMeta.emoji : '💬'}</div>
          {pillarMeta && ctaHref ? (
            <>
              <h3 className="font-display text-xl md:text-2xl mb-2">สนใจ{pillarMeta.name}กับรู้ก่อนดี?</h3>
              <p className="text-white/75 text-sm mb-5">ทำแบบประเมินสั้นๆ รับ voucher ตรวจ/ปรึกษาฟรี ที่ W Medical Hospital สมุทรสาคร</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={ctaHref} className="inline-flex items-center justify-center gap-2 bg-white text-forest px-7 py-3 rounded-full font-bold hover:bg-cream transition-all">{pillarMeta.cta}</Link>
                <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#06C755] text-white px-7 py-3 rounded-full font-bold hover:bg-[#00B04B] transition-all">💬 LINE @roogondee</a>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-display text-xl md:text-2xl mb-2">สนใจตรวจคัดกรองฟรีกับรู้ก่อนดี?</h3>
              <p className="text-white/75 text-sm mb-5">ทำแบบประเมินสั้นๆ รับ voucher ตรวจฟรี ที่ W Medical Hospital สมุทรสาคร</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#06C755] text-white px-7 py-3 rounded-full font-bold hover:bg-[#00B04B] transition-all">💬 LINE @roogondee</a>
                <Link href="/" className="inline-flex items-center justify-center gap-2 bg-white text-forest px-7 py-3 rounded-full font-bold hover:bg-cream transition-all">ดูบริการทั้งหมด</Link>
              </div>
            </>
          )}
        </div>

        {related && related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-2xl text-forest mb-4">ข่าวอื่นๆ</h2>
            <div className="space-y-3">
              {related.map(r => (
                <Link key={r.id} href={`/news/${r.slug}`} className="flex items-center gap-4 bg-white border border-mint/15 rounded-xl p-4 hover:border-mint hover:shadow-sm transition-all">
                  {r.image_url && (
                    <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                      <Image src={r.image_url} alt={r.title} fill className="object-cover" sizes="64px" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-forest line-clamp-2 leading-tight">{r.title}</p>
                    <p className="text-xs text-muted mt-1">{r.published_at ? new Date(r.published_at).toLocaleDateString('th-TH') : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  )
}
