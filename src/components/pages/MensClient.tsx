'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'สุขภาพชายวัย 40+ — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/mens',
  description: 'ปรึกษาแพทย์เฉพาะทางฟรีเรื่องสุขภาพชายวัย 40+ — ฮอร์โมน พลังงาน อารมณ์ ภายใต้การดูแลของแพทย์ W Medical Hospital สมุทรสาคร',
  about: { '@type': 'MedicalCondition', name: 'Andropause' },
  specialty: 'Endocrinology',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'วัยทองในผู้ชายคืออะไร?', acceptedAnswer: { '@type': 'Answer', text: 'ภาวะที่ฮอร์โมน Testosterone ลดลงตามวัย พบในผู้ชายอายุ 40 ปีขึ้นไป ส่งผลต่อพลังงาน อารมณ์ มวลกล้ามเนื้อ และความต้องการทางเพศ การวินิจฉัยต้องอาศัยทั้งอาการและผลตรวจเลือดยืนยัน' } },
    { '@type': 'Question', name: 'ใครควรตรวจฮอร์โมนเพศชาย?', acceptedAnswer: { '@type': 'Answer', text: 'ผู้ชายอายุ 40+ ที่มีอาการอ่อนเพลียเรื้อรัง อารมณ์แปรปรวน มวลกล้ามเนื้อลด หรือมีปัญหาเรื่องสมรรถภาพ หรือมีโรคประจำตัวเช่น เบาหวาน ความดัน ที่อาจเกี่ยวข้อง' } },
    { '@type': 'Question', name: 'voucher นี้ครอบคลุมอะไรบ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'voucher ครอบคลุมค่าธรรมเนียมแพทย์ในการปรึกษาและตรวจประเมินเบื้องต้น แผนการดูแลรวมถึงค่ายาและค่าตรวจ lab เพิ่มเติม (ถ้ามี) เป็นไปตามดุลยพินิจของแพทย์และคิดตามโครงสร้างราคา รพ.' } },
    { '@type': 'Question', name: 'ปรึกษาที่นี่เป็นความลับไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ใช่ครับ ข้อมูลของคุณเป็นความลับตามมาตรฐาน PDPA เราไม่เปิดเผยข้อมูลใดๆ ให้บุคคลที่สาม' } },
    { '@type': 'Question', name: 'ทำไมต้องไปที่ W Medical Hospital?', acceptedAnswer: { '@type': 'Answer', text: 'W Medical เป็นโรงพยาบาลคู่ค้า มีแพทย์เฉพาะทางและ lab มาตรฐาน สามารถดูแลตั้งแต่การตรวจ วินิจฉัย และติดตามผล ครบทุกขั้นตอนภายใต้การกำกับของแพทย์ผู้รับผิดชอบ' } },
  ],
}

const FAQS = [
  { q: 'วัยทองในผู้ชายคืออะไร?', a: 'ภาวะที่ฮอร์โมน Testosterone ลดลงตามวัย พบในผู้ชายอายุ 40 ปีขึ้นไป ส่งผลต่อพลังงาน อารมณ์ มวลกล้ามเนื้อ และความต้องการทางเพศ การวินิจฉัยต้องอาศัยทั้งอาการและผลตรวจเลือดยืนยัน' },
  { q: 'ใครควรตรวจฮอร์โมนเพศชาย?', a: 'ผู้ชายอายุ 40+ ที่มีอาการอ่อนเพลียเรื้อรัง อารมณ์แปรปรวน มวลกล้ามเนื้อลด หรือมีปัญหาเรื่องสมรรถภาพ หรือมีโรคประจำตัวเช่น เบาหวาน ความดัน ที่อาจเกี่ยวข้อง' },
  { q: 'voucher นี้ครอบคลุมอะไรบ้าง?', a: 'voucher ครอบคลุมค่าธรรมเนียมแพทย์ในการปรึกษาและตรวจประเมินเบื้องต้น แผนการดูแลรวมถึงค่ายาและค่าตรวจ lab เพิ่มเติม (ถ้ามี) เป็นไปตามดุลยพินิจของแพทย์และคิดตามโครงสร้างราคา รพ.' },
  { q: 'ตรวจอะไรในครั้งแรก?', a: 'แพทย์จะซักประวัติ ทบทวนผลแบบประเมินที่คุณกรอก ตรวจร่างกายเบื้องต้น และอาจแนะนำการตรวจเพิ่มเติม (เช่น ตรวจสัดส่วนร่างกาย ตรวจเลือด) ตามความเหมาะสม' },
  { q: 'ปรึกษาที่นี่เป็นความลับไหม?', a: 'ใช่ครับ ข้อมูลของคุณเป็นความลับตามมาตรฐาน PDPA เราไม่เปิดเผยข้อมูลใดๆ ให้บุคคลที่สาม' },
  { q: 'ทำไมต้องไปที่ W Medical Hospital?', a: 'W Medical เป็นโรงพยาบาลคู่ค้า มีแพทย์เฉพาะทางและ lab มาตรฐาน สามารถดูแลตั้งแต่การตรวจ วินิจฉัย และติดตามผล ครบทุกขั้นตอนภายใต้การกำกับของแพทย์ผู้รับผิดชอบ' },
]

export default function MensClient() {
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
          <Link href="/quiz/mens" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
            {t.common.consultFree}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-slate-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-100 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            {t.mens.heroTag}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {t.mens.heroTitle1}<br/>{t.mens.heroTitle2}<br/>
            <em className="text-indigo-700">{t.mens.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">
            {t.mens.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/quiz/mens" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              {t.mens.ctaConsult}
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-2 border-indigo-300 text-indigo-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-indigo-50 transition-all">
              {t.mens.ctaLine}
            </a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[
              ['🔒', t.mens.trustConfidential],
              ['🩺', t.mens.trustDoctor],
              ['📊', t.mens.trustStandard],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO PILLARS */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t.mens.pillarLabel}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 border border-indigo-100 rounded-2xl p-7">
              <span className="inline-block text-xs font-bold tracking-widest uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full mb-4">Pillar A</span>
              <h3 className="font-display text-2xl text-forest mb-2">{t.mens.pillarATitle}</h3>
              <p className="text-xs text-indigo-600 font-bold mb-3">{t.mens.pillarASub}</p>
              <p className="text-muted text-sm leading-relaxed">{t.mens.pillarADesc}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 rounded-2xl p-7">
              <span className="inline-block text-xs font-bold tracking-widest uppercase bg-blue-100 text-blue-700 px-3 py-1 rounded-full mb-4">Pillar B</span>
              <h3 className="font-display text-2xl text-forest mb-2">{t.mens.pillarBTitle}</h3>
              <p className="text-xs text-blue-600 font-bold mb-3">{t.mens.pillarBSub}</p>
              <p className="text-muted text-sm leading-relaxed">{t.mens.pillarBDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES / INCLUDES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.mens.servicesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{t.mens.servicesTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: '🩺', title: t.mens.service1Title, desc: t.mens.service1Desc },
              { icon: '📊', title: t.mens.service2Title, desc: t.mens.service2Desc },
              { icon: '📋', title: t.mens.service3Title, desc: t.mens.service3Desc },
              { icon: '🔒', title: t.mens.service4Title, desc: t.mens.service4Desc },
            ].map(item => (
              <div key={item.title} className="bg-white border border-indigo-100 rounded-2xl p-6">
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
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{t.mens.stepsLabel}</p>
          <h2 className="font-display text-3xl text-white mb-10">{t.mens.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: t.mens.step1Title, desc: t.mens.step1Desc },
              { num: '02', title: t.mens.step2Title, desc: t.mens.step2Desc },
              { num: '03', title: t.mens.step3Title, desc: t.mens.step3Desc },
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

      {/* DISCLAIMER */}
      <section className="py-10 px-6 md:px-20 bg-white border-t border-indigo-100">
        <div className="max-w-3xl mx-auto bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-700 mb-2">{t.mens.disclaimerTitle}</p>
          <p className="text-sm text-muted leading-relaxed">{t.mens.disclaimerText}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{t.mens.ctaTitle}</h2>
          <p className="text-muted mb-8">{t.mens.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/quiz/mens" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              {t.mens.ctaConsult}
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
