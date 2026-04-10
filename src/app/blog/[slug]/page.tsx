import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ShareButtons from '@/components/ui/ShareButtons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 60

export async function generateStaticParams() {
  const { data } = await supabase
    .from('posts')
    .select('slug')
    .eq('status', 'published')
  return (data || []).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug)
  const { data } = await supabase.from('posts').select('title,meta_desc,image_url,focus_kw,service').eq('slug', slug).single()
  if (!data) return {}
  return {
    title: data.title + ' — รู้ก่อนดี',
    description: data.meta_desc,
    keywords: data.focus_kw,
    openGraph: {
      title: data.title + ' — รู้ก่อนดี',
      description: data.meta_desc,
      images: data.image_url ? [data.image_url] : [],
      type: 'article',
    },
    alternates: { canonical: `https://roogondee.com/blog/${slug}` },
  }
}

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD & PrEP HIV', glp1: 'GLP-1 ลดน้ำหนัก', ckd: 'CKD Clinic', foreign: 'แรงงานต่างด้าว',
}
const SERVICE_COLORS: Record<string, string> = {
  std: 'bg-rose-100 text-rose-700', glp1: 'bg-emerald-100 text-emerald-700',
  ckd: 'bg-blue-100 text-blue-700', foreign: 'bg-amber-100 text-amber-700',
}
const SERVICE_PAGES: Record<string, string> = {
  std: '/std', glp1: '/glp1', ckd: '/ckd', foreign: '/foreign',
}
const SERVICE_TOOLS: Record<string, { href: string; label: string; icon: string }> = {
  std:     { href: '/tools#prep', label: 'ทำ PrEP Risk Quiz', icon: '🔴' },
  glp1:    { href: '/tools#bmi', label: 'คำนวณ BMI & GLP-1', icon: '💉' },
  ckd:     { href: '/tools#egfr', label: 'คำนวณ eGFR (CKD)', icon: '🫘' },
  foreign: { href: '/contact?service=foreign', label: 'ขอใบเสนอราคา B2B', icon: '📋' },
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug)
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  // Fetch 3 related posts (same service, different slug)
  const { data: related } = await supabase
    .from('posts')
    .select('id,title,slug,service,image_url,published_at')
    .eq('status', 'published')
    .eq('service', post.service)
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .limit(3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_desc || post.excerpt || '',
    image: post.image_url || '',
    datePublished: post.published_at || '',
    dateModified: post.published_at || '',
    author: { '@type': 'Organization', name: 'รู้ก่อนดี', url: 'https://roogondee.com' },
    publisher: {
      '@type': 'Organization',
      name: 'รู้ก่อนดี — บริษัท เจียรักษา จำกัด',
      url: 'https://roogondee.com',
      logo: { '@type': 'ImageObject', url: 'https://roogondee.com/favicon.ico' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://roogondee.com/blog/${post.slug}` },
    keywords: post.focus_kw || '',
    inLanguage: 'th',
  }

  const tool = SERVICE_TOOLS[post.service]

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
        <div className="hidden md:flex items-center gap-5 text-sm text-muted">
          <Link href="/blog" className="hover:text-forest transition-colors">บทความ</Link>
          <Link href="/tools" className="hover:text-forest transition-colors">เครื่องคำนวณ</Link>
          <Link href="/ask" className="hover:text-forest transition-colors">ถามผู้เชี่ยวชาญ</Link>
        </div>
        <Link href={`/contact?service=${post.service}`} className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
          💬 ปรึกษาฟรี
        </Link>
      </nav>

      <article className="pt-24 md:pt-28 pb-16 md:pb-24 max-w-3xl mx-auto px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted mb-6 flex-wrap">
          <Link href="/" className="hover:text-forest transition-colors">หน้าแรก</Link>
          <span>›</span>
          <Link href="/blog" className="hover:text-forest transition-colors">บทความ</Link>
          {post.service && SERVICE_PAGES[post.service] && (
            <>
              <span>›</span>
              <Link href={SERVICE_PAGES[post.service]} className={`font-semibold hover:opacity-80 transition-opacity px-2 py-0.5 rounded-full text-xs ${SERVICE_COLORS[post.service] || ''}`}>
                {SERVICE_LABELS[post.service]}
              </Link>
            </>
          )}
        </div>

        {/* Cover image */}
        {post.image_url && (
          <div className="rounded-2xl overflow-hidden mb-6 md:mb-8 aspect-video relative">
            <Image src={post.image_url} alt={post.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 768px" />
          </div>
        )}

        {/* Title */}
        <h1 className="font-display text-3xl md:text-4xl text-forest leading-tight mb-3 md:mb-4">{post.title}</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 md:mb-10">
          <p className="text-muted text-sm">
            {post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' }) : ''}
            {post.focus_kw && <span className="ml-3 text-xs text-muted/60">#{post.focus_kw.split(',')[0].trim()}</span>}
          </p>
          <div className="sm:ml-auto">
            <ShareButtons url={`https://roogondee.com/blog/${post.slug}`} title={post.title} />
          </div>
        </div>

        {/* Tool inline CTA (before article) */}
        {tool && (
          <div className="mb-8 bg-mint/5 border border-mint/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-forest font-medium">ประเมินสุขภาพเบื้องต้นก่อนอ่านบทความ</p>
            <Link href={tool.href} className="flex-shrink-0 text-xs font-bold bg-forest text-white px-4 py-2 rounded-full hover:bg-sage transition-colors">
              {tool.icon} {tool.label}
            </Link>
          </div>
        )}

        {/* Article content */}
        <div className="article-body" dangerouslySetInnerHTML={{ __html: post.content || '' }} />

        {/* Service page CTA */}
        {post.service && SERVICE_PAGES[post.service] && (
          <div className="mt-10 bg-gradient-to-br from-forest/5 to-mint/10 border border-mint/20 rounded-2xl p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">บริการที่เกี่ยวข้อง</p>
            <h3 className="font-display text-xl text-forest mb-2">{SERVICE_LABELS[post.service]}</h3>
            <p className="text-muted text-sm mb-4">ดูรายละเอียดบริการ ราคา และขั้นตอนทั้งหมด</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={SERVICE_PAGES[post.service]} className="flex-1 text-center border-2 border-forest text-forest font-semibold text-sm py-2.5 rounded-full hover:bg-forest hover:text-white transition-all">
                ดูบริการ {SERVICE_LABELS[post.service]} →
              </Link>
              <Link href={`/contact?service=${post.service}`} className="flex-1 text-center bg-forest text-white font-semibold text-sm py-2.5 rounded-full hover:bg-sage transition-all">
                📝 ปรึกษาฟรี
              </Link>
            </div>
          </div>
        )}

        {/* Main CTA */}
        <div className="mt-8 bg-gradient-to-br from-forest to-sage rounded-2xl p-7 md:p-8 text-white text-center">
          <h3 className="font-display text-xl md:text-2xl mb-2">ต้องการปรึกษาเพิ่มเติม?</h3>
          <p className="text-white/70 text-sm mb-5">ทีมผู้เชี่ยวชาญพร้อมตอบทุกคำถามค่ะ ฟรี ไม่ตัดสิน ตอบภายใน 30 นาที</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href={`/contact?service=${post.service}`} className="bg-white text-forest px-7 py-3 rounded-full font-bold text-sm hover:bg-cream transition-all">
              📝 ปรึกษาฟรีเลย
            </Link>
            {tool && (
              <Link href={tool.href} className="bg-white/15 border border-white/30 text-white px-7 py-3 rounded-full font-semibold text-sm hover:bg-white/25 transition-all">
                {tool.icon} {tool.label}
              </Link>
            )}
          </div>
        </div>

        {/* Share bottom */}
        <div className="mt-8 bg-white border border-mint/15 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-semibold text-forest">บทความนี้มีประโยชน์? แชร์ให้เพื่อน</p>
          <div className="sm:ml-auto">
            <ShareButtons url={`https://roogondee.com/blog/${post.slug}`} title={post.title} />
          </div>
        </div>

        {/* Ask a question */}
        <div className="mt-4 flex items-center gap-4 bg-white border border-mint/20 rounded-2xl px-5 py-4">
          <span className="text-2xl">💬</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-forest">มีคำถามเพิ่มเติม?</p>
            <p className="text-xs text-muted">ถามผู้เชี่ยวชาญได้ทันที ฟรี ไม่ต้องสมัครสมาชิก</p>
          </div>
          <Link href="/ask" className="flex-shrink-0 text-xs font-bold text-forest border border-forest px-4 py-2 rounded-full hover:bg-forest hover:text-white transition-all">
            ถามเลย →
          </Link>
        </div>

        {/* Related posts */}
        {related && related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-xl text-forest mb-5">บทความที่เกี่ยวข้อง</h2>
            <div className="space-y-3">
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="flex items-center gap-4 bg-white border border-mint/15 rounded-xl p-4 hover:border-mint hover:shadow-sm transition-all">
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
