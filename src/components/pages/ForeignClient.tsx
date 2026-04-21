'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import { track } from '@/lib/analytics/track'

const jsonLd = {"@context":"https://schema.org","@type":"MedicalWebPage",name:"ตรวจสุขภาพแรงงานต่างด้าว — รู้ก่อนดี(รู้งี้)",url:"https://roogondee.com/foreign",specialty:"Occupational Medicine"}

const FAQS = [
  { q: 'ตรวจสุขภาพแรงงานต่างด้าวต้องใช้เอกสารอะไร?', a: 'ใช้หนังสือเดินทาง (Passport) หรือบัตรประจำตัวแรงงานที่ออกโดยราชการ รองรับทุกสัญชาติ' },
  { q: 'ตรวจได้กี่คนต่อวัน?', a: 'รองรับได้ทั้งรายบุคคลและหมู่คณะขนาดใหญ่ นัดหมายล่วงหน้าเพื่อประสิทธิภาพสูงสุด' },
  { q: 'ใบรับรองแพทย์ใช้สำหรับอะไรได้บ้าง?', a: 'ใช้ได้สำหรับการขอ Work Permit, ต่ออายุวีซ่าทำงาน, และตามที่หน่วยงานราชการกำหนด' },
  { q: 'มีค่าใช้จ่ายเท่าไหร่สำหรับหมู่คณะ?', a: 'ราคาขึ้นอยู่กับจำนวนคนและรายการตรวจ กรุณาติดต่อทีมเพื่อรับใบเสนอราคา' },
  { q: 'รองรับแรงงานสัญชาติอะไรบ้าง?', a: 'รองรับ 4 สัญชาติ: พม่า กัมพูชา ลาว เวียดนาม ทีมงานสื่อสารได้หลายภาษา' },
]

export default function ForeignClient() {
  const { t } = useTranslation()
  const f = t.foreign

  const INCLUDES = [
    { icon: '🧪', title: f.service1Title, desc: f.service1Desc },
    { icon: '📄', title: f.service2Title, desc: f.service2Desc },
    { icon: '👥', title: f.service3Title, desc: f.service3Desc },
    { icon: '🌏', title: f.service4Title, desc: f.service4Desc },
  ]
  const STEPS = [
    { num: '01', title: f.step1Title, desc: f.step1Desc },
    { num: '02', title: f.step2Title, desc: f.step2Desc },
    { num: '03', title: f.step3Title, desc: f.step3Desc },
  ]

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <NavBar ctaHref="/contact?service=foreign" />

      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">{f.heroTag}</div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {f.heroTitle1}<br/>{f.heroTitle2}<br/><em className="text-amber-600">{f.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">{f.heroDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact?service=foreign" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">{f.ctaQuote}</Link>
            <a href="tel:0819023540" onClick={() => track('ClickCall', { location: 'foreign_hero' })} className="flex items-center justify-center gap-2 border-2 border-amber-300 text-amber-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-amber-50 transition-all">{f.ctaCall}</a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[['📄', f.trustCert], ['👥', f.trustGroup], ['🌏', f.trustNations]].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted"><span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{f.servicesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{f.servicesTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {INCLUDES.map(item => (
              <div key={item.title} className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-forest text-base mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 px-6 md:px-20 bg-forest">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{f.stepsLabel}</p>
          <h2 className="font-display text-3xl text-white mb-10">{f.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.num} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                <span className="absolute top-4 right-5 font-display text-5xl text-white/5 font-bold">{s.num}</span>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">FAQ</p>
          <h2 className="font-display text-3xl text-forest mb-10">{t.common.faq}</h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm hover:bg-mint/5 transition-colors">{item.q}<span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">＋</span></summary>
                <div className="px-6 pb-5 text-muted text-sm leading-relaxed border-t border-mint/10 pt-4">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{f.ctaTitle}</h2>
          <p className="text-muted mb-8">{f.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?service=foreign" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">{f.ctaQuoteShort}</Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" onClick={() => track('ClickLINE', { location: 'foreign_cta' })} className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">💬 LINE @roogondee</a>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  )
}
