'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ยา GLP-1 ลดน้ำหนักถาวร — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/glp1',
  description: 'บริการยา GLP-1 ลดน้ำหนักภายใต้การดูแลแพทย์ โดย รู้ก่อนดี(รู้งี้) ร่วมกับ W Medical Hospital สมุทรสาคร',
  about: { '@type': 'MedicalCondition', name: 'Obesity' },
  specialty: 'Endocrinology',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'GLP-1 คืออะไร?', acceptedAnswer: { '@type': 'Answer', text: 'GLP-1 คือฮอร์โมนธรรมชาติที่ร่างกายผลิตขึ้นหลังกินอาหาร ยาในกลุ่มนี้เช่น Semaglutide (Ozempic) และ Liraglutide (Saxenda) ช่วยลดความหิว ควบคุมน้ำตาล และทำให้น้ำหนักลดได้อย่างยั่งยืน' } },
    { '@type': 'Question', name: 'ใครเหมาะสมกับยา GLP-1?', acceptedAnswer: { '@type': 'Answer', text: 'เหมาะสำหรับผู้ที่มี BMI ≥ 30 หรือ BMI ≥ 27.5 ร่วมกับโรคเช่น เบาหวาน ความดันสูง ไขมันสูง ต้องผ่านการประเมินจากแพทย์ก่อนเสมอ' } },
    { '@type': 'Question', name: 'GLP-1 มีผลข้างเคียงอะไรบ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'ผลข้างเคียงที่พบบ่อยคือคลื่นไส้ อาเจียน ท้องเสีย โดยเฉพาะช่วงแรก ซึ่งมักดีขึ้นเองภายใน 2-4 สัปดาห์ แพทย์จะปรับยาเพื่อลดผลข้างเคียง' } },
    { '@type': 'Question', name: 'ต้องใช้ยานานแค่ไหน?', acceptedAnswer: { '@type': 'Answer', text: 'ระยะเวลาขึ้นอยู่กับเป้าหมายน้ำหนักและสุขภาพโดยรวม โดยทั่วไป 6-12 เดือน แพทย์จะติดตามผลและปรับแผนทุก 1-3 เดือน' } },
    { '@type': 'Question', name: 'ยา GLP-1 ซื้อเองได้ไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ไม่ได้ครับ ยา GLP-1 ต้องสั่งโดยแพทย์เท่านั้น เนื่องจากต้องประเมินความเหมาะสมและมีการติดตามผลเพื่อความปลอดภัย' } },
  ],
}

const FAQS = [
  { q: 'GLP-1 คืออะไร?', a: 'GLP-1 คือฮอร์โมนธรรมชาติที่ร่างกายผลิตหลังกินอาหาร ยาในกลุ่มนี้เช่น Semaglutide (Ozempic) และ Liraglutide (Saxenda) ช่วยลดความหิว ควบคุมน้ำตาล และทำให้น้ำหนักลดได้อย่างยั่งยืน' },
  { q: 'ใครเหมาะสมกับยา GLP-1?', a: 'เหมาะสำหรับผู้ที่มี BMI ≥ 30 หรือ BMI ≥ 27.5 ร่วมกับโรคเช่น เบาหวาน ความดันสูง ไขมันสูง ต้องผ่านการประเมินจากแพทย์ก่อนเสมอ' },
  { q: 'GLP-1 มีผลข้างเคียงอะไรบ้าง?', a: 'ผลข้างเคียงที่พบบ่อยคือคลื่นไส้ อาเจียน ท้องเสีย โดยเฉพาะช่วงแรก ซึ่งมักดีขึ้นเองภายใน 2-4 สัปดาห์ แพทย์จะปรับยาเพื่อลดผลข้างเคียง' },
  { q: 'ต้องใช้ยานานแค่ไหน?', a: 'ระยะเวลาขึ้นอยู่กับเป้าหมายน้ำหนักและสุขภาพโดยรวม โดยทั่วไป 6-12 เดือน แพทย์จะติดตามผลและปรับแผนทุก 1-3 เดือน' },
  { q: 'ยา GLP-1 ซื้อเองได้ไหม?', a: 'ไม่ได้ครับ ยา GLP-1 ต้องสั่งโดยแพทย์เท่านั้น เนื่องจากต้องประเมินความเหมาะสมและมีการติดตามผลเพื่อความปลอดภัย' },
]

export default function GLP1Client() {
  const { locale, t } = useTranslation()

  const brandDisplay = locale === 'th'
    ? <><span className="text-forest">รู้ก่อน</span><span className="text-mint italic">ดี</span></>
    : <><span className="text-forest">RooGon</span><span className="text-mint italic">Dee</span></>

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl">
          {brandDisplay}
        </Link>
        <div className="hidden md:flex items-center gap-5 text-sm text-muted">
          <Link href="/tools" className="hover:text-forest transition-colors">{t.common.calculator}</Link>
          <Link href="/ask" className="hover:text-forest transition-colors">{t.common.askExpert}</Link>
          <Link href="/blog" className="hover:text-forest transition-colors">{t.common.blog}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/contact?service=glp1" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
            {t.common.consultFree}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-emerald-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            {t.glp1.heroTag}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {t.glp1.heroTitle1}<br/>{t.glp1.heroTitle2}<br/>
            <em className="text-emerald-600">{t.glp1.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            {t.glp1.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact?service=glp1" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              {t.glp1.ctaConsult}
            </Link>
            <Link href="/tools#bmi" className="flex items-center justify-center gap-2 border-2 border-emerald-300 text-emerald-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-emerald-50 transition-all">
              {t.glp1.ctaBmi}
            </Link>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[
              ['✓', t.glp1.trustAuth],
              ['🩺', t.glp1.trustDoctor],
              ['📈', t.glp1.trustFollow],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES / INCLUDES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.glp1.servicesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{t.glp1.servicesTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: '📊', title: t.glp1.service1Title, desc: t.glp1.service1Desc },
              { icon: '💉', title: t.glp1.service2Title, desc: t.glp1.service2Desc },
              { icon: '📈', title: t.glp1.service3Title, desc: t.glp1.service3Desc },
              { icon: '🥗', title: t.glp1.service4Title, desc: t.glp1.service4Desc },
            ].map(item => (
              <div key={item.title} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-forest text-base mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-16 md:py-20 px-6 md:px-20 bg-forest">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{t.glp1.stepsLabel}</p>
          <h2 className="font-display text-3xl text-white mb-10">{t.glp1.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: t.glp1.step1Title, desc: t.glp1.step1Desc },
              { num: '02', title: t.glp1.step2Title, desc: t.glp1.step2Desc },
              { num: '03', title: t.glp1.step3Title, desc: t.glp1.step3Desc },
            ].map(s => (
              <div key={s.num} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                <span className="absolute top-4 right-5 font-display text-5xl text-white/5 font-bold">{s.num}</span>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.common.faq}</p>
          <h2 className="font-display text-3xl text-forest mb-10">{t.common.faq}</h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm hover:bg-mint/5 transition-colors">
                  {item.q}
                  <span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-5 text-muted text-sm leading-relaxed border-t border-mint/10 pt-4">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{t.glp1.ctaTitle}</h2>
          <p className="text-muted mb-8">{t.glp1.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?service=glp1" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              {t.common.consultFree}
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              {t.common.lineConsultFree}
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER minimal */}
      <footer className="bg-dark py-8 px-6 md:px-20 text-white/40 text-xs flex flex-col md:flex-row justify-between gap-2">
        <span>{t.common.copyright}</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">{t.common.privacyPolicy}</Link>
          <Link href="/terms" className="hover:text-white transition-colors">{t.common.termsOfService}</Link>
          <Link href="/" className="hover:text-white transition-colors">{t.common.home}</Link>
        </div>
      </footer>
    </main>
  )
}
