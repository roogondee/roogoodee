'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import { track } from '@/lib/analytics/track'

const jsonLd = {"@context":"https://schema.org","@type":"MedicalWebPage",name:"CKD Clinic โรคไตเรื้อรัง — รู้ก่อนดี(รู้งี้)",url:"https://roogondee.com/ckd",about:{"@type":"MedicalCondition",name:"Chronic Kidney Disease"},specialty:"Nephrology"}

const FAQS = [
  { q: 'CKD Stage ต่างๆ หมายถึงอะไร?', a: 'CKD แบ่งเป็น 5 ระยะตาม eGFR: G1 (≥90) ปกติ, G2 (60-89) ลดลงเล็กน้อย, G3a/b (30-59) ปานกลาง, G4 (15-29) มาก, G5 (<15) ไตวาย' },
  { q: 'ค่าครีอะตินีนเท่าไหร่ถึงน่าเป็นห่วง?', a: 'ค่าปกติ Creatinine ในผู้ชาย 0.7-1.2 mg/dL ผู้หญิง 0.5-1.0 mg/dL หากสูงกว่านี้ควรคำนวณ eGFR และพบแพทย์โรคไต' },
  { q: 'ผู้ป่วย CKD ควรกินอาหารอะไร?', a: 'โดยทั่วไปควรจำกัดโซเดียม โปรตีน โพแทสเซียม และฟอสฟอรัสตามระยะ CKD แต่แผนอาหารต้องปรับตามบุคคล' },
  { q: 'CKD รักษาให้หายได้ไหม?', a: 'CKD ยังไม่สามารถรักษาให้หายขาดได้ แต่ชะลอการเสื่อมของไตได้ด้วยการควบคุมโรคร่วม' },
  { q: 'ต้องพบแพทย์โรคไตบ่อยแค่ไหน?', a: 'G1-G2 ทุก 12 เดือน, G3 ทุก 6 เดือน, G4 ทุก 3 เดือน, G5 ทุก 1-3 เดือนหรือตามแพทย์นัด' },
]

export default function CKDClient() {
  const { t } = useTranslation()
  const ckd = t.ckd

  const INCLUDES = [
    { icon: '🔬', title: ckd.service1Title, desc: ckd.service1Desc },
    { icon: '🥗', title: ckd.service2Title, desc: ckd.service2Desc },
    { icon: '💊', title: ckd.service3Title, desc: ckd.service3Desc },
    { icon: '📋', title: ckd.service4Title, desc: ckd.service4Desc },
  ]
  const STEPS = [
    { num: '01', title: ckd.step1Title, desc: ckd.step1Desc },
    { num: '02', title: ckd.step2Title, desc: ckd.step2Desc },
    { num: '03', title: ckd.step3Title, desc: ckd.step3Desc },
  ]

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <NavBar ctaHref="/contact?service=ckd" />

      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-blue-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">{ckd.heroTag}</div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {ckd.heroTitle1}<br/>{ckd.heroTitle2}<br/><em className="text-blue-600">{ckd.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">{ckd.heroDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact?service=ckd" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">{ckd.ctaConsult}</Link>
            <Link href="/tools#egfr" className="flex items-center justify-center gap-2 border-2 border-blue-300 text-blue-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-blue-50 transition-all">{ckd.ctaEgfr}</Link>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[['🩺', ckd.trustDoctor], ['📊', ckd.trustMonitor], ['🥗', ckd.trustDiet]].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted"><span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{ckd.servicesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{ckd.servicesTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {INCLUDES.map(item => (
              <div key={item.title} className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
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
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{ckd.stepsLabel}</p>
          <h2 className="font-display text-3xl text-white mb-10">{ckd.stepsTitle}</h2>
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
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{ckd.ctaTitle}</h2>
          <p className="text-muted mb-8">{ckd.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?service=ckd" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">📝 {t.common.consultFree}</Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" onClick={() => track('ClickLINE', { location: 'ckd_cta' })} className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">💬 LINE @roogondee</a>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  )
}
