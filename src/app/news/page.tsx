import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import NavBar from '@/components/ui/NavBar'

export const metadata: Metadata = {
  title: 'ข่าวสารรู้ก่อนดี — โปรโมชั่น ตรวจฟรี และอัปเดตสุขภาพ | รู้ก่อนดี(รู้งี้)',
  description: 'รวมข่าวสาร โปรโมชั่น voucher ตรวจฟรี วันสุขภาพ และอัปเดตบริการของรู้ก่อนดี — ครอบคลุม GLP-1, STD/PrEP, CKD, สุขภาพชาย/หญิง และสุขภาพจิต',
  alternates: { canonical: 'https://roogondee.com/news' },
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export const revalidate = 60

export default async function NewsPage() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id,title,slug,excerpt,category,image_url,published_at,meta_desc')
    .eq('service', 'news')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />
      <div className="pt-24 md:pt-28 pb-16 md:pb-24 px-6 md:px-20">
        <div className="mb-8 md:mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2 md:mb-3">News</p>
          <h1 className="font-display text-3xl md:text-5xl text-forest mb-3">ข่าวสารรู้ก่อนดี</h1>
          <p className="text-muted text-base md:text-lg max-w-xl">โปรโมชั่น ตรวจฟรี วันสุขภาพ และอัปเดตบริการ — รวมไว้ที่เดียว</p>
        </div>

        {posts && posts.length > 0 ? (
          <>
            <Link href={`/news/${posts[0].slug}`} className="block bg-white rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 mb-6 md:mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {posts[0].image_url ? (
                  <div className="aspect-video md:aspect-auto md:min-h-64 bg-gray-100 overflow-hidden relative">
                    <Image src={posts[0].image_url} alt={posts[0].title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
                  </div>
                ) : (
                  <div className="aspect-video md:aspect-auto md:min-h-64 bg-gradient-to-br from-forest/10 to-mint/20 flex items-center justify-center text-6xl">📰</div>
                )}
                <div className="p-7 md:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    {posts[0].category && <span className="text-xs font-bold px-2 py-1 rounded-full bg-mint/15 text-sage">{posts[0].category}</span>}
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">ล่าสุด</span>
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl text-forest leading-tight mb-3">{posts[0].title}</h2>
                  <p className="text-muted text-sm leading-relaxed line-clamp-3 mb-4">{posts[0].meta_desc || posts[0].excerpt}</p>
                  <p className="text-xs text-muted/60">{posts[0].published_at ? new Date(posts[0].published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
                </div>
              </div>
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {posts.slice(1).map(post => (
                <Link key={post.id} href={`/news/${post.slug}`} className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                  {post.image_url ? (
                    <div className="aspect-video bg-gray-100 overflow-hidden relative"><Image src={post.image_url} alt={post.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /></div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-forest/10 to-mint/20 flex items-center justify-center text-4xl">📰</div>
                  )}
                  <div className="p-5 md:p-6">
                    {post.category && <span className="text-xs font-bold px-2 py-1 rounded-full bg-mint/15 text-sage">{post.category}</span>}
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
            <p>ยังไม่มีข่าวในขณะนี้ — กลับมาดูใหม่เร็วๆ นี้</p>
          </div>
        )}
      </div>
    </main>
  )
}
