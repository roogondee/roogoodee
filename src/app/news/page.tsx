import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import NavBar from '@/components/ui/NavBar'
import NewsList from '@/components/news/NewsList'

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
    .select('id,title,slug,excerpt,category,news_pillar,image_url,published_at,meta_desc')
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
          <p className="text-muted text-base md:text-lg max-w-xl">โปรโมชั่น ตรวจฟรี วันสุขภาพ และอัปเดตบริการ — ครอบคลุมทุกด้านสุขภาพ</p>
        </div>

        {posts && posts.length > 0 ? (
          <NewsList posts={posts} />
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
