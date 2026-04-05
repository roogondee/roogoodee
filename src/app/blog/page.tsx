import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SERVICE_COLORS: Record<string, string> = {
  std:     'bg-rose-100 text-rose-700',
  glp1:    'bg-emerald-100 text-emerald-700',
  ckd:     'bg-blue-100 text-blue-700',
  foreign: 'bg-amber-100 text-amber-700',
}

const SERVICE_LABELS: Record<string, string> = {
  std:     'STD & PrEP HIV',
  glp1:    'GLP-1 ลดน้ำหนัก',
  ckd:     'CKD Clinic',
  foreign: 'แรงงานต่างด้าว',
}

export const revalidate = 60

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id,title,slug,excerpt,service,image_url,published_at,meta_desc')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <main className="min-h-screen bg-cream">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
        <Link href="/contact" className="bg-forest text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold hover:bg-sage transition-all">💬 ปรึกษาฟรี</Link>
      </nav>

      <div className="pt-24 md:pt-32 pb-16 md:pb-24 px-6 md:px-20">
        <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3 md:mb-4">บทความ</p>
        <h1 className="font-display text-3xl md:text-5xl text-forest mb-3 md:mb-4">ความรู้สุขภาพ</h1>
        <p className="text-muted text-base md:text-lg mb-10 md:mb-16">บทความ Evidence-based อ่านง่าย ครอบคลุมทุกเรื่องสุขภาพ</p>

        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
            {posts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                {post.image_url ? (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-forest/10 to-mint/20 flex items-center justify-center text-4xl">🌿</div>
                )}
                <div className="p-5 md:p-6">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${SERVICE_COLORS[post.service] || 'bg-gray-100 text-gray-600'}`}>
                    {SERVICE_LABELS[post.service] || post.service}
                  </span>
                  <h2 className="font-display text-lg md:text-xl text-forest mt-3 mb-2 leading-tight">{post.title}</h2>
                  <p className="text-muted text-sm leading-relaxed line-clamp-2">{post.meta_desc || post.excerpt}</p>
                  <p className="text-xs text-muted/60 mt-3">{post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH') : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 md:py-24 text-muted">
            <div className="text-6xl mb-4">📰</div>
            <p className="text-lg">บทความกำลังจะมาเร็วๆ นี้ค่ะ</p>
          </div>
        )}
      </div>
    </main>
  )
}
