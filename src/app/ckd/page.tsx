import type { Metadata } from 'next'
import Link from 'next/link'
import NavBar from '@/components/ui/NavBar'
import FooterMinimal from '@/components/ui/FooterMinimal'

export const metadata: Metadata = {
  title: 'CKD Clinic โรคไตเรื้อรัง — ชะลอการเสื่อมของไต | รู้ก่อนดี สมุทรสาคร',
  description: 'ดูแลผู้ป่วย CKD ทุกระยะ ประเมิน eGFR ฟรี แผนอาหารเฉพาะบุคคล ชะลอการเสื่อมของไต โดยอายุรแพทย์โรคไต W Medical Hospital สมุทรสาคร',
  keywords: 'CKD สมุทรสาคร, โรคไตเรื้อรัง, eGFR, ล้างไต, อาหารผู้ป่วยไต, แพทย์โรคไต สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/ckd' },
  openGraph: {
    title: 'CKD Clinic โรคไตเรื้อรัง — ชะลอการเสื่อมของไต',
    description: 'ดูแลผู้ป่วย CKD ทุกระยะ ประเมิน eGFR ฟรี แผนอาหารเฉพาะบุคคล',
    url: 'https://roogondee.com/ckd',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'CKD Clinic โรคไตเรื้อรัง — รู้ก่อนดี',
  url: 'https://roogondee.com/ckd',
  description: 'บริการดูแลผู้ป่วย CKD ทุกระยะ โดย รู้ก่อนดี ร่วมกับ W Medical Hospital สมุทรสาคร',
  about: { '@type': 'MedicalCondition', name: 'Chronic Kidney Disease' },
  specialty: 'Nephrology',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'CKD Stage ต่างๆ หมายถึงอะไร?', acceptedAnswer: { '@type': 'Answer', text: 'CKD แบ่งเป็น 5 ระยะตาม eGFR: G1 (≥90) ปกติ, G2 (60-89) ลดลงเล็กน้อย, G3a/b (30-59) ปานกลาง, G4 (15-29) มาก, G5 (<15) ไตวาย' } },
    { '@type': 'Question', name: 'ค่าครีอะตินีนในเลือดเท่าไหร่ถึงน่าเป็นห่วง?', acceptedAnswer: { '@type': 'Answer', text: 'ค่าปกติของ Creatinine ในผู้ชายอยู่ที่ 0.7-1.2 mg/dL และผู้หญิง 0.5-1.0 mg/dL หากสูงกว่านี้ควรคำนวณ eGFR และพบแพทย์โรคไต' } },
    { '@type': 'Question', name: 'ผู้ป่วย CKD ควรกินอาหารอะไร?', acceptedAnswer: { '@type': 'Answer', text: 'โดยทั่วไปควรจำกัดโซเดียม โปรตีน โพแทสเซียม และฟอสฟอรัสตามระยะ CKD แต่แผนอาหารต้องปรับตามบุคคล แนะนำให้พบนักโภชนาการและแพทย์โรคไต' } },
    { '@type': 'Question', name: 'CKD สามารถรักษาให้หายได้ไหม?', acceptedAnswer: { '@type': 'Answer', text: 'CKD ยังไม่สามารถรักษาให้หายขาดได้ แต่สามารถชะลอการเสื่อมของไตได้ด้วยการควบคุมโรคร่วม เช่น เบาหวาน ความดัน และปฏิบัติตามคำแนะนำแพทย์อย่างสม่ำเสมอ' } },
    { '@type': 'Question', name: 'ต้องพบแพทย์โรคไตบ่อยแค่ไหน?', acceptedAnswer: { '@type': 'Answer', text: 'ขึ้นอยู่กับระยะ CKD: G1-G2 ทุก 12 เดือน, G3 ทุก 6 เดือน, G4 ทุก 3 เดือน, G5 ทุก 1-3 เดือนหรือตามแพทย์นัด' } },
  ],
}

const INCLUDES = [
  { icon: '🔬', title: 'ประเมิน eGFR และระยะ CKD', desc: 'วิเคราะห์ค่าครีอะตินีน BUN และประเมินระยะ CKD เพื่อวางแผนการรักษาที่เหมาะสม' },
  { icon: '🥗', title: 'แผนอาหารเฉพาะบุคคล', desc: 'นักโภชนาการจัดแผนอาหารตามระยะ CKD ควบคุมโซเดียม โปรตีน โพแทสเซียม ฟอสฟอรัส' },
  { icon: '💊', title: 'จัดการยาและโรคร่วม', desc: 'ควบคุมเบาหวาน ความดัน โรคที่เร่งการเสื่อมของไต พร้อมติดตามยาที่ใช้อยู่' },
  { icon: '📋', title: 'วางแผนระยะยาว', desc: 'เตรียมความพร้อมสำหรับการบำบัดทดแทนไตหากจำเป็น ทั้งฟอกไตและปลูกถ่ายไต' },
]

const STEPS = [
  { num: '01', title: 'คำนวณ eGFR ฟรี', desc: 'ใช้เครื่องคำนวณ eGFR ของเรา หรือกรอกค่า Creatinine ล่าสุดของคุณ' },
  { num: '02', title: 'พบอายุรแพทย์โรคไต', desc: 'แพทย์ตรวจร่างกาย วิเคราะห์ผลเลือด และวางแผนการดูแลรักษาแบบองค์รวม' },
  { num: '03', title: 'ติดตามผลต่อเนื่อง', desc: 'ตรวจค่าไตสม่ำเสมอ ปรับยาและอาหาร ชะลอการเสื่อมของไต' },
]

const FAQS = [
  { q: 'CKD Stage ต่างๆ หมายถึงอะไร?', a: 'CKD แบ่งเป็น 5 ระยะตาม eGFR: G1 (≥90) ปกติ, G2 (60-89) ลดลงเล็กน้อย, G3a/b (30-59) ปานกลาง, G4 (15-29) มาก, G5 (<15) ไตวาย' },
  { q: 'ค่าครีอะตินีนเท่าไหร่ถึงน่าเป็นห่วง?', a: 'ค่าปกติ Creatinine ในผู้ชาย 0.7-1.2 mg/dL ผู้หญิง 0.5-1.0 mg/dL หากสูงกว่านี้ควรคำนวณ eGFR และพบแพทย์โรคไต' },
  { q: 'ผู้ป่วย CKD ควรกินอาหารอะไร?', a: 'โดยทั่วไปควรจำกัดโซเดียม โปรตีน โพแทสเซียม และฟอสฟอรัสตามระยะ CKD แต่แผนอาหารต้องปรับตามบุคคล แนะนำให้พบนักโภชนาการและแพทย์โรคไต' },
  { q: 'CKD รักษาให้หายได้ไหม?', a: 'CKD ยังไม่สามารถรักษาให้หายขาดได้ แต่ชะลอการเสื่อมของไตได้ด้วยการควบคุมโรคร่วม เช่น เบาหวาน ความดัน และปฏิบัติตามคำแนะนำแพทย์' },
  { q: 'ต้องพบแพทย์โรคไตบ่อยแค่ไหน?', a: 'G1-G2 ทุก 12 เดือน, G3 ทุก 6 เดือน, G4 ทุก 3 เดือน, G5 ทุก 1-3 เดือนหรือตามแพทย์นัด' },
]

export default function CKDPage() {
  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <NavBar ctaHref="/contact?service=ckd" />

      {/* HERO */}
      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-blue-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            🫘 Kidney Health
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            CKD Clinic<br/>โรคไตเรื้อรัง<br/>
            <em className="text-blue-600">ชะลอการเสื่อมของไต</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            ดูแลผู้ป่วย CKD ทุกระยะโดยอายุรแพทย์โรคไต<br/>
            ประเมิน eGFR ฟรี แผนอาหารเฉพาะบุคคล สมุทรสาคร
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact?service=ckd" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              📝 ปรึกษาแพทย์โรคไต ฟรี
            </Link>
            <Link href="/tools#egfr" className="flex items-center justify-center gap-2 border-2 border-blue-300 text-blue-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-blue-50 transition-all">
              🫘 คำนวณ eGFR
            </Link>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[['🩺','อายุรแพทย์โรคไต'],['📊','ติดตามค่าไตสม่ำเสมอ'],['🥗','แผนอาหารเฉพาะ']].map(([icon,text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INCLUDES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">บริการของเรา</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">ดูแลครบวงจร</h2>
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

      {/* STEPS */}
      <section className="py-16 md:py-20 px-6 md:px-20 bg-forest">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">ขั้นตอน</p>
          <h2 className="font-display text-3xl text-white mb-10">เริ่มต้นง่ายๆ ใน 3 ขั้นตอน</h2>
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
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">ดูแลไตของคุณก่อนสายเกินไป</h2>
          <p className="text-muted mb-8">ปรึกษาอายุรแพทย์โรคไตฟรี ตอบกลับภายใน 30 นาที</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?service=ckd" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              📝 ปรึกษาฟรี
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
