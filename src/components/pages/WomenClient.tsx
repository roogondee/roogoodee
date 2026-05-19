'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'สุขภาพเพศหญิง — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/women',
  description: 'ปรึกษาสูตินรีแพทย์ฟรี + ตรวจประเมินสุขภาพเพศหญิงเบื้องต้น — HPV, Pap smear, ตกขาว, ประจำเดือน, วัยทอง ภายใต้การดูแลของแพทย์ W Medical Hospital สมุทรสาคร',
  about: { '@type': 'MedicalSpecialty', name: 'Gynecology' },
  specialty: 'Gynecology',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'voucher นี้ครอบคลุมอะไรบ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'voucher ครอบคลุมค่าธรรมเนียมแพทย์ในการปรึกษาและตรวจประเมินเบื้องต้น รายการตรวจเพิ่มเติม (เช่น Pap smear, HPV DNA, ultrasound) และค่ายา เป็นไปตามดุลยพินิจของแพทย์และคิดตามโครงสร้างราคาของโรงพยาบาล' } },
    { '@type': 'Question', name: 'ผู้หญิงควรตรวจคัดกรองมะเร็งปากมดลูกเมื่อไหร่?', acceptedAnswer: { '@type': 'Answer', text: 'ตามแนวทาง ผู้หญิงอายุ 21+ ที่มีเพศสัมพันธ์ควรเริ่มตรวจ Pap smear ทุก 3 ปี และอาจตรวจ HPV DNA ร่วมด้วยตามดุลยพินิจของแพทย์ — แพทย์จะแนะนำความถี่ที่เหมาะกับวัยและประวัติของแต่ละคน' } },
    { '@type': 'Question', name: 'ปรึกษาที่นี่เป็นความลับไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ใช่ครับ ข้อมูลของคุณเป็นความลับตามมาตรฐาน PDPA เราไม่เปิดเผยข้อมูลใดๆ ให้บุคคลที่สาม' } },
    { '@type': 'Question', name: 'มีอาการตกขาวผิดปกติ ต้องเตรียมตัวอย่างไร?', acceptedAnswer: { '@type': 'Answer', text: 'ทำแบบประเมินก่อน ทีมพยาบาลจะแนะนำการเตรียมตัวเบื้องต้น (เช่น หลีกเลี่ยงการสวนล้างก่อนตรวจ) วันที่พบแพทย์ ใส่เสื้อผ้าที่สะดวกตรวจภายใน' } },
    { '@type': 'Question', name: 'ทำไมต้องไปที่ W Medical Hospital?', acceptedAnswer: { '@type': 'Answer', text: 'W Medical เป็นโรงพยาบาลคู่ค้า มีสูตินรีแพทย์และ lab มาตรฐาน สามารถดูแลตั้งแต่การตรวจ วินิจฉัย และติดตามผล ครบทุกขั้นตอนภายใต้การกำกับของแพทย์ผู้รับผิดชอบ' } },
  ],
}

const FAQS = [
  { q: 'voucher นี้ครอบคลุมอะไรบ้าง?', a: 'voucher ครอบคลุมค่าธรรมเนียมแพทย์ในการปรึกษาและตรวจประเมินเบื้องต้น รายการตรวจเพิ่มเติม (เช่น Pap smear, HPV DNA, ultrasound) และค่ายา เป็นไปตามดุลยพินิจของแพทย์และคิดตามโครงสร้างราคาของโรงพยาบาล' },
  { q: 'ผู้หญิงควรตรวจคัดกรองมะเร็งปากมดลูกเมื่อไหร่?', a: 'ตามแนวทาง ผู้หญิงอายุ 21+ ที่มีเพศสัมพันธ์ควรเริ่มตรวจ Pap smear ทุก 3 ปี และอาจตรวจ HPV DNA ร่วมด้วยตามดุลยพินิจของแพทย์ — แพทย์จะแนะนำความถี่ที่เหมาะกับวัยและประวัติของแต่ละคน' },
  { q: 'มีอาการตกขาวผิดปกติ ต้องเตรียมตัวอย่างไร?', a: 'ทำแบบประเมินก่อน ทีมพยาบาลจะแนะนำการเตรียมตัวเบื้องต้น (เช่น หลีกเลี่ยงการสวนล้างก่อนตรวจ) วันที่พบแพทย์ ใส่เสื้อผ้าที่สะดวกตรวจภายใน' },
  { q: 'วัยทองต้องดูแลอย่างไร?', a: 'อาการวัยทอง (ร้อนวูบวาบ นอนไม่หลับ อารมณ์แปรปรวน ช่องคลอดแห้ง) มีหลายแนวทางดูแล — lifestyle, สมุนไพร, ฮอร์โมนทดแทน — ขึ้นกับสุขภาพแต่ละคน แผนดูแลอยู่ภายใต้ดุลยพินิจของแพทย์' },
  { q: 'ปรึกษาที่นี่เป็นความลับไหม?', a: 'ใช่ครับ ข้อมูลของคุณเป็นความลับตามมาตรฐาน PDPA เราไม่เปิดเผยข้อมูลใดๆ ให้บุคคลที่สาม' },
  { q: 'ทำไมต้องไปที่ W Medical Hospital?', a: 'W Medical เป็นโรงพยาบาลคู่ค้า มีสูตินรีแพทย์และ lab มาตรฐาน สามารถดูแลตั้งแต่การตรวจ วินิจฉัย และติดตามผล ครบทุกขั้นตอนภายใต้การกำกับของแพทย์ผู้รับผิดชอบ' },
]

export default function WomenClient() {
  const { locale, t } = useTranslation()

  const brandDisplay = locale === 'th'
    ? <><span className="text-forest">รู้ก่อน</span><span className="text-mint italic">ดี</span></>
    : <><span className="text-forest">RooGon</span><span className="text-mint italic">Dee</span></>

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl">{brandDisplay}</Link>
        <div className="hidden md:flex items-center gap-5 text-sm text-muted">
          <Link href="/tools" className="hover:text-forest transition-colors">{t.common.calculator}</Link>
          <Link href="/ask" className="hover:text-forest transition-colors">{t.common.askExpert}</Link>
          <Link href="/blog" className="hover:text-forest transition-colors">{t.common.blog}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/quiz/women" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
            {t.common.consultFree}
          </Link>
        </div>
      </nav>

      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-pink-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 text-pink-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            {t.women.heroTag}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {t.women.heroTitle1}<br/>{t.women.heroTitle2}<br/>
            <em className="text-pink-700">{t.women.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">
            {t.women.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/quiz/women" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              {t.women.ctaConsult}
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-2 border-pink-300 text-pink-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-pink-50 transition-all">
              {t.women.ctaLine}
            </a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[
              ['🔒', t.women.trustConfidential],
              ['🩺', t.women.trustDoctor],
              ['🏥', t.women.trustStandard],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-pink-600 mb-3">{t.women.pillarLabel}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-7">
              <span className="inline-block text-xs font-bold tracking-widest uppercase bg-pink-100 text-pink-700 px-3 py-1 rounded-full mb-4">Pillar A</span>
              <h3 className="font-display text-2xl text-forest mb-2">{t.women.pillarATitle}</h3>
              <p className="text-xs text-pink-600 font-bold mb-3">{t.women.pillarASub}</p>
              <p className="text-muted text-sm leading-relaxed">{t.women.pillarADesc}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-fuchsia-50 border border-fuchsia-100 rounded-2xl p-7">
              <span className="inline-block text-xs font-bold tracking-widest uppercase bg-fuchsia-100 text-fuchsia-700 px-3 py-1 rounded-full mb-4">Pillar B</span>
              <h3 className="font-display text-2xl text-forest mb-2">{t.women.pillarBTitle}</h3>
              <p className="text-xs text-fuchsia-600 font-bold mb-3">{t.women.pillarBSub}</p>
              <p className="text-muted text-sm leading-relaxed">{t.women.pillarBDesc}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.women.servicesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{t.women.servicesTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: '🩺', title: t.women.service1Title, desc: t.women.service1Desc },
              { icon: '🔬', title: t.women.service2Title, desc: t.women.service2Desc },
              { icon: '👩', title: t.women.service3Title, desc: t.women.service3Desc },
              { icon: '🔒', title: t.women.service4Title, desc: t.women.service4Desc },
            ].map(item => (
              <div key={item.title} className="bg-white border border-pink-100 rounded-2xl p-6">
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
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{t.women.stepsLabel}</p>
          <h2 className="font-display text-3xl text-white mb-10">{t.women.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: t.women.step1Title, desc: t.women.step1Desc },
              { num: '02', title: t.women.step2Title, desc: t.women.step2Desc },
              { num: '03', title: t.women.step3Title, desc: t.women.step3Desc },
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

      <section className="py-10 px-6 md:px-20 bg-white border-t border-pink-100">
        <div className="max-w-3xl mx-auto bg-pink-50 border border-pink-100 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-pink-700 mb-2">{t.women.disclaimerTitle}</p>
          <p className="text-sm text-muted leading-relaxed">{t.women.disclaimerText}</p>
        </div>
      </section>

      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{t.women.ctaTitle}</h2>
          <p className="text-muted mb-8">{t.women.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/quiz/women" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              {t.women.ctaConsult}
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              {t.common.lineConsultFree}
            </a>
          </div>
        </div>
      </section>

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
