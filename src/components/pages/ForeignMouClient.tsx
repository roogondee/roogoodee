'use client'
import { Suspense } from 'react'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import MouLeadForm, { trackCallClick } from '@/components/ui/MouLeadForm'

const PHONE_TEL = 'tel:0819023540'
const PHONE_DISPLAY = '081-902-3540'

const FAQS = [
  { q: 'ตรวจสุขภาพเพื่อทำ MOU / Work Permit ต้องใช้เอกสารอะไรบ้าง?', a: 'ใช้หนังสือเดินทาง (Passport) ตัวจริงหรือสำเนา และเอกสารนายจ้าง (สำเนาบัตรประชาชนนายจ้าง หรือหนังสือรับรองบริษัท) แบบฟอร์มใบรับรองแพทย์ทางโรงพยาบาลจัดเตรียมให้' },
  { q: 'ค่าตรวจเท่าไหร่?', a: 'เริ่มต้น 500 บาทต่อคน สำหรับหมู่คณะมีราคาพิเศษ โทร 081-902-3540 เพื่อขอใบเสนอราคาได้ทันที' },
  { q: 'ใบรับรองแพทย์ใช้ได้นานแค่ไหน?', a: 'ใบรับรองแพทย์มีอายุไม่เกิน 90 วันนับจากวันตรวจ ควรวางแผนยื่นเอกสาร MOU / Work Permit ภายในช่วงเวลาดังกล่าว' },
  { q: 'ต้องงดน้ำ-งดอาหารก่อนตรวจไหม?', a: 'ไม่ต้องงดน้ำและอาหาร (ยกเว้นบางแพ็กเกจที่มีตรวจเพิ่มเติม เจ้าหน้าที่จะแจ้งล่วงหน้า)' },
  { q: 'ใช้เวลาตรวจนานแค่ไหน?', a: 'ประมาณ 1.5-2 ชั่วโมงรับผลได้เลย กรณีหมู่คณะตั้งแต่ 50 คนขึ้นไปอาจรับผลในวันถัดไป' },
  { q: 'ถ้าตรวจพบโรคต้องห้ามต้องทำอย่างไร?', a: 'แพทย์จะให้คำแนะนำแนวทางการรักษาเป็นรายบุคคล โรคบางอย่างรักษาหายแล้วสามารถตรวจซ้ำเพื่อขอใบรับรองใหม่ได้ สอบถามทีมงานได้โดยตรง' },
]

const DISEASES = [
  { th: 'โรคเรื้อน', en: 'Leprosy' },
  { th: 'วัณโรคระยะอันตราย', en: 'Tuberculosis' },
  { th: 'โรคเท้าช้าง', en: 'Elephantiasis' },
  { th: 'การติดยาเสพติด', en: 'Drug Addiction' },
  { th: 'พิษสุราเรื้อรัง', en: 'Chronic Alcoholism' },
  { th: 'ซิฟิลิสระยะที่ 3', en: 'Tertiary Syphilis' },
]

const HOSPITAL_STEPS = [
  { num: '1', title: 'ลงทะเบียน + ตรวจเอกสาร', desc: 'หนังสือเดินทาง (Passport) + เอกสารนายจ้าง' },
  { num: '2', title: 'ตรวจสุขภาพทั่วไป', desc: 'น้ำหนัก / ส่วนสูง / ความดันโลหิต / ชีพจร โดยแพทย์' },
  { num: '3', title: 'คัดกรอง 6 โรคต้องห้าม', desc: 'เรื้อน, วัณโรค, เท้าช้าง, ติดยา, สุราเรื้อรัง, ซิฟิลิสระยะ 3' },
  { num: '4', title: 'ตรวจห้องปฏิบัติการ', desc: 'ปัสสาวะ + เลือด — ห้องแล็บมาตรฐาน MOPH LAB' },
  { num: '5', title: 'เอกซเรย์ปอด', desc: 'Chest X-ray คัดกรองวัณโรค' },
  { num: '6', title: 'สแกนม่านตา + Facial Recognition', desc: 'ยืนยันตัวตนตามมาตรฐานกรมควบคุมโรค — ทีมผ่านการอบรมและได้รับประกาศนียบัตร', highlight: true },
  { num: '7', title: 'รับใบรับรองแพทย์', desc: 'รอผลประมาณ 1.5–2 ชั่วโมง (กลุ่ม ≥ 50 คน อาจรับวันรุ่งขึ้น)' },
]

const pageJsonLd = { '@context': 'https://schema.org', '@type': 'MedicalWebPage', name: 'ตรวจสุขภาพแรงงานต่างด้าว MOU / Work Permit — รู้ก่อนดี(รู้งี้)', url: 'https://roogondee.com/foreign/mou', specialty: 'Occupational Medicine' }
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

function CallButton({ position, label, sub, className = '' }: { position: string; label: string; sub?: string; className?: string }) {
  return (
    <a href={PHONE_TEL} onClick={() => trackCallClick(position)}
      className={`flex flex-col items-center justify-center gap-0.5 bg-amber-500 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-amber-600 transition-all hover:-translate-y-0.5 ${className}`}>
      <span className="flex items-center gap-2 text-base md:text-lg">📞 {label}</span>
      {sub && <span className="text-[11px] font-normal text-white/85">{sub}</span>}
    </a>
  )
}

export default function ForeignMouClient() {
  const { t } = useTranslation()
  const m = t.foreignMou

  return (
    <main className="min-h-screen bg-cream pb-20 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NavBar ctaHref="#lead-form" ctaLabel={m.ctaForm} />

      {/* Hero */}
      <section className="min-h-[70vh] flex items-center pt-20 pb-10 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">{m.heroTag}</div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {m.heroTitle1}<br />{m.heroTitle2}<br /><em className="text-amber-600">{m.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">{m.heroDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <CallButton position="hero" label={m.ctaCall} sub={m.ctaCallSub} />
            <a href="#lead-form" className="flex items-center justify-center gap-2 border-2 border-forest/30 text-forest px-7 py-4 rounded-full text-sm font-semibold hover:bg-forest hover:text-white transition-all">{m.ctaForm}</a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[m.trustPrice, m.trustTime, m.trustCert].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted"><span className="w-2 h-2 bg-amber-500 rounded-full" />{text}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience split */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{m.audienceTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-7 flex flex-col">
              <h3 className="font-bold text-forest text-lg mb-2">{m.employerTitle}</h3>
              <p className="text-muted text-sm mb-4">{m.employerDesc}</p>
              <ul className="space-y-2 text-sm text-rtext mb-6 flex-1">
                {[m.employerB1, m.employerB2, m.employerB3].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">✓</span>{b}</li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <a href={PHONE_TEL} onClick={() => trackCallClick('employer_card')} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-full text-sm font-bold hover:bg-amber-600 transition-all">📞 {PHONE_DISPLAY}</a>
                <a href="#lead-form" className="flex-1 flex items-center justify-center border border-forest/30 text-forest px-5 py-3 rounded-full text-sm font-semibold hover:bg-forest hover:text-white transition-all">{m.ctaForm}</a>
              </div>
            </div>
            <div className="bg-cream border border-mint/15 rounded-2xl p-7 flex flex-col">
              <h3 className="font-bold text-forest text-lg mb-2">{m.workerTitle}</h3>
              <p className="text-muted text-sm mb-4">{m.workerDesc}</p>
              <ul className="space-y-2 text-sm text-rtext mb-6 flex-1">
                {[m.workerB1, m.workerB2, m.workerB3].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-mint mt-0.5">✓</span>{b}</li>
                ))}
              </ul>
              <a href={PHONE_TEL} onClick={() => trackCallClick('worker_card')} className="flex items-center justify-center gap-2 bg-forest text-white px-5 py-3 rounded-full text-sm font-bold hover:bg-sage transition-all">📞 {PHONE_DISPLAY}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Key facts */}
      <section className="py-12 px-6 md:px-20 bg-forest">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl text-white mb-6">{m.factsTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[m.fact1, m.fact2, m.fact3, m.fact4, m.fact5].map(f => (
              <div key={f} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white/85 text-sm leading-snug">{f}</div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 prohibited diseases */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">ตรวจอะไรบ้าง</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-3">คัดกรอง 6 โรคต้องห้ามตามกฎหมาย</h2>
          <p className="text-muted text-sm md:text-base mb-10 max-w-2xl">ตามประกาศกระทรวงสาธารณสุข เรื่องมาตรฐานให้บริการตรวจสุขภาพคนต่างด้าว พ.ศ. 2567</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {DISEASES.map(d => (
              <div key={d.en} className="bg-cream border border-mint/15 rounded-2xl p-5">
                <h3 className="font-semibold text-forest text-sm mb-1">{d.th}</h3>
                <p className="text-muted text-xs">{d.en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7-step hospital process + credentials */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">ขั้นตอนการตรวจที่โรงพยาบาล</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-3">7 ขั้นตอนตรวจสุขภาพแรงงานต่างด้าว</h2>
          <p className="text-muted text-sm md:text-base mb-10 max-w-2xl">ลำดับการตรวจที่ W Medical สมุทรสาคร — รพ. ที่ได้รับอนุญาตตามประกาศกระทรวงสาธารณสุข พ.ศ. 2567</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOSPITAL_STEPS.map(s => (
              <div key={s.num} className={`relative rounded-2xl p-5 border ${s.highlight ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-mint/15'}`}>
                {s.highlight && (
                  <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">ใหม่</span>
                )}
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${s.highlight ? 'bg-amber-500 text-white' : 'bg-mint/15 text-mint'}`}>{s.num}</span>
                  <div>
                    <h3 className="font-semibold text-forest text-sm mb-1 leading-snug">{s.title}</h3>
                    <p className="text-muted text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-mint/5 border border-mint/15 rounded-2xl p-5 text-xs text-muted leading-relaxed">
            <strong className="text-forest">ใบรับรองและมาตรฐาน:</strong> ใบอนุญาตสถานพยาบาล (สมุทรสาคร) 001/2569 · ห้องแล็บมาตรฐาน MOPH LAB (มาตรฐานห้องปฏิบัติการทางการแพทย์ กระทรวงสาธารณสุข) · ทีมงานผ่านการอบรม Iris Scan & Facial Recognition จากอธิบดีกรมควบคุมโรค ·{' '}
            <a href="https://mrd.hss.moph.go.th/mrd1_hss/?p=12942" target="_blank" rel="noopener noreferrer" className="text-mint hover:underline">ตรวจสอบรายชื่อ รพ. ที่ได้รับอนุญาต</a>
            <div className="mt-2">สถานที่ตรวจ: W Medical โรงพยาบาลทั่วไปขนาดเล็ก — 99/26 หมู่ 5 ต.บางน้ำจืด อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000</div>
          </div>
        </div>
      </section>

      {/* Lead form */}
      <section id="lead-form" className="py-16 md:py-24 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream scroll-mt-20">
        <div className="max-w-xl mx-auto">
          {/* Suspense scoped to the form so useSearchParams doesn't bail the whole page out of prerendering */}
          <Suspense fallback={<div className="bg-white rounded-3xl p-10 shadow-xl text-center text-muted text-sm">...</div>}>
            <MouLeadForm />
          </Suspense>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">FAQ</p>
          <h2 className="font-display text-3xl text-forest mb-10">{t.common.faq}</h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-cream border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm hover:bg-mint/5 transition-colors">{item.q}<span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">＋</span></summary>
                <div className="px-6 pb-5 text-muted text-sm leading-relaxed border-t border-mint/10 pt-4">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 md:px-20 bg-cream">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{m.ctaTitle}</h2>
          <p className="text-muted mb-8">{m.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CallButton position="final_cta" label={m.ctaCall} />
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">💬 LINE @roogondee</a>
          </div>
        </div>
      </section>

      <FooterMinimal />

      {/* Sticky mobile call bar — ads traffic is mostly mobile; keep the number one tap away */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 backdrop-blur border-t border-amber-200 md:hidden">
        <a href={PHONE_TEL} onClick={() => trackCallClick('sticky_bar')}
          className="flex items-center justify-center gap-2 bg-amber-500 text-white py-3.5 rounded-full font-bold text-base shadow-lg">
          📞 {m.callBar}
        </a>
      </div>
    </main>
  )
}
