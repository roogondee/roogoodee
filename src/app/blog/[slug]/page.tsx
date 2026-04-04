import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET!
)

export const revalidate = 60

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = await supabase.from('posts').select('title,meta_desc,image_url').eq('slug', params.slug).single()
  if (!data) return {}
  return {
    title: data.title + ' — รู้ก่อนดี',
    description: data.meta_desc,
    openGraph: { images: data.image_url ? [data.image_url] : [] },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  return (
    <main className="min-h-screen bg-cream">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
        <Link href="/contact" className="bg-forest text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold hover:bg-sage transition-all">💬 ปรึกษาฟรี</Link>
      </nav>

      <article className="pt-24 md:pt-32 pb-16 md:pb-24 max-w-3xl mx-auto px-6">
        <Link href="/blog" className="text-muted text-sm hover:text-forest transition-colors mb-6 flex items-center gap-1">← กลับหน้าบทความ</Link>
        {post.image_url && (
          <div className="rounded-2xl overflow-hidden mb-6 md:mb-8 aspect-video">
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <h1 className="font-display text-3xl md:text-4xl text-forest leading-tight mb-3 md:mb-4">{post.title}</h1>
        <p className="text-muted text-sm mb-6 md:mb-8">
          {post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' }) : ''}
        </p>
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />

        {/* CTA */}
        <div className="mt-12 md:mt-16 bg-gradient-to-br from-forest to-sage rounded-2xl p-7 md:p-8 text-white text-center">
          <h3 className="font-display text-xl md:text-2xl mb-2">ต้องการปรึกษาเพิ่มเติม?</h3>
          <p className="text-white/70 text-sm mb-5 md:mb-6">ทีมผู้เชี่ยวชาญพร้อมตอบทุกคำถามค่ะ ฟรี ไม่ตัดสิน</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-forest px-8 py-3 rounded-full font-bold text-sm hover:bg-cream transition-all">
            📝 ปรึกษาฟรีเลย
          </Link>
        </div>
      </article>
    </main>
  )
}
