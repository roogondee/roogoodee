'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'
import FooterFull from '@/components/ui/FooterFull'
import homepageImages from '@/config/homepage-images'

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  service: string
  image_url: string
  published_at: string
  meta_desc: string
}

const SERVICE_COLORS: Record<string, string> = {
  std: 'bg-rose-100 text-rose-700',
  glp1: 'bg-emerald-100 text-emerald-700',
  ckd: 'bg-blue-100 text-blue-700',
  foreign: 'bg-amber-100 text-amber-700',
  mens: 'bg-indigo-100 text-indigo-700',
}

export default function HomeClient({ posts }: { posts: Post[] | null }) {
  const { locale, t } = useTranslation()
  const brand = locale === 'th' ? <>รู้ก่อน<span className="text-mint italic">ดี</span></> : <>RooGon<span className="text-mint italic">Dee</span></>

  const TRUST_STATS = [
    { num: t.home.stat1Num, label: t.home.stat1Label },
    { num: t.home.stat2Num, label: t.home.stat2Label },
    { num: t.home.stat3Num, label: t.home.stat3Label },
    { num: t.home.stat4Num, label: t.home.stat4Label },
  ]

  const SERVICES = [
    { key: 'std',     emoji: '🔴', tag: 'Sexual Health',     color: 'from-pink-50 to-rose-100 border-rose-200',     name: t.home.stdName,     desc: t.home.stdDesc,     features: [t.home.stdFeature1, t.home.stdFeature2, t.home.stdFeature3],         href: '/std' },
    { key: 'glp1',   emoji: '💉', tag: 'Weight Management', color: 'from-green-50 to-emerald-100 border-emerald-200', name: t.home.glp1Name,   desc: t.home.glp1Desc,   features: [t.home.glp1Feature1, t.home.glp1Feature2, t.home.glp1Feature3],     href: '/glp1' },
    { key: 'ckd',    emoji: '🫘', tag: 'Kidney Health',     color: 'from-blue-50 to-indigo-100 border-indigo-200',   name: t.home.ckdName,    desc: t.home.ckdDesc,    features: [t.home.ckdFeature1, t.home.ckdFeature2, t.home.ckdFeature3],       href: '/ckd' },
    { key: 'foreign',emoji: '🧪', tag: 'Corporate Health',  color: 'from-yellow-50 to-amber-100 border-amber-200',  name: t.home.foreignName, desc: t.home.foreignDesc, features: [t.home.foreignFeature1, t.home.foreignFeature2, t.home.foreignFeature3], href: '/foreign' },
    { key: 'mens',   emoji: '🧔', tag: 'Men\'s Health 40+', color: 'from-slate-50 to-indigo-100 border-indigo-200', name: t.home.mensName,    desc: t.home.mensDesc,    features: [t.home.mensFeature1, t.home.mensFeature2, t.home.mensFeature3],         href: '/mens' },
  ]

  const STEPS = [
    { num: '01', icon: '📝', title: t.home.step1Title, desc: t.home.step1Desc },
    { num: '02', icon: '🩺', title: t.home.step2Title, desc: t.home.step2Desc },
    { num: '03', icon: '🏥', title: t.home.step3Title, desc: t.home.step3Desc },
  ]

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />

      {/* HERO */}
      {locale === 'th' ? (
        <VoucherHero />
      ) : (
        <section className="min-h-screen grid grid-cols-1 md:grid-cols-2 pt-16 md:pt-20">
        <div className="flex flex-col justify-center px-6 md:px-20 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 bg-mint/10 border border-mint/30 text-sage px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-6 md:mb-8 w-fit">
            <span className="w-2 h-2 bg-mint rounded-full animate-pulse"></span>
            {t.home.heroTagline}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-4 md:mb-6">
            {t.home.heroTitle1}<br/><em className="text-mint">{t.home.heroTitle2}</em>
          </h1>
          <p className="text-base md:text-lg text-muted leading-relaxed mb-8 md:mb-10 max-w-md whitespace-pre-line">{t.home.heroDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Link href="/contact" className="flex items-center justify-center gap-2 bg-forest text-white px-6 md:px-8 py-3.5 md:py-4 rounded-full text-sm md:text-base font-semibold hover:bg-sage transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-xl">
              {t.home.ctaConsult}
            </Link>
            <Link href="/blog" className="flex items-center justify-center gap-2 border-2 border-forest text-forest px-5 md:px-7 py-3.5 md:py-4 rounded-full text-sm md:text-base font-semibold hover:bg-forest hover:text-white transition-all">
              {t.home.ctaArticles}
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-6 mt-8 md:mt-12">
            {[['✓', t.home.trustFree], ['🔒', t.home.trustSafe], ['⚡', t.home.trustFast]].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-xs md:text-sm text-muted font-medium">
                <div className="w-6 h-6 bg-mint/15 rounded-full flex items-center justify-center text-xs flex-shrink-0">{icon}</div>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center overflow-hidden py-16 md:py-0 min-h-64 md:min-h-0">
          {homepageImages.hero ? (
            <Image src={homepageImages.hero} alt="W Medical Hospital" fill className="object-cover" priority sizes="50vw" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-forest/70 via-sage/60 to-mint/50" />
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-10 w-72 md:w-80 z-10 relative">
            <div className="w-12 md:w-14 h-12 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-5">🌿</div>
            <h3 className="font-display text-xl md:text-2xl text-white mb-2 md:mb-3">{t.home.heroCardTitle}</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-5 md:mb-6">{t.home.heroCardDesc}</p>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-white text-sm font-semibold">💬 LINE: @roogondee</div>
          </div>
        </div>
      </section>
      )}

      {/* TRUST STATS */}
      <section className="py-10 md:py-14 px-6 md:px-20 bg-white border-b border-mint/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {TRUST_STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl md:text-4xl text-forest font-bold">{s.num}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST — W Medical Hospital */}
      <section className="py-8 px-6 md:px-20 bg-mint/5 border-b border-mint/10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
          <div className="w-12 h-12 bg-forest rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">🏥</div>
          <div>
            <p className="font-semibold text-forest text-sm">{t.home.hospitalPartner}</p>
            <p className="text-muted text-xs leading-relaxed">{t.home.hospitalDesc}</p>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white" id="services">
        <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3 md:mb-4">{t.home.servicesLabel}</p>
        <h2 className="font-display text-3xl md:text-5xl text-forest mb-3 md:mb-4">{t.home.servicesTitle}</h2>
        <p className="text-muted text-base md:text-lg mb-10 md:mb-16 max-w-lg">{t.home.servicesDesc}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {SERVICES.map((s) => {
            const imgUrl = homepageImages[s.key as keyof typeof homepageImages]
            return (
            <Link href={s.href} key={s.tag} className={`bg-gradient-to-br ${s.color} border rounded-2xl md:rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}>
              {imgUrl ? (
                <div className="aspect-video relative overflow-hidden">
                  <Image src={imgUrl} alt={s.name as string} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                </div>
              ) : null}
              <div className="p-7 md:p-10">
              <span className="text-4xl md:text-5xl mb-4 md:mb-5 block">{s.emoji}</span>
              <span className="text-xs font-bold tracking-widest uppercase opacity-60 bg-black/5 px-3 py-1 rounded-full">{s.tag}</span>
              <h3 className="font-display text-2xl md:text-3xl text-forest mt-3 mb-2 md:mb-3 whitespace-pre-line">{s.name}</h3>
              <p className="text-muted text-sm leading-relaxed mb-4 md:mb-5">{s.desc}</p>
              <ul className="space-y-2 mb-5 md:mb-6">
                {s.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-rtext font-medium">
                    <span className="w-5 h-5 bg-mint/20 text-sage rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <span className="text-sm font-bold text-forest flex items-center gap-1 group">{t.common.consultFree} <span className="group-hover:translate-x-1 transition-transform">→</span></span>
              </div>
            </Link>
            )
          })}
        </div>
      </section>

      {/* HOW */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-forest relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-mint/10 rounded-full -translate-y-1/2 translate-x-1/2 hidden md:block"></div>
        <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3 md:mb-4">{t.home.howLabel}</p>
        <h2 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4">{t.home.howTitle}</h2>
        <p className="text-white/60 text-base md:text-lg mb-10 md:mb-16">{t.home.howDesc}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 relative z-10">
          {STEPS.map((s) => (
            <div key={s.num} className="bg-white/5 border border-white/10 rounded-2xl p-7 md:p-9 hover:bg-white/8 hover:-translate-y-1 transition-all relative">
              <span className="absolute top-5 right-7 font-display text-6xl md:text-7xl text-white/5 font-bold">{s.num}</span>
              <span className="text-3xl md:text-4xl mb-4 md:mb-5 block">{s.icon}</span>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">{s.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT / TEAM */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.home.aboutLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{t.home.teamTitle}</h2>
          <p className="text-muted text-base md:text-lg mb-10 md:mb-14 max-w-xl">{t.home.teamDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: '🏥', title: t.home.teamHospital, subtitle: t.home.teamHospitalSub, desc: t.home.teamHospitalDesc },
              { emoji: '👨‍⚕️', title: t.home.teamNephro, subtitle: t.home.teamNephroSub, desc: t.home.teamNephroDesc },
              { emoji: '👩‍⚕️', title: t.home.teamSexual, subtitle: t.home.teamSexualSub, desc: t.home.teamSexualDesc },
            ].map(m => (
              <div key={m.title} className="bg-white border border-mint/15 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-forest/5 rounded-2xl flex items-center justify-center text-3xl mb-4">{m.emoji}</div>
                <p className="text-xs font-bold tracking-wider uppercase text-mint mb-1">{m.subtitle}</p>
                <h3 className="font-display text-lg text-forest mb-2">{m.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-white border border-mint/15 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-5">
            <div className="text-4xl flex-shrink-0">🏢</div>
            <div>
              <p className="font-semibold text-forest mb-1">{t.home.companyName}</p>
              <p className="text-muted text-sm leading-relaxed">{t.home.companyDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-warm">
        <div className="flex justify-between items-end mb-8 md:mb-12">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2 md:mb-3">{t.home.blogLabel}</p>
            <h2 className="font-display text-3xl md:text-4xl text-forest">{t.home.blogTitle}</h2>
          </div>
          <Link href="/blog" className="text-forest font-semibold flex items-center gap-1 hover:gap-2 transition-all text-sm md:text-base whitespace-nowrap ml-4">{t.common.viewAll}</Link>
        </div>
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {posts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                {post.image_url && (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 md:p-6">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${SERVICE_COLORS[post.service] || 'bg-gray-100 text-gray-600'}`}>{post.service?.toUpperCase()}</span>
                  <h3 className="font-display text-lg md:text-xl text-forest mt-3 mb-2 leading-tight">{post.title}</h3>
                  <p className="text-muted text-sm leading-relaxed line-clamp-2">{post.meta_desc || post.excerpt}</p>
                  <p className="text-xs text-muted/60 mt-3">{post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH') : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 text-muted">
            <div className="text-5xl mb-4">📰</div>
            <p>{t.home.blogEmpty}</p>
          </div>
        )}
      </section>

      {/* TOOLS PROMO */}
      <section className="py-16 md:py-20 px-6 md:px-20 bg-white border-t border-mint/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.home.toolsLabel}</p>
            <h2 className="font-display text-3xl md:text-4xl text-forest mb-3">{t.home.toolsTitle}</h2>
            <p className="text-muted text-base max-w-md mx-auto">{t.home.toolsDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: '💉', title: t.home.toolBmi, desc: t.home.toolBmiDesc, href: '/tools#bmi', color: 'from-emerald-50 to-green-100 border-emerald-200' },
              { emoji: '🫘', title: t.home.toolEgfr, desc: t.home.toolEgfrDesc, href: '/tools#egfr', color: 'from-blue-50 to-indigo-100 border-blue-200' },
              { emoji: '🔴', title: t.home.toolPrep, desc: t.home.toolPrepDesc, href: '/tools#prep', color: 'from-rose-50 to-pink-100 border-rose-200' },
            ].map(tt => (
              <Link key={tt.title} href={tt.href} className={`bg-gradient-to-br ${tt.color} border rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all`}>
                <span className="text-3xl mb-3 block">{tt.emoji}</span>
                <h3 className="font-display text-lg text-forest mb-2">{tt.title}</h3>
                <p className="text-muted text-sm leading-relaxed mb-4">{tt.desc}</p>
                <span className="text-sm font-bold text-forest flex items-center gap-1 group">{t.common.tryFree} <span className="group-hover:translate-x-1 transition-transform">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Q&A PROMO */}
      <section className="py-12 md:py-16 px-6 md:px-20 bg-cream">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="text-5xl flex-shrink-0">💬</div>
            <div className="text-center md:text-left">
              <h2 className="font-display text-2xl md:text-3xl mb-2">{t.home.qaTitle}</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-5">{t.home.qaDesc}</p>
              <Link href="/ask" className="inline-block bg-white text-forest font-bold px-8 py-3 rounded-full text-sm hover:bg-cream transition-colors">
                {t.home.qaButton}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3 md:mb-4">{t.home.ctaLabel}</p>
          <h2 className="font-display text-3xl md:text-5xl text-forest leading-tight mb-4 md:mb-5">
            {t.home.ctaTitle1}<br/>{t.home.ctaTitle2}<em className="text-mint">{t.home.ctaTitle3}</em>
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 md:mb-10">{t.home.ctaDesc}</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-forest text-white px-8 md:px-10 py-3.5 md:py-4 rounded-full text-sm md:text-base font-semibold hover:bg-sage transition-all hover:-translate-y-0.5 shadow-lg">
            {t.home.ctaFormButton}
          </Link>
        </div>
        <div className="bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="text-5xl mb-4">💬</div>
          <h3 className="font-display text-2xl md:text-3xl mb-2">{t.home.ctaLineTitle}</h3>
          <p className="text-white/70 text-sm mb-5 md:mb-6">{t.home.ctaLineDesc}</p>
          <div className="bg-white/15 border border-white/20 rounded-xl px-6 py-4 text-2xl font-bold tracking-wide mb-5 md:mb-6">@roogondee</div>
          <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#00B04B] transition-all w-full">
            💬 {t.common.addLineFriend}
          </a>
        </div>
      </section>

      <FooterFull />
    </main>
  )
}

function VoucherHero() {
  const OFFERS = [
    {
      emoji: '💉',
      tag: 'GLP-1',
      title: 'ตรวจเบาหวานฟรี',
      value: 'FBS + HbA1c',
      price: 'มูลค่า 500฿',
      desc: 'ประเมินก่อนเริ่ม GLP-1',
      href: '/quiz/glp1',
      accent: 'from-emerald-400 to-emerald-600',
    },
    {
      emoji: '🫘',
      tag: 'CKD',
      title: 'ตรวจโรคไตฟรี',
      value: 'Urine Protein',
      price: 'มูลค่า 200฿',
      desc: 'สัญญาณเริ่มต้นของโรคไต',
      href: '/quiz/ckd',
      accent: 'from-blue-400 to-blue-600',
    },
    {
      emoji: '🔴',
      tag: 'STD / PrEP',
      title: 'ตรวจ HIV ฟรี',
      value: 'HIV + Syphilis',
      price: 'มูลค่า 800฿',
      desc: 'ส่วนตัว ไม่ตัดสิน',
      href: '/quiz/std',
      accent: 'from-rose-400 to-rose-600',
    },
    {
      emoji: '🧔',
      tag: "Men's Health 40+",
      title: 'ปรึกษาแพทย์ฟรี',
      value: 'ตรวจประเมินสุขภาพชาย',
      price: 'มูลค่า 1,500฿',
      desc: 'พลังงาน อารมณ์ ฮอร์โมน',
      href: '/quiz/mens',
      accent: 'from-slate-500 to-indigo-700',
    },
  ]

  return (
    <section className="pt-20 md:pt-24 pb-12 md:pb-20 px-6 md:px-20 bg-gradient-to-br from-forest via-sage to-mint relative overflow-hidden">
      <div className="absolute top-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-mint/20 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-6 md:mb-8">
          <span className="w-2 h-2 bg-mint rounded-full animate-pulse" />
          🎁 แจกฟรี • จำกัด 50 สิทธิ์ / service / เดือน
        </div>

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-white leading-tight mb-4 md:mb-6">
          รับ <em className="text-mint not-italic">Lab Test ฟรี</em><br/>
          ที่ W Medical Hospital
        </h1>

        <p className="text-base md:text-xl text-white/80 leading-relaxed mb-8 md:mb-10 max-w-2xl">
          ตอบคำถามคัดกรอง <span className="font-bold text-white">2 นาที</span> รับ voucher ทันที
          พร้อมปรึกษาแพทย์ที่โรงพยาบาลสมุทรสาคร
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8 md:mb-10">
          {OFFERS.map(o => (
            <Link
              key={o.href}
              href={o.href}
              className="group bg-white rounded-2xl p-6 md:p-7 hover:-translate-y-1 hover:shadow-2xl transition-all border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl md:text-5xl">{o.emoji}</span>
                <span className={`text-xs font-bold tracking-widest uppercase bg-gradient-to-r ${o.accent} bg-clip-text text-transparent`}>
                  {o.tag}
                </span>
              </div>
              <h3 className="font-display text-xl md:text-2xl text-forest mb-1">{o.title}</h3>
              <p className="text-sm font-mono text-muted mb-1">{o.value}</p>
              <p className="text-xs text-mint font-bold mb-3">{o.price}</p>
              <p className="text-xs md:text-sm text-muted leading-relaxed mb-4">{o.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-forest group-hover:gap-2 transition-all">
                ทำ quiz 2 นาที <span>→</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 md:gap-6 text-xs md:text-sm text-white/70">
          <span className="flex items-center gap-2"><span className="text-mint">✓</span> ฟรี ไม่มีค่าใช้จ่าย</span>
          <span className="flex items-center gap-2"><span className="text-mint">✓</span> Voucher หมดอายุ 14 วัน</span>
          <span className="flex items-center gap-2"><span className="text-mint">✓</span> ผลตรวจส่วนตัว</span>
          <span className="flex items-center gap-2"><span className="text-mint">✓</span> พบแพทย์ 15 นาที</span>
        </div>
      </div>
    </section>
  )
}
