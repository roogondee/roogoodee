'use client'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import { track } from '@/lib/analytics/track'

const PHONE_TEL = 'tel:0819023540'
const PHONE_DISPLAY = '081-902-3540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'

function trackCallClick(position: string) {
  track('foreign_deadline_call_click', { service: 'foreign', position })
}
function trackLineClick(position: string) {
  track('foreign_deadline_line_click', { service: 'foreign', position })
}

function CallButton({ position, className = '' }: { position: string; className?: string }) {
  return (
    <a href={PHONE_TEL} onClick={() => trackCallClick(position)}
      className={`flex items-center justify-center gap-2 bg-amber-500 text-white px-8 py-4 rounded-full text-sm md:text-base font-bold shadow-lg hover:bg-amber-600 transition-all hover:-translate-y-0.5 ${className}`}>
      📞 โทร {PHONE_DISPLAY}
    </a>
  )
}
function LineButton({ position, className = '' }: { position: string; className?: string }) {
  return (
    <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackLineClick(position)}
      className={`flex items-center justify-center gap-2 bg-[#06C755] text-white px-8 py-4 rounded-full text-sm md:text-base font-bold hover:bg-[#00B04B] transition-all hover:-translate-y-0.5 ${className}`}>
      💬 แอดไลน์ @roogondee
    </a>
  )
}

const HOSPITAL_STEPS = [
  { num: '1', title: 'ลงทะเบียน + ตรวจเอกสาร', desc: 'Passport และเอกสารนายจ้าง (กรณีนายจ้างพาไป)' },
  { num: '2', title: 'ตรวจสุขภาพทั่วไป', desc: 'น้ำหนัก / ส่วนสูง / ความดัน / ชีพจร โดยแพทย์' },
  { num: '3', title: 'คัดกรอง 6 โรคต้องห้าม', desc: 'เรื้อน, วัณโรค, เท้าช้าง, ติดยา, สุราเรื้อรัง, ซิฟิลิสระยะ 3' },
  { num: '4', title: 'ตรวจห้องปฏิบัติการ', desc: 'ปัสสาวะ + เลือด (ห้องแล็บมาตรฐาน MOPH LAB)' },
  { num: '5', title: 'เอกซเรย์ปอด', desc: 'Chest X-ray คัดกรองวัณโรค' },
  { num: '6', title: 'สแกนม่านตา + Facial Recognition', desc: 'ยืนยันตัวตนตามมาตรฐานกรมควบคุมโรค', highlight: true },
  { num: '7', title: 'รับใบรับรองแพทย์', desc: 'รอผลประมาณ 1.5–2 ชม.' },
]

const WHY_URGENT = [
  { title: 'คิวใกล้เดดไลน์จะแน่นมาก', desc: 'นัดล่วงหน้าตอนนี้ปลอดภัยกว่ารอจนใกล้วันที่ 11 ธ.ค. 2569' },
  { title: 'เสี่ยงทำงานต่อไม่ได้ตามกฎหมาย', desc: 'แรงงานที่ไม่ต่ออายุใบอนุญาตทำงานตามกำหนดอาจไม่สามารถทำงานต่อได้' },
  { title: 'นายจ้างมีความเสี่ยงตามมา', desc: 'สถานประกอบการที่มีลูกจ้างต่างด้าวยังไม่ต่ออายุอาจมีความเสี่ยงด้านกฎหมายแรงงาน' },
  { title: 'ตรวจครบ จบในที่เดียว', desc: 'ตรวจสุขภาพและออกใบรับรองแพทย์ในวันเดียว ไม่ต้องเสียเวลาหลายรอบ' },
]

const FAQS = [
  {
    q: 'เดดไลน์ต่ออายุคือวันไหน',
    a: 'ต้องดำเนินการตรวจสุขภาพ/ต่ออายุใบอนุญาตทำงานให้เรียบร้อยก่อนวันที่ 11 ธันวาคม 2569 ตามประกาศ/มติคณะรัฐมนตรีเรื่องการตรวจสุขภาพและต่ออายุใบอนุญาตทำงานของแรงงานต่างด้าว แนะนำให้ตรวจสอบประกาศฉบับล่าสุดจากกรมการจัดหางานควบคู่กันด้วย เนื่องจากรายละเอียดอาจมีการปรับปรุง',
  },
  { q: 'ใครต้องตรวจสุขภาพ/ต่ออายุบ้าง', a: 'แรงงานต่างด้าว 4 สัญชาติ (พม่า กัมพูชา ลาว เวียดนาม) ที่ใบอนุญาตทำงานใกล้ครบกำหนดหรือต้องต่ออายุ รวมถึงนายจ้างที่ต้องพาลูกจ้างมาตรวจตามรอบ' },
  { q: 'ต้องเตรียมเอกสารอะไรบ้าง', a: 'พาสปอร์ตของแรงงาน และเอกสารนายจ้าง เช่น หนังสือรับรองบริษัท/สำเนาบัตรนายจ้าง (กรณีนายจ้างพาไปตรวจหรือทำเรื่องแทน)' },
  { q: 'ราคาเริ่มต้นเท่าไหร่ รอผลนานแค่ไหน', a: 'เริ่มต้น 500 บาท รอผลประมาณ 1.5–2 ชั่วโมง ใบรับรองแพทย์ใช้ได้ไม่เกิน 90 วันนับจากวันตรวจ' },
  { q: 'นัดหมู่คณะพนักงานหลายคนพร้อมกันได้ไหม', a: 'ได้ โทรหรือแอดไลน์แจ้งจำนวนพนักงานล่วงหน้า ทีมงานจะช่วยจัดคิวให้เหมาะกับจำนวนคนเพื่อลดเวลารอ' },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}
const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ต่ออายุ/ตรวจสุขภาพแรงงานต่างด้าว ก่อนหมดเขต 11 ธ.ค. 2569 — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/foreign/deadline-2569',
  specialty: 'Occupational Medicine',
}

export default function ForeignDeadlineClient({ daysLeft }: { daysLeft: number }) {
  return (
    <main className="min-h-screen bg-cream pb-20 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NavBar ctaHref="#cta" ctaLabel="โทรด่วน" />

      {/* Hero */}
      <section className="min-h-[70vh] flex items-center pt-20 pb-10 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            ⏰ ประกาศสำคัญ — เหลือเวลาอีก {daysLeft} วัน
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            ต่ออายุ/ตรวจสุขภาพ<br />แรงงานต่างด้าว<br /><em className="text-amber-600">ก่อนหมดเขต 11 ธ.ค. 2569</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            นายจ้างและแรงงานต่างด้าวที่ต้องตรวจสุขภาพหรือต่ออายุใบอนุญาตทำงาน ตรวจได้ที่ รพ. ได้รับอนุญาตจากกระทรวงสาธารณสุข เริ่มต้น 500 บาท รอผล 1.5–2 ชม. นัดล่วงหน้าก่อนคิวแน่นช่วงใกล้เดดไลน์
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <CallButton position="hero" />
            <LineButton position="hero" />
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {['เริ่มต้น 500 บาท', 'รอผล 1.5-2 ชม.', 'รพ. ได้รับอนุญาตจาก สธ.'].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted"><span className="w-2 h-2 bg-amber-500 rounded-full" />{text}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Why urgent */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-forest">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">ทำไมต้องรีบ</p>
          <h2 className="font-display text-3xl text-white mb-10">อย่าปล่อยไว้จนใกล้วันที่ 11 ธ.ค. 2569</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {WHY_URGENT.map(item => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience split */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">สำหรับใคร</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">นายจ้างและแรงงานต่างด้าว เตรียมตัวอย่างไร</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-7 flex flex-col">
              <h3 className="font-bold text-forest text-lg mb-2">นายจ้าง / HR</h3>
              <p className="text-muted text-sm mb-4">ตรวจสอบรายชื่อลูกจ้างต่างด้าวที่ยังไม่ต่ออายุใบอนุญาตทำงาน แล้วนัดหมู่คณะล่วงหน้า</p>
              <ul className="space-y-2 text-sm text-rtext mb-6 flex-1">
                {['ทะเบียนบริษัท/สำเนาบัตรนายจ้าง', 'รายชื่อและพาสปอร์ตของลูกจ้างที่ต้องตรวจ', 'นัดหมู่คณะล่วงหน้าเพื่อลดเวลารอคิว'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-amber-600 mt-0.5">✓</span>{b}</li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <a href={PHONE_TEL} onClick={() => trackCallClick('employer_card')} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-full text-sm font-bold hover:bg-amber-600 transition-all">📞 {PHONE_DISPLAY}</a>
                <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackLineClick('employer_card')} className="flex-1 flex items-center justify-center border border-forest/30 text-forest px-5 py-3 rounded-full text-sm font-semibold hover:bg-forest hover:text-white transition-all">💬 แอดไลน์</a>
              </div>
            </div>
            <div className="bg-cream border border-mint/15 rounded-2xl p-7 flex flex-col">
              <h3 className="font-bold text-forest text-lg mb-2">แรงงานต่างด้าว</h3>
              <p className="text-muted text-sm mb-4">เตรียมเอกสารให้พร้อมก่อนเข้ารับการตรวจ เพื่อความรวดเร็วในวันจริง</p>
              <ul className="space-y-2 text-sm text-rtext mb-6 flex-1">
                {['พาสปอร์ตตัวจริง', 'เอกสารนายจ้าง (กรณีนายจ้างพาไป)', 'ใบอนุญาตทำงานเดิม (ถ้ามี)'].map(b => (
                  <li key={b} className="flex items-start gap-2"><span className="text-mint mt-0.5">✓</span>{b}</li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <a href={PHONE_TEL} onClick={() => trackCallClick('worker_card')} className="flex-1 flex items-center justify-center gap-2 bg-forest text-white px-5 py-3 rounded-full text-sm font-bold hover:bg-sage transition-all">📞 {PHONE_DISPLAY}</a>
                <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackLineClick('worker_card')} className="flex-1 flex items-center justify-center border border-forest/30 text-forest px-5 py-3 rounded-full text-sm font-semibold hover:bg-forest hover:text-white transition-all">💬 แอดไลน์</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7-step hospital process + credentials */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">ขั้นตอนที่โรงพยาบาล</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-3">ตรวจครบ 7 ขั้นตอน จบในวันเดียว</h2>
          <p className="text-muted text-sm md:text-base mb-10 max-w-2xl">ตั้งแต่ลงทะเบียนจนได้รับใบรับรองแพทย์ ใช้เวลารวมประมาณ 1.5–2 ชั่วโมง</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOSPITAL_STEPS.map(s => (
              <div key={s.num} className={`relative rounded-2xl p-5 border ${s.highlight ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-mint/15'}`}>
                {s.highlight && (
                  <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">NEW</span>
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
          {/* Official license names, numbers, and the address are legal proper nouns — always Thai, never altered */}
          <div className="mt-8 bg-mint/5 border border-mint/15 rounded-2xl p-5 text-xs text-muted leading-relaxed">
            <strong className="text-forest">ใบรับรอง/มาตรฐาน:</strong> ใบอนุญาตสถานพยาบาล (สมุทรสาคร) 001/2569 · ห้องแล็บมาตรฐาน MOPH LAB (มาตรฐานห้องปฏิบัติการทางการแพทย์ กระทรวงสาธารณสุข) · ทีมงานผ่านการอบรม Iris Scan & Facial Recognition จากอธิบดีกรมควบคุมโรค ·{' '}
            <a href="https://mrd.hss.moph.go.th/mrd1_hss/?p=12942" target="_blank" rel="noopener noreferrer" className="text-mint hover:underline">ตรวจสอบรายชื่อ รพ. ที่ได้รับอนุญาต</a>
            <div className="mt-2">ที่อยู่: โรงพยาบาลพันธมิตร โรงพยาบาลทั่วไปขนาดเล็ก — 99/26 หมู่ 5 ต.บางน้ำจืด อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">FAQ</p>
          <h2 className="font-display text-3xl text-forest mb-10">คำถามที่พบบ่อย</h2>
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
      <section id="cta" className="py-16 px-6 md:px-20 bg-cream scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-2">เหลือเวลาอีก {daysLeft} วัน ก่อนหมดเขต</h2>
          <p className="text-muted mb-8">โทรหรือแอดไลน์เพื่อนัดตรวจสุขภาพ/ต่ออายุใบอนุญาตทำงาน ทีมงานพร้อมให้ข้อมูลและช่วยจัดคิว</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CallButton position="final_cta" />
            <LineButton position="final_cta" />
          </div>
        </div>
      </section>

      <FooterMinimal />

      {/* Sticky mobile CTA bar — ads traffic is mostly mobile; keep call + LINE one tap away */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 backdrop-blur border-t border-amber-200 md:hidden flex gap-2">
        <a href={PHONE_TEL} onClick={() => trackCallClick('sticky_bar')}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
          📞 โทรด่วน
        </a>
        <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackLineClick('sticky_bar')}
          className="flex-1 flex items-center justify-center gap-2 bg-[#06C755] text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
          💬 แอดไลน์
        </a>
      </div>
    </main>
  )
}
