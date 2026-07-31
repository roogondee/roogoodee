import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { unstable_noStore as noStore } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'ทีมผู้เชี่ยวชาญสุขภาพจิต — Roogondee Mind',
  description: 'พบกับนักจิตวิทยาคลินิกและจิตแพทย์ที่มีใบอนุญาต ทำงานกับ Roogondee เพื่อดูแลคุณ — telehealth ส่วนตัว ไม่ตัดสิน',
  alternates: { canonical: 'https://roogondee.com/mind/team' },
}

// Render at request time so Supabase env vars aren't required during
// `next build` page-data collection (matches admin route behavior).
export const dynamic = 'force-dynamic'

interface Provider {
  id: string
  name: string
  title: string | null
  photo_url: string | null
  bio: string | null
  specialties: string[] | null
  languages: string[] | null
}

const SPECIALTY_LABEL: Record<string, string> = {
  mood: 'อารมณ์ / ซึมเศร้า',
  anxiety: 'วิตกกังวล',
  sleep: 'การนอน',
  burnout: 'เครียดงาน / burnout',
  relationship: 'ความสัมพันธ์ / คู่รัก',
  family: 'ครอบครัว',
  grief: 'สูญเสีย / อกหัก',
  self_esteem: 'self-esteem',
  trauma: 'trauma / PTSD',
  lgbtq: 'LGBTQ+ affirmative',
}

const LANG_LABEL: Record<string, string> = {
  th: 'ไทย',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
}

async function fetchActiveProviders(): Promise<Provider[]> {
  // supabase-js's fetch is wrapped by Next's data cache even with
  // `dynamic = 'force-dynamic'`. noStore() opts every read on this
  // request out of that cache so deactivated providers disappear
  // immediately instead of after the next deploy.
  noStore()
  const { data, error } = await supabaseAdmin
    .from('mind_providers')
    .select('id, name, title, photo_url, bio, specialties, languages, display_order')
    .eq('active', true)
    .order('display_order', { ascending: true })
    .limit(50)

  if (error) {
    console.error('mind/team: failed to fetch providers', error)
    return []
  }
  return data as Provider[]
}

export default async function MindTeamPage() {
  const providers = await fetchActiveProviders()

  return (
    <main className="min-h-screen bg-cream">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl text-forest">
          <span className="text-forest">รู้ก่อน</span><span className="text-mint italic">ดี</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/mind" className="text-sm text-muted hover:text-forest transition-colors">
            ← Mind
          </Link>
          <Link href="/quiz/mind" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
            ทำแบบประเมินฟรี
          </Link>
        </div>
      </nav>

      <section className="pt-32 pb-12 px-6 md:px-20 bg-gradient-to-br from-violet-50 via-cream to-cream">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-200 text-violet-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            🧠 Mind · ทีมผู้เชี่ยวชาญ
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-forest leading-tight mb-4">
            พบกับ<em className="text-violet-700">ผู้เชี่ยวชาญที่มีใบอนุญาต</em><br/>ที่จะดูแลคุณ
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed max-w-2xl">
            นักจิตวิทยาคลินิกและจิตแพทย์ที่ได้รับใบอนุญาตประกอบวิชาชีพตามกฎหมายไทย — ทำ telehealth (video/phone) ส่วนตัว ไม่ตัดสิน
          </p>
        </div>
      </section>

      {providers.length === 0 ? <WaitlistState /> : <ProvidersGrid providers={providers} />}

      <section className="px-6 md:px-20 py-12 bg-rose-50 border-y-2 border-rose-200">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
          <span className="font-bold text-rose-700 text-sm whitespace-nowrap">🆘 ถ้าคุณกำลังอยู่ในวิกฤต</span>
          <p className="text-sm text-rose-900 leading-relaxed">
            สายด่วนสุขภาพจิต กรมสุขภาพจิต โทร 1323 (ฟรี 24 ชม. เป็นความลับ)
          </p>
          <a href="tel:1323" className="md:ml-auto whitespace-nowrap bg-rose-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-rose-700 transition-all">
            📞 1323
          </a>
        </div>
      </section>

      <footer className="bg-dark py-8 px-6 md:px-20 text-white/40 text-xs flex flex-col md:flex-row justify-between gap-2">
        <span>© 2026 บริษัท เจียรักษา จำกัด | รู้ก่อนดี(รู้งี้)</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/terms" className="hover:text-white transition-colors">ข้อตกลงการใช้บริการ</Link>
          <Link href="/" className="hover:text-white transition-colors">หน้าแรก</Link>
        </div>
      </footer>
    </main>
  )
}

function WaitlistState() {
  return (
    <section className="py-16 px-6 md:px-20 bg-white">
      <div className="max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-8 md:p-12 text-center">
        <span className="text-5xl block mb-4">🌱</span>
        <h2 className="font-display text-2xl md:text-3xl text-forest mb-3">
          กำลังคัดเลือกทีมผู้เชี่ยวชาญ
        </h2>
        <p className="text-muted leading-relaxed mb-6 max-w-2xl mx-auto">
          เรากำลังสัมภาษณ์และคัดเลือกนักจิตวิทยาคลินิกและจิตแพทย์ที่ดีที่สุดมาร่วมทีม
          เมื่อพร้อม เราจะแสดงรายชื่อ ประวัติ และความเชี่ยวชาญของแต่ละท่านที่นี่ — เพื่อให้คุณเลือกคุยกับคนที่เหมาะที่สุด
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/quiz/mind" className="bg-forest text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
            ลงทะเบียนรับ voucher ก่อน
          </Link>
          <a href="https://line.me/R/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
            💬 LINE @roogondee
          </a>
        </div>
        <p className="text-xs text-muted/70 mt-6">
          เมื่อทีมพร้อม เราจะติดต่อกลับท่านที่ลงทะเบียนไว้ก่อน
        </p>
      </div>
    </section>
  )
}

function ProvidersGrid({ providers }: { providers: Provider[] }) {
  return (
    <section className="py-12 md:py-16 px-6 md:px-20 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {providers.map(p => (
            <article key={p.id} className="bg-white border border-violet-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[4/5] bg-gradient-to-br from-violet-100 to-violet-50 relative">
                {p.photo_url ? (
                  <Image src={p.photo_url} alt={p.name} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-6xl text-violet-300">👤</div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl text-forest mb-1">{p.name}</h3>
                {p.title && <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">{p.title}</p>}
                {p.bio && <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-4">{p.bio}</p>}
                {p.specialties && p.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.specialties.map(s => (
                      <span key={s} className="text-xs bg-violet-50 border border-violet-100 text-violet-700 px-2 py-1 rounded-full">
                        {SPECIALTY_LABEL[s] || s}
                      </span>
                    ))}
                  </div>
                )}
                {p.languages && p.languages.length > 0 && (
                  <p className="text-xs text-muted">
                    🗣 {p.languages.map(l => LANG_LABEL[l] || l).join(', ')}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/quiz/mind" className="inline-flex bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
            ทำแบบประเมินฟรี — เราจะแมตช์ให้เหมาะกับคุณ
          </Link>
        </div>
      </div>
    </section>
  )
}
