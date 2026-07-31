'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'ตรวจ DNA พิสูจน์บิดา-บุตร — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/dna',
  description: 'ปรึกษาการตรวจ DNA พิสูจน์ความเป็นพ่อ-ลูกฟรี — จดทะเบียนรับรองบุตร คดีความ มรดก สัญชาติ หรือเพื่อความสบายใจ นัดหมายเก็บตัวอย่างกับสถานพยาบาล/ห้องปฏิบัติการมาตรฐาน',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'voucher นี้ครอบคลุมอะไรบ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'voucher คือสิทธิ์ปรึกษาฟรีกับทีมงาน — ช่วยประเมินว่าเคสของคุณควรตรวจแบบใช้ทางกฎหมายหรือเพื่อความสบายใจ เอกสารที่ต้องเตรียม ช่วงราคา และนัดหมายเก็บตัวอย่างให้ ค่าตรวจจริงเป็นไปตามอัตราของสถานพยาบาล/ห้องปฏิบัติการ ซึ่งทีมงานจะแจ้งให้ทราบชัดเจนก่อนตัดสินใจ' } },
    { '@type': 'Question', name: 'ตรวจแบบใช้ทางกฎหมาย ต่างจากตรวจเพื่อความสบายใจอย่างไร?', acceptedAnswer: { '@type': 'Answer', text: 'ผลที่ใช้กับศาลหรือราชการได้ (จดรับรองบุตร คดีความ มรดก สัญชาติ) ต้องเก็บตัวอย่างต่อหน้าเจ้าหน้าที่ที่สถานพยาบาล พร้อมเอกสารยืนยันตัวตนและบันทึก chain of custody โดยห้องปฏิบัติการมาตรฐาน ส่วนแบบเพื่อความสบายใจขั้นตอนยืดหยุ่นกว่าและราคาต่ำกว่า แต่ผลใช้อ้างอิงทางกฎหมายไม่ได้' } },
    { '@type': 'Question', name: 'แอบเก็บตัวอย่างของอีกฝ่ายมาตรวจได้ไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ไม่ได้ — ข้อมูลพันธุกรรมเป็นข้อมูลส่วนบุคคลอ่อนไหวตาม PDPA ทุกฝ่ายที่ตรวจต้องให้ความยินยอม (ผู้เยาว์ต้องมีผู้ปกครองตามกฎหมายยินยอม) ห้องปฏิบัติการมาตรฐานไม่รับตรวจตัวอย่างที่เก็บโดยไม่ยินยอม และผลใช้ทางกฎหมายไม่ได้ หากอีกฝ่ายไม่ยินยอม ทีมงานให้คำปรึกษาเรื่องช่องทางที่ถูกต้องได้ เช่น กระบวนการทางศาล' } },
    { '@type': 'Question', name: 'รู้ก่อนดีเป็นผู้ตรวจเองหรือไม่?', acceptedAnswer: { '@type': 'Answer', text: 'ไม่ใช่ — รู้ก่อนดี(รู้งี้)เป็นผู้ให้ข้อมูลและประสานงานนัดหมาย การเก็บตัวอย่างและการตรวจทั้งหมดดำเนินการโดยสถานพยาบาลและห้องปฏิบัติการที่ได้มาตรฐานเท่านั้น' } },
    { '@type': 'Question', name: 'ข้อมูลของฉันเป็นความลับไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ใช่ — ข้อมูลของคุณเป็นความลับตามมาตรฐาน PDPA เราไม่เปิดเผยข้อมูลใดๆ ให้บุคคลที่สาม และคุณเลือกช่องทางติดต่อได้ (เช่น LINE เท่านั้น ไม่รับสาย)' } },
  ],
}

const FAQS = [
  { q: 'voucher นี้ครอบคลุมอะไรบ้าง?', a: 'voucher คือสิทธิ์ปรึกษาฟรีกับทีมงาน — ช่วยประเมินว่าเคสของคุณควรตรวจแบบใช้ทางกฎหมายหรือเพื่อความสบายใจ เอกสารที่ต้องเตรียม ช่วงราคา และนัดหมายเก็บตัวอย่างให้ ค่าตรวจจริงเป็นไปตามอัตราของสถานพยาบาล/ห้องปฏิบัติการ ซึ่งทีมงานจะแจ้งให้ทราบชัดเจนก่อนตัดสินใจ' },
  { q: 'ตรวจแบบใช้ทางกฎหมาย ต่างจากตรวจเพื่อความสบายใจอย่างไร?', a: 'ผลที่ใช้กับศาลหรือราชการได้ (จดรับรองบุตร คดีความ มรดก สัญชาติ) ต้องเก็บตัวอย่างต่อหน้าเจ้าหน้าที่ที่สถานพยาบาล พร้อมเอกสารยืนยันตัวตนและบันทึก chain of custody โดยห้องปฏิบัติการมาตรฐาน ส่วนแบบเพื่อความสบายใจขั้นตอนยืดหยุ่นกว่าและราคาต่ำกว่า แต่ผลใช้อ้างอิงทางกฎหมายไม่ได้ — เลือกผิดแบบอาจต้องเสียเงินตรวจซ้ำ' },
  { q: 'แอบเก็บตัวอย่างของอีกฝ่ายมาตรวจได้ไหม?', a: 'ไม่ได้ — ข้อมูลพันธุกรรมเป็นข้อมูลส่วนบุคคลอ่อนไหวตาม PDPA ทุกฝ่ายที่ตรวจต้องให้ความยินยอม (ผู้เยาว์ต้องมีผู้ปกครองตามกฎหมายยินยอม) ห้องปฏิบัติการมาตรฐานไม่รับตรวจตัวอย่างที่เก็บโดยไม่ยินยอม และผลใช้ทางกฎหมายไม่ได้ หากอีกฝ่ายไม่ยินยอม ทีมงานให้คำปรึกษาเรื่องช่องทางที่ถูกต้องได้ เช่น กระบวนการทางศาล' },
  { q: 'ตั้งครรภ์อยู่ ตรวจได้ไหม?', a: 'มีการตรวจก่อนคลอดแบบปลอดภัย (NIPP) ที่ใช้การเจาะเลือดของคุณแม่ ซึ่งเป็นหัตถการทางการแพทย์ — ต้องให้แพทย์ที่สถานพยาบาลประเมินความเหมาะสมและช่วงเวลาก่อนเสมอ ทีมงานนัดหมายปรึกษาแพทย์ให้ได้' },
  { q: 'ต้องเตรียมเอกสารอะไรบ้าง?', a: 'สำหรับการตรวจแบบใช้ทางกฎหมาย โดยทั่วไปคือบัตรประชาชน/พาสปอร์ตของผู้ตรวจทุกคน สูติบัตรของเด็ก และเอกสารประกอบตามวัตถุประสงค์ (เช่น หนังสือจากศาลหรือหน่วยงานราชการ) — ทีมงานจะแจ้งรายการที่เคสของคุณต้องใช้ตอนปรึกษา' },
  { q: 'รู้ก่อนดีเป็นผู้ตรวจเองหรือไม่?', a: 'ไม่ใช่ — รู้ก่อนดี(รู้งี้)เป็นผู้ให้ข้อมูลและประสานงานนัดหมาย การเก็บตัวอย่างและการตรวจทั้งหมดดำเนินการโดยสถานพยาบาลและห้องปฏิบัติการที่ได้มาตรฐานเท่านั้น ตัวเลขความแม่นยำและระยะเวลารอผลเป็นข้อมูลจากห้องปฏิบัติการ' },
  { q: 'ข้อมูลของฉันเป็นความลับไหม?', a: 'ใช่ — ข้อมูลของคุณเป็นความลับตามมาตรฐาน PDPA เราไม่เปิดเผยข้อมูลใดๆ ให้บุคคลที่สาม และคุณเลือกช่องทางติดต่อได้ (เช่น LINE เท่านั้น ไม่รับสาย)' },
]

export default function DnaClient() {
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
          <Link href="/quiz/dna" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
            {t.common.consultFree}
          </Link>
        </div>
      </nav>

      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-sky-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-sky-100 border border-sky-200 text-sky-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            {t.dna.heroTag}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {t.dna.heroTitle1}<br/>{t.dna.heroTitle2}<br/>
            <em className="text-sky-700">{t.dna.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">
            {t.dna.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/quiz/dna" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              {t.dna.ctaConsult}
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-2 border-sky-300 text-sky-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-sky-50 transition-all">
              {t.dna.ctaLine}
            </a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[
              ['🔒', t.dna.trustConfidential],
              ['🏥', t.dna.trustFacility],
              ['🤝', t.dna.trustConsent],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-sky-600 mb-3">{t.dna.pillarLabel}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-7">
              <span className="inline-block text-xs font-bold tracking-widest uppercase bg-sky-100 text-sky-700 px-3 py-1 rounded-full mb-4">Legal</span>
              <h3 className="font-display text-2xl text-forest mb-2">{t.dna.pillarATitle}</h3>
              <p className="text-xs text-sky-600 font-bold mb-3">{t.dna.pillarASub}</p>
              <p className="text-muted text-sm leading-relaxed">{t.dna.pillarADesc}</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border border-cyan-100 rounded-2xl p-7">
              <span className="inline-block text-xs font-bold tracking-widest uppercase bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full mb-4">Peace of mind</span>
              <h3 className="font-display text-2xl text-forest mb-2">{t.dna.pillarBTitle}</h3>
              <p className="text-xs text-cyan-600 font-bold mb-3">{t.dna.pillarBSub}</p>
              <p className="text-muted text-sm leading-relaxed">{t.dna.pillarBDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Consent red line — always visible, mirrors the quiz gate */}
      <section className="py-10 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2">{t.dna.consentBannerTitle}</p>
          <p className="text-sm text-muted leading-relaxed">{t.dna.consentBannerText}</p>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.dna.servicesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{t.dna.servicesTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: '💬', title: t.dna.service1Title, desc: t.dna.service1Desc },
              { icon: '📋', title: t.dna.service2Title, desc: t.dna.service2Desc },
              { icon: '🏥', title: t.dna.service3Title, desc: t.dna.service3Desc },
              { icon: '🔒', title: t.dna.service4Title, desc: t.dna.service4Desc },
            ].map(item => (
              <div key={item.title} className="bg-white border border-sky-100 rounded-2xl p-6">
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
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{t.dna.stepsLabel}</p>
          <h2 className="font-display text-3xl text-white mb-10">{t.dna.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: t.dna.step1Title, desc: t.dna.step1Desc },
              { num: '02', title: t.dna.step2Title, desc: t.dna.step2Desc },
              { num: '03', title: t.dna.step3Title, desc: t.dna.step3Desc },
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

      <section className="py-10 px-6 md:px-20 bg-white border-t border-sky-100">
        <div className="max-w-3xl mx-auto bg-sky-50 border border-sky-100 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-sky-700 mb-2">{t.dna.disclaimerTitle}</p>
          <p className="text-sm text-muted leading-relaxed">{t.dna.disclaimerText}</p>
        </div>
      </section>

      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{t.dna.ctaTitle}</h2>
          <p className="text-muted mb-8">{t.dna.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/quiz/dna" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              {t.dna.ctaConsult}
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
