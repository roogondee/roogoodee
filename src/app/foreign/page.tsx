import type { Metadata } from 'next'
import Link from 'next/link'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'

export const metadata: Metadata = {
  title: 'ตรวจสุขภาพแรงงานต่างด้าว — ใบรับรองแพทย์วันเดียว | รู้ก่อนดี สมุทรสาคร',
  description: 'ตรวจสุขภาพแรงงานต่างด้าว 4 สัญชาติ พม่า กัมพูชา ลาว เวียดนาม ออกใบรับรองแพทย์ภายในวันเดียว ราคาพิเศษหมู่คณะ B2B สำหรับ HR และนายจ้าง สมุทรสาคร',
  keywords: 'ตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร, ใบรับรองแพทย์แรงงาน, ตรวจสุขภาพพม่า, Medical Certificate ต่างด้าว',
  alternates: { canonical: 'https://roogondee.com/foreign' },
  openGraph: {
    title: 'ตรวจสุขภาพแรงงานต่างด้าว — ใบรับรองแพทย์วันเดียว',
    description: 'ตรวจสุขภาพแรงงาน 4 สัญชาติ ราคาพิเศษหมู่คณะ ใบรับรองแพทย์ภายในวันเดียว',
    url: 'https://roogondee.com/foreign',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ตรวจสุขภาพแรงงานต่างด้าว — รู้ก่อนดี',
  url: 'https://roogondee.com/foreign',
  description: 'บริการตรวจสุขภาพแรงงานต่างด้าวและออกใบรับรองแพทย์ โดย รู้ก่อนดี ร่วมกับ W Medical Hospital สมุทรสาคร',
  specialty: 'Occupational Medicine',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'ตรวจสุขภาพแรงงานต่างด้าวต้องใช้เอกสารอะไร?', acceptedAnswer: { '@type': 'Answer', text: 'ใช้หนังสือเดินทาง (Passport) หรือบัตรประจำตัวแรงงานที่ออกโดยราชการ รองรับทุกสัญชาติ' } },
    { '@type': 'Question', name: 'ตรวจได้กี่คนต่อวัน?', acceptedAnswer: { '@type': 'Answer', text: 'รองรับได้ทั้งรายบุคคลและหมู่คณะขนาดใหญ่ นัดหมายล่วงหน้าเพื่อประสิทธิภาพสูงสุด กรณีหมู่คณะมากกว่า 10 คนมีราคาพิเศษ' } },
    { '@type': 'Question', name: 'ใบรับรองแพทย์ใช้สำหรับอะไรได้บ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'ใช้ได้สำหรับการขอ Work Permit, ต่ออายุวีซ่าทำงาน, และตามที่นายจ้างหรือหน่วยงานราชการกำหนด' } },
    { '@type': 'Question', name: 'มีค่าใช้จ่ายเท่าไหร่สำหรับหมู่คณะ?', acceptedAnswer: { '@type': 'Answer', text: 'ราคาขึ้นอยู่กับจำนวนคนและรายการตรวจ กรุณาติดต่อทีมของเราเพื่อรับใบเสนอราคาสำหรับหมู่คณะ' } },
    { '@type': 'Question', name: 'รองรับแรงงานสัญชาติอะไรบ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'รองรับแรงงาน 4 สัญชาติ ได้แก่ พม่า (Myanmar), กัมพูชา (Cambodia), ลาว (Laos), และเวียดนาม (Vietnam) ทีมงานสื่อสารได้หลายภาษา' } },
  ],
}

const INCLUDES = [
  { icon: '🧪', title: 'ตรวจสุขภาพครบตามกฎหมาย', desc: 'ตรวจร่างกายทั่วไป เอกซเรย์ปอด ตรวจเลือด และตามที่กรมแรงงานกำหนด' },
  { icon: '📄', title: 'ใบรับรองแพทย์ภายในวันเดียว', desc: 'ออกใบรับรองแพทย์ทันที รองรับทุกรูปแบบที่นายจ้างและหน่วยงานราชการต้องการ' },
  { icon: '👥', title: 'บริการหมู่คณะ B2B', desc: 'ราคาพิเศษสำหรับ HR และนายจ้างที่ส่งแรงงานมาตรวจเป็นกลุ่ม มีบริการจัดการเอกสาร' },
  { icon: '🌏', title: 'รองรับ 4 สัญชาติ', desc: 'พม่า กัมพูชา ลาว เวียดนาม ทีมงานสื่อสารภาษาแรงงานได้ ลดความยุ่งยาก' },
]

const STEPS = [
  { num: '01', title: 'ติดต่อฝ่าย B2B', desc: 'แจ้งจำนวนแรงงาน สัญชาติ และรายการตรวจที่ต้องการ รับใบเสนอราคาทันที' },
  { num: '02', title: 'นัดหมายและนำแรงงานมา', desc: 'นัดวันและเวลาที่สะดวก สามารถส่งแรงงานมาเป็นกลุ่มได้ มีทีมรองรับ' },
  { num: '03', title: 'รับใบรับรองแพทย์', desc: 'รับผลและใบรับรองแพทย์ภายในวันเดียว พร้อมเอกสารประกอบที่จำเป็น' },
]

const FAQS = [
  { q: 'ตรวจสุขภาพแรงงานต่างด้าวต้องใช้เอกสารอะไร?', a: 'ใช้หนังสือเดินทาง (Passport) หรือบัตรประจำตัวแรงงานที่ออกโดยราชการ รองรับทุกสัญชาติ' },
  { q: 'ตรวจได้กี่คนต่อวัน?', a: 'รองรับได้ทั้งรายบุคคลและหมู่คณะขนาดใหญ่ นัดหมายล่วงหน้าเพื่อประสิทธิภาพสูงสุด กรณีหมู่คณะมากกว่า 10 คนมีราคาพิเศษ' },
  { q: 'ใบรับรองแพทย์ใช้สำหรับอะไรได้บ้าง?', a: 'ใช้ได้สำหรับการขอ Work Permit, ต่ออายุวีซ่าทำงาน, และตามที่นายจ้างหรือหน่วยงานราชการกำหนด' },
  { q: 'มีค่าใช้จ่ายเท่าไหร่สำหรับหมู่คณะ?', a: 'ราคาขึ้นอยู่กับจำนวนคนและรายการตรวจ กรุณาติดต่อทีมของเราเพื่อรับใบเสนอราคาสำหรับหมู่คณะ' },
  { q: 'รองรับแรงงานสัญชาติอะไรบ้าง?', a: 'รองรับแรงงาน 4 สัญชาติ ได้แก่ พม่า (Myanmar), กัมพูชา (Cambodia), ลาว (Laos), และเวียดนาม (Vietnam) ทีมงานสื่อสารได้หลายภาษา' },
]

export default function ForeignPage() {
  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <NavBar ctaHref="/contact?service=foreign" />

      {/* HERO */}
      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-amber-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            🧪 Corporate Health
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            ตรวจสุขภาพ<br/>แรงงานต่างด้าว<br/>
            <em className="text-amber-600">ใบรับรองแพทย์วันเดียว</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            บริการ B2B สำหรับ HR และนายจ้างในสมุทรสาคร<br/>
            รองรับ 4 สัญชาติ ราคาพิเศษหมู่คณะ จัดการเอกสารครบ
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact?service=foreign" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              📋 ขอใบเสนอราคา B2B
            </Link>
            <a href="tel:0819023540" className="flex items-center justify-center gap-2 border-2 border-amber-300 text-amber-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-amber-50 transition-all">
              📞 โทร 081-902-3540
            </a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[['📄','ใบรับรองแพทย์วันเดียว'],['👥','รองรับหมู่คณะ'],['🌏','4 สัญชาติ']].map(([icon,text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INCLUDES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">บริการของเรา</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">ครบวงจร สะดวก รวดเร็ว</h2>
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

      {/* STEPS */}
      <section className="py-16 md:py-20 px-6 md:px-20 bg-forest">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">ขั้นตอน</p>
          <h2 className="font-display text-3xl text-white mb-10">สะดวก รวดเร็ว ใน 3 ขั้นตอน</h2>
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

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">FAQ</p>
          <h2 className="font-display text-3xl text-forest mb-10">คำถามที่พบบ่อย</h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm hover:bg-mint/5 transition-colors">
                  {item.q}
                  <span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">＋</span>
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
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">พร้อมรับใบเสนอราคาสำหรับทีมของคุณ?</h2>
          <p className="text-muted mb-8">ติดต่อ B2B ได้โดยตรง ตอบกลับภายใน 2 ชั่วโมง</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?service=foreign" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              📋 ขอใบเสนอราคา
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              💬 LINE @roogondee
            </a>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  )
}
