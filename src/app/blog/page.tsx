import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import NavBar from '@/components/ui/NavBar'
import { BlogHeader, BlogEmpty, BlogAllLabel, BlogLatestBadge, BlogReadMore, BlogToolsCTA } from '@/components/ui/BlogLabels'

export const metadata: Metadata = {
  title: 'บทความสุขภาพ — STD, GLP-1, CKD, แรงงานต่างด้าว | รู้ก่อนดี',
  description: 'บทความสุขภาพ Evidence-based อ่านง่าย ครอบคลุม STD & PrEP HIV, ยา GLP-1 ลดน้ำหนัก, CKD โรคไต และสุขภาพแรงงานต่างด้าว',
  alternates: { canonical: 'https://roogondee.com/blog' },
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const SERVICE_COLORS: Record<string, string> = { std: 'bg-rose-100 text-rose-700', glp1: 'bg-emerald-100 text-emerald-700', ckd: 'bg-blue-100 text-blue-700', foreign: 'bg-amber-100 text-amber-700' }
const SERVICE_LABELS: Record<string, string> = { std: 'STD & PrEP HIV', glp1: 'GLP-1', ckd: 'CKD Clinic', foreign: 'Foreign Worker' }
const SERVICE_PAGES: Record<string, string> = { std: '/std', glp1: '/glp1', ckd: '/ckd', foreign: '/foreign' }

export const revalidate = 60

export default async function BlogPage() {
  const { data: posts } = await supabase.from('posts').select('id,title,slug,excerpt,service,image_url,published_at,meta_desc').eq('status', 'published').order('published_at', { ascending: false })
  const counts = (posts || []).reduce<Record<string, number>>((acc, p) => { acc[p.service] = (acc[p.service] || 0) + 1; return acc }, {})

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />
      <div className="pt-24 md:pt-28 pb-16 md:pb-24 px-6 md:px-20">
        <BlogHeader />

        <div className="flex flex-wrap gap-2 mb-8 md:mb-12">
          <BlogAllLabel count={(posts || []).length} />
          {Object.entries(SERVICE_LABELS).map(([key, label]) => counts[key] ? (
            <Link key={key} href={SERVICE_PAGES[key]} className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all hover:-translate-y-0.5 ${SERVICE_COLORS[key]} border-current/20 hover:shadow-sm`}>{label} ({counts[key]})</Link>
          ) : null)}
        </div>

        {posts && posts.length > 0 ? (
          <>
            <Link href={`/blog/${posts[0].slug}`} className="block bg-white rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 mb-6 md:mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {posts[0].image_url ? (
                  <div className="aspect-video md:aspect-auto md:min-h-64 bg-gray-100 overflow-hidden relative">
                    <Image src={posts[0].image_url} alt={posts[0].title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
                  </div>
                ) : (
                  <div className="aspect-video md:aspect-auto md:min-h-64 bg-gradient-to-br from-forest/10 to-mint/20 flex items-center justify-center text-6xl">🌿</div>
                )}
                <div className="p-7 md:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${SERVICE_COLORS[posts[0].service] || 'bg-gray-100 text-gray-600'}`}>{SERVICE_LABELS[posts[0].service] || posts[0].service}</span>
                    <BlogLatestBadge />
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl text-forest leading-tight mb-3">{posts[0].title}</h2>
                  <p className="text-muted text-sm leading-relaxed line-clamp-3 mb-4">{posts[0].meta_desc || posts[0].excerpt}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted/60">{posts[0].published_at ? new Date(posts[0].published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
                    <BlogReadMore />
                  </div>
                </div>
              </div>
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {posts.slice(1).map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                  {post.image_url ? (
                    <div className="aspect-video bg-gray-100 overflow-hidden relative"><Image src={post.image_url} alt={post.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /></div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-forest/10 to-mint/20 flex items-center justify-center text-4xl">🌿</div>
                  )}
                  <div className="p-5 md:p-6">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${SERVICE_COLORS[post.service] || 'bg-gray-100 text-gray-600'}`}>{SERVICE_LABELS[post.service] || post.service}</span>
                    <h2 className="font-display text-lg md:text-xl text-forest mt-3 mb-2 leading-tight">{post.title}</h2>
                    <p className="text-muted text-sm leading-relaxed line-clamp-2">{post.meta_desc || post.excerpt}</p>
                    <p className="text-xs text-muted/60 mt-3">{post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH') : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <BlogEmpty />
        )}

        <BlogToolsCTA />
      </div>
    </main>
  )
}
