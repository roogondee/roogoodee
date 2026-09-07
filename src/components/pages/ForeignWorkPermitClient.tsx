'use client'
import { Suspense } from 'react'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'
import WorkPermitChat from '@/components/ui/WorkPermitChat'
import WorkPermitLeadForm, { trackWorkPermitCallClick, trackWorkPermitLineClick } from '@/components/ui/WorkPermitLeadForm'

const PHONE_TEL = 'tel:0819023540'
const PHONE_DISPLAY = '081-902-3540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'

function CallButton({ position, className = '' }: { position: string; className?: string }) {
  return (
    <a href={PHONE_TEL} onClick={() => trackWorkPermitCallClick(position)}
      className={`flex items-center justify-center gap-2 bg-amber-500 text-white px-8 py-4 rounded-full text-sm md:text-base font-bold shadow-lg hover:bg-amber-600 transition-all hover:-translate-y-0.5 ${className}`}>
      📞 โทร {PHONE_DISPLAY}
    </a>
  )
}
function LineButton({ position, className = '' }: { position: string; className?: string }) {
  return (
    <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackWorkPermitLineClick(position)}
      className={`flex items-center justify-center gap-2 bg-[#06C755] text-white px-8 py-4 rounded-full text-sm md:text-base font-bold hover:bg-[#00B04B] transition-all hover:-translate-y-0.5 ${className}`}>
      💬 แอดไลน์ @roogondee
    </a>
  )
}

const KEY_DATES = [
  { label: 'ยื่นคำขอต่ออายุ', value: '8 ก.ย. – 11 ธ.ค. 2569' },
  { label: 'ปิดรับยื่นคำขอ', value: 'วันสุดท้าย 16.30 น.' },
  { label: 'ค่าธรรมเนียมรวม', value: '1,000 บาท (คำขอ 100 + ใบอนุญาต 900)' },
  { label: 'ต่ออายุได้', value: '1 ปี ถึง 11 ธ.ค. 2570' },
  { label: 'ยื่นผ่านช่องทางเดียว', value: 'eworkpermit.doe.go.th' },
]

// 9-step hospital checkup, from the W Medical infographic — supersedes the
// 7-step version on the older /foreign pages (no Iris-Scan-only highlight;
// TRCBAS identity verification is now step 2, kept highlighted as the newest
// requirement).
const HOSPITAL_STEPS = [
  { num: '1', title: 'ลงทะเบียน', desc: 'ยื่นเอกสาร เริ่มขั้นตอนตรวจ' },
  { num: '2', title: 'พิสูจน์อัตลักษณ์ / สแกนม่านตา', desc: 'ยืนยันตัวตนด้วยระบบ TRCBAS เชื่อมข้อมูลทุกขั้นตอน', highlight: true },
  { num: '3', title: 'ชั่งน้ำหนัก-วัดส่วนสูง', desc: 'บันทึกค่า BMI' },
  { num: '4', title: 'ตรวจสัญญาณชีพ', desc: 'ความดันโลหิต ชีพจร อุณหภูมิ' },
  { num: '5', title: 'ตรวจปัสสาวะ', desc: 'ตรวจสารเสพติดและความผิดปกติ' },
  { num: '6', title: 'รับประทานยาถ่ายพยาธิ', desc: 'ตรวจสอบตัวบุคคลก่อนให้ยา' },
  { num: '7', title: 'ตรวจร่างกายโดยแพทย์', desc: 'ซักประวัติ ตรวจร่างกาย ให้คำแนะนำ' },
  { num: '8', title: 'เจาะเลือด', desc: 'ตรวจตามมาตรฐานและรายการที่กำหนด' },
  { num: '9', title: 'เอกซเรย์ปอด + สรุปผล', desc: 'แพทย์ตรวจสอบผล ออกใบรับรองแพทย์ เชื่อมข้อมูลเข้าระบบกรมการจัดหางาน' },
]

const DISEASES = ['วัณโรค', 'ซิฟิลิสระยะ 3', 'โรคเท้าช้าง', 'โรคเรื้อน', 'การติดยาเสพติด', 'โรคพิษสุราเรื้อรัง']
const NATIONALITIES = [
  { flag: '🇱🇦', label: 'ลาว' },
  { flag: '🇲🇲', label: 'เมียนมา' },
  { flag: '🇻🇳', label: 'เวียดนาม' },
]

// The employer-facing eWorkPermit filing flow — distinct from the hospital
// checkup above. Health checkup is step 1 here; steps 2-9 happen on
// eworkpermit.doe.go.th, which we do not file on the employer's behalf.
const EMPLOYER_STEPS = [
  { num: '1', title: 'ตรวจสุขภาพ', desc: 'ที่ รพ. ที่กรมการจัดหางานประกาศรับรอง เก็บใบรับรองแพทย์ไว้ (ข้อมูลเชื่อมเข้าระบบให้อัตโนมัติ)' },
  { num: '2', title: 'เช็กสิทธิประกัน', desc: 'มีประกันสังคมใช้ได้เลย / ไม่มีต้องซื้อประกันสุขภาพที่ได้รับอนุญาตตามประกาศ (รพ.รัฐ)' },
  { num: '3', title: 'เลือกช่องทางยื่น', desc: 'หน้าคนต่างด้าว / หน้านายจ้าง / หน้า บนจ. — เลือกช่องทางที่สะดวก' },
  { num: '4', title: 'กรณียื่นผ่าน บนจ.', desc: 'เตรียมหนังสือมอบอำนาจ 2 ฉบับ จากนายจ้าง + จากคนงาน' },
  { num: '5', title: 'กรณียื่นหน้านายจ้าง', desc: 'เตรียมหนังสือมอบอำนาจจากคนงาน 1 ฉบับ' },
  { num: '6', title: 'สัญชาติเวียดนาม', desc: 'ต้องแนบหน้าพาสปอร์ตทุกราย (และวีซ่าถ้ามี)' },
  { num: '7', title: 'สัญชาติลาว/เมียนมา', desc: 'มีพาสปอร์ต-วีซ่าแนบไปได้เลย ไม่มีก็ยื่นได้โดยไม่ต้องแนบ' },
  { num: '8', title: 'ชำระค่าธรรมเนียม 1,000 บาท', desc: 'ยื่นคำขอได้ถึง 16.30 น. / จ่ายเงินได้ถึง 20.00 น. ภายใน 11 ธ.ค. 2569' },
  { num: '9', title: 'รอนายทะเบียนอนุมัติ', desc: 'ได้ใบอนุญาตชั่วคราว 1 ปี ถึง 11 ธ.ค. 2570 แล้วนัดคิวถ่ายบัตร/ตรวจลงตราวีซ่าภายใน 30 มิ.ย. 70' },
]

const COMMON_MISTAKES = [
  'ระหว่างรอรับบัตร ใช้ "ใบรับคำขอ" + "ใบเสร็จรับเงิน" แทนใบอนุญาตไปพลางก่อนได้ ไม่ต้องรอบัตร',
  'นายจ้างนิติบุคคล ต้องใช้หนังสือรับรองบริษัทที่ออกมาไม่เกิน 6 เดือน',
  'ไม่ต้องเตรียมรูปถ่ายคนงาน ระบบดึงรูปให้อัตโนมัติ',
]

const FAQS = [
  {
    q: 'เดดไลน์ต่ออายุใบอนุญาตทำงานคือวันไหน',
    a: 'ยื่นคำขอต่ออายุได้ตั้งแต่วันที่ 8 กันยายน 2569 ถึงวันที่ 11 ธันวาคม 2569 โดยวันสุดท้ายระบบปิดรับยื่นคำขอเวลา 16.30 น. และปิดรับชำระเงินเวลา 20.00 น. ตามมติคณะรัฐมนตรี 14 กรกฎาคม 2569',
  },
  {
    q: 'ใครเข้าเงื่อนไขต่ออายุรอบนี้',
    a: 'แรงงานต่างด้าวสัญชาติลาว เมียนมา และเวียดนาม ที่ได้รับอนุญาตทำงานเป็นกรณีพิเศษถึงวันที่ 11 ธันวาคม 2569 (กลุ่มมติ ครม. 11 พฤศจิกายน 2568) สามารถยื่นต่ออายุออกไปได้อีก 1 ปี',
  },
  {
    q: 'ต้องตรวจสุขภาพที่ไหน',
    a: 'ต้องตรวจที่โรงพยาบาลของรัฐ หรือโรงพยาบาลเอกชนที่เชื่อมโยงข้อมูลกับกรมการจัดหางานแล้วเท่านั้น — W Medical Hospital อยู่ในรายชื่อ (ลำดับที่ 47) รับตรวจได้ตั้งแต่วันที่ 1 สิงหาคม 2569',
  },
  {
    q: 'ตรวจสุขภาพราคาเท่าไหร่ รอผลนานแค่ไหน',
    a: 'เริ่มต้น 500 บาท/คน (ไม่ใช่บริการฟรี) ตรวจครบ 9 ขั้นตอนในวันเดียว สอบถามราคากลุ่ม/หมู่คณะได้ทางโทรศัพท์หรือ LINE',
  },
  {
    q: 'ยื่นต่ออายุใบอนุญาตทำงานที่ไหน',
    a: 'ยื่นผ่านระบบ eWorkPermit ที่เว็บไซต์ eworkpermit.doe.go.th เท่านั้น — รพ. ไม่ได้ยื่นเรื่องแทนนายจ้างหรือแรงงาน มีหน้าที่ตรวจสุขภาพและออกใบรับรองแพทย์ให้นำไปใช้ในระบบ',
  },
  {
    q: 'นัดหมู่คณะพนักงานหลายคนพร้อมกันได้ไหม',
    a: 'ได้ โทรหรือแอดไลน์แจ้งจำนวนพนักงานและสัญชาติล่วงหน้า ทีมงานจะช่วยจัดคิวให้เหมาะกับจำนวนคนเพื่อลดเวลารอ',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}
const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ต่ออายุใบอนุญาตทำงานแรงงานต่างด้าว 2569 — ตรวจสุขภาพที่ W Medical Hospital',
  url: 'https://roogondee.com/foreign/workpermit',
  specialty: 'Occupational Medicine',
}

export default function ForeignWorkPermitClient({ daysLeft }: { daysLeft: number }) {
  return (
    <main className="min-h-screen bg-cream pb-20 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NavBar ctaHref="#cta" ctaLabel="โทรด่วน" />

      {/* Hero */}
      <section className="pt-20 pb-10 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            ⏰ เหลือเวลายื่นคำขออีก {daysLeft} วัน (ปิดระบบ 11 ธ.ค. 2569)
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            ต่ออายุใบอนุญาตทำงาน<br />แรงงานต่างด้าว 2569<br /><em className="text-amber-600">ตรวจสุขภาพขั้นตอนแรกที่นี่</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            แรงงานสัญชาติลาว เมียนมา เวียดนาม (กลุ่มมติ ครม. 11 ธ.ค. 2569) ยื่นต่ออายุได้อีก 1 ปี ผ่านระบบ eworkpermit.doe.go.th — ตรวจสุขภาพที่ W Medical Hospital รพ. ที่เชื่อมข้อมูลกับกรมการจัดหางานแล้ว เริ่มต้น 500 บาท/คน
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <CallButton position="hero" />
            <LineButton position="hero" />
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {['เริ่มต้น 500 บาท/คน', 'รพ. เชื่อมข้อมูล กรมการจัดหางาน', 'รับตรวจตั้งแต่ 1 ส.ค. 2569'].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted"><span className="w-2 h-2 bg-amber-500 rounded-full" />{text}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Q&A bot */}
      <section className="px-6 md:px-20 pb-16 md:pb-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3 text-center">ถามเรื่องต่ออายุ / ตรวจสุขภาพ</p>
          <Suspense fallback={<div className="bg-white rounded-3xl p-10 shadow-xl text-center text-muted text-sm">...</div>}>
            <WorkPermitChat />
          </Suspense>
        </div>
      </section>

      {/* Key dates strip */}
      <section className="py-10 px-6 md:px-20 bg-forest">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {KEY_DATES.map(d => (
              <div key={d.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/50 text-[11px] mb-1">{d.label}</p>
                <p className="text-white font-semibold text-sm leading-snug">{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why a connected hospital */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">ทำไมต้องเลือก รพ. ที่เชื่อมข้อมูลกับกรมการจัดหางาน</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-6">ตรวจที่ไหนไม่เชื่อมข้อมูล ใช้ยื่นต่ออายุไม่ได้</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3 text-sm text-rtext leading-relaxed">
            <p>ตามประกาศกรมการจัดหางาน การตรวจสุขภาพต้องทำที่โรงพยาบาลของรัฐ หรือโรงพยาบาลเอกชนที่ <strong className="text-forest">เชื่อมโยงข้อมูลกับกรมการจัดหางานแล้ว</strong> เท่านั้น — รับตรวจได้ตั้งแต่วันที่ 1 สิงหาคม 2569 เป็นต้นมา โดยใช้เลขอ้างอิงคนต่างด้าว (รูปแบบ RAxxxxxxxxxxxxxxxxx) จากแบบทะเบียนใบอนุญาตทำงานหรือใบเสร็จรับเงินค่าใบอนุญาตทำงาน</p>
            <p><strong className="text-forest">W Medical Hospital อยู่ในรายชื่อ รพ. ที่เชื่อมข้อมูลแล้ว (ลำดับที่ 47)</strong> ผลตรวจและใบรับรองแพทย์จะถูกบันทึกเข้าระบบกรมการจัดหางานให้โดยอัตโนมัติ ไม่ต้องนำเอกสารไปยื่นซ้ำเอง</p>
            <p className="text-xs text-muted">ตรวจสอบรายชื่อ รพ. ที่เชื่อมข้อมูลล่าสุดได้ที่ eworkpermit.doe.go.th หรือเฟซบุ๊กเพจ &ldquo;สำนักบริหารแรงงานต่างด้าว&rdquo; หรือโทรสายด่วนกรมการจัดหางาน 1506 กด 2</p>
          </div>
        </div>
      </section>

      {/* 9-step hospital checkup */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">ขั้นตอนที่โรงพยาบาล</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-3">ตรวจครบ 9 ขั้นตอน จบในวันเดียว</h2>
          <p className="text-muted text-sm md:text-base mb-10 max-w-2xl">มาตรฐานกระทรวงสาธารณสุข ตั้งแต่ลงทะเบียนจนได้รับใบรับรองแพทย์</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOSPITAL_STEPS.map(s => (
              <div key={s.num} className={`relative rounded-2xl p-5 border ${s.highlight ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-mint/15'}`}>
                {s.highlight && (
                  <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">TRCBAS</span>
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
            <div className="mt-2">ที่อยู่: W Medical Hospital — 99/26 หมู่ 5 ต.บางน้ำจืด อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000</div>
          </div>
        </div>
      </section>

      {/* 6 diseases + 3 nationalities */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">คัดกรอง 6 โรคต้องห้าม</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">รองรับแรงงานต่างด้าว 3 สัญชาติ</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {DISEASES.map(d => (
              <div key={d} className="bg-cream border border-mint/15 rounded-2xl p-5">
                <h3 className="font-semibold text-forest text-sm">{d}</h3>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {NATIONALITIES.map(n => (
              <div key={n.label} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-5 py-3">
                <span className="text-xl">{n.flag}</span>
                <span className="font-semibold text-forest text-sm">{n.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Employer's 9-step eWorkPermit flow */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-forest">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">สำหรับนายจ้าง/HR</p>
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3">ขั้นตอนต่ออายุในระบบ eWorkPermit</h2>
          <p className="text-white/60 text-sm md:text-base mb-10 max-w-2xl">การตรวจสุขภาพเป็นขั้นตอนแรก ส่วนขั้นตอน 2-9 ดำเนินการในระบบ eworkpermit.doe.go.th — เราไม่ได้ยื่นเรื่องแทนนายจ้างหรือแรงงาน</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {EMPLOYER_STEPS.map(s => (
              <div key={s.num} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">{s.num}</span>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1 leading-snug">{s.title}</h3>
                    <p className="text-white/60 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <h3 className="font-bold text-amber-300 text-sm mb-2">⚠️ จุดที่พลาดบ่อย</h3>
            <ul className="space-y-1.5">
              {COMMON_MISTAKES.map(m => (
                <li key={m} className="text-white/70 text-xs leading-relaxed flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>{m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Lead form */}
      <section id="lead-form" className="py-16 md:py-24 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream scroll-mt-20">
        <div className="max-w-xl mx-auto">
          <Suspense fallback={<div className="bg-white rounded-3xl p-10 shadow-xl text-center text-muted text-sm">...</div>}>
            <WorkPermitLeadForm />
          </Suspense>
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
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-2">เหลือเวลาอีก {daysLeft} วัน ก่อนปิดระบบ</h2>
          <p className="text-muted mb-8">โทรหรือแอดไลน์เพื่อนัดตรวจสุขภาพและสอบถามเรื่องเอกสารต่ออายุใบอนุญาตทำงาน</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CallButton position="final_cta" />
            <LineButton position="final_cta" />
          </div>
        </div>
      </section>

      <FooterMinimal />

      {/* Sticky mobile CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 backdrop-blur border-t border-amber-200 md:hidden flex gap-2">
        <a href={PHONE_TEL} onClick={() => trackWorkPermitCallClick('sticky_bar')}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
          📞 โทรด่วน
        </a>
        <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackWorkPermitLineClick('sticky_bar')}
          className="flex-1 flex items-center justify-center gap-2 bg-[#06C755] text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
          💬 แอดไลน์
        </a>
      </div>
    </main>
  )
}
