import type { Metadata } from 'next'
import Link from 'next/link'
import NavBar from '@/components/ui/NavBar'

export const metadata: Metadata = {
  title: 'คำถามที่พบบ่อย (FAQ) — STD, GLP-1, CKD, แรงงานต่างด้าว | รู้ก่อนดี',
  description: 'คำถามที่พบบ่อยเกี่ยวกับบริการรู้ก่อนดี ครอบคลุม STD & PrEP HIV, GLP-1 ลดน้ำหนัก, CKD โรคไต และตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/faq' },
  openGraph: {
    title: 'คำถามที่พบบ่อย — รู้ก่อนดี',
    description: 'คำตอบสำหรับทุกคำถามเกี่ยวกับบริการสุขภาพ STD PrEP GLP-1 CKD แรงงานต่างด้าว',
    url: 'https://roogondee.com/faq',
  },
}

const FAQS = [
  {
    category: 'ทั่วไป',
    color: 'bg-forest/5 text-forest',
    items: [
      { q: 'รู้ก่อนดีคือใคร?', a: 'รู้ก่อนดีเป็นแพลตฟอร์มปรึกษาสุขภาพออนไลน์ของบริษัท เจียรักษา จำกัด ดำเนินงานร่วมกับ W Medical Hospital สมุทรสาคร ให้บริการ STD & PrEP HIV, GLP-1 ลดน้ำหนัก, CKD Clinic และตรวจสุขภาพแรงงานต่างด้าว' },
      { q: 'ปรึกษาฟรีจริงไหม? มีค่าใช้จ่ายซ่อนเร้นไหม?', a: 'การปรึกษาเบื้องต้นผ่านแบบฟอร์มและ LINE ฟรี 100% ไม่มีค่าใช้จ่าย ค่าบริการจะเกิดขึ้นเมื่อนัดหมายตรวจหรือรับยาจริงๆ เท่านั้น และเราแจ้งราคาชัดเจนก่อนเสมอ' },
      { q: 'ข้อมูลของฉันปลอดภัยแค่ไหน?', a: 'เราเก็บข้อมูลด้วยมาตรฐาน PDPA และ SSL encryption ทุกชั้น ข้อมูลของคุณจะไม่ถูกแชร์ให้บุคคลภายนอกโดยเด็ดขาด รายละเอียดดูได้ที่ นโยบายความเป็นส่วนตัว' },
      { q: 'ตอบกลับเร็วแค่ไหน?', a: 'ทีมผู้เชี่ยวชาญตอบกลับภายใน 30 นาทีในเวลาทำการ (09.00–20.00 น.) วันจันทร์–อาทิตย์' },
    ],
  },
  {
    category: 'STD & PrEP HIV',
    color: 'bg-rose-100 text-rose-700',
    items: [
      { q: 'PrEP คืออะไร? ใครควรทาน?', a: 'PrEP (Pre-Exposure Prophylaxis) คือยาป้องกัน HIV ก่อนสัมผัสเชื้อ เหมาะสำหรับผู้ที่มีความเสี่ยงสูง เช่น มีคู่นอนหลายคน ไม่ใช้ถุงยางทุกครั้ง หรือคู่สมรสติดเชื้อ HIV ยามีประสิทธิภาพสูงถึง 99% เมื่อทานอย่างถูกต้อง' },
      { q: 'PEP คืออะไร? ต่างจาก PrEP อย่างไร?', a: 'PEP (Post-Exposure Prophylaxis) คือยาฉุกเฉินหลังสัมผัสเชื้อ HIV ต้องเริ่มภายใน 72 ชั่วโมง ส่วน PrEP คือการป้องกันก่อนสัมผัส ทานต่อเนื่องทุกวัน' },
      { q: 'ตรวจ STD ต้องตรวจอะไรบ้าง?', a: 'Package พื้นฐานครอบคลุม HIV, ซิฟิลิส, หนองใน, หนองในเทียม, เริม (HSV), ตับอักเสบ B/C แพทย์จะแนะนำ package ที่เหมาะสมหลังประเมินความเสี่ยง' },
      { q: 'ผลตรวจเป็น Positive ต้องทำอย่างไร?', a: 'ทีมแพทย์จะติดต่อกลับทันทีเพื่ออธิบายผล วางแผนการรักษา และส่งต่อแพทย์เฉพาะทางหากจำเป็น ทุกขั้นตอนเป็นความลับ ไม่มีการแจ้งบุคคลอื่นโดยไม่ได้รับอนุญาต' },
    ],
  },
  {
    category: 'GLP-1 ลดน้ำหนัก',
    color: 'bg-emerald-100 text-emerald-700',
    items: [
      { q: 'ยา GLP-1 คืออะไร?', a: 'GLP-1 receptor agonists เป็นกลุ่มยาควบคุมน้ำหนักที่ได้รับการรับรองจาก FDA ทำงานโดยลดความหิว เพิ่มความอิ่ม และควบคุมระดับน้ำตาล ตัวอย่างยา เช่น Semaglutide (Ozempic/Wegovy) และ Liraglutide (Saxenda)' },
      { q: 'BMI เท่าไหร่ถึงจะได้รับยา GLP-1?', a: 'โดยทั่วไปสำหรับคนไทย BMI ≥ 27.5 กก./ม.² หรือ BMI ≥ 23 กก./ม.² ที่มีโรคร่วม เช่น เบาหวาน ความดัน ไขมันในเลือดสูง แพทย์จะประเมินเป็นรายบุคคล' },
      { q: 'ยา GLP-1 มีผลข้างเคียงอะไรบ้าง?', a: 'ผลข้างเคียงที่พบบ่อยในช่วงแรก ได้แก่ คลื่นไส้ อาเจียน ท้องเสีย มักดีขึ้นหลัง 2–4 สัปดาห์ แพทย์จะปรับขนาดยาแบบค่อยเป็นค่อยไปเพื่อลดผลข้างเคียง' },
      { q: 'ต้องใช้ยานานแค่ไหน?', a: 'ระยะเวลาขึ้นอยู่กับเป้าหมายและการตอบสนองของร่างกาย ส่วนใหญ่เห็นผลใน 3–6 เดือนแรก แพทย์จะนัดติดตามทุก 1–3 เดือนเพื่อปรับแผน' },
    ],
  },
  {
    category: 'CKD โรคไต',
    color: 'bg-blue-100 text-blue-700',
    items: [
      { q: 'CKD คืออะไร? มีกี่ระยะ?', a: 'โรคไตเรื้อรัง (CKD) แบ่งเป็น 5 ระยะตามค่า eGFR: G1 (≥90), G2 (60–89), G3a (45–59), G3b (30–44), G4 (15–29), G5 (<15) ระยะที่ 1–3 มักไม่มีอาการ จึงต้องตรวจเลือดสม่ำเสมอ' },
      { q: 'ค่า Creatinine ปกติคือเท่าไหร่?', a: 'ผู้ชาย: 0.7–1.3 มก./ดล. ผู้หญิง: 0.5–1.1 มก./ดล. แต่ค่า eGFR แม่นยำกว่า Creatinine เพียงอย่างเดียว เพราะคำนึงถึงอายุ เพศ และน้ำหนักด้วย' },
      { q: 'ถ้าเป็น CKD ต้องล้างไตเมื่อไหร่?', a: 'โดยทั่วไปเมื่อ eGFR ต่ำกว่า 10–15 มล./นาที/1.73ม.² (G5) และมีอาการของยูรีเมีย แพทย์จะประเมินแบบรายบุคคลและเตรียมความพร้อมล่วงหน้า' },
      { q: 'ผู้ป่วย CKD ควรหลีกเลี่ยงอาหารอะไร?', a: 'ขึ้นอยู่กับระยะ CKD โดยทั่วไปควรระวัง โพแทสเซียมสูง (กล้วย มะเขือเทศ ส้ม), ฟอสฟอรัสสูง (นม ชีส ถั่ว), โซเดียมสูง (อาหารเค็ม อาหารสำเร็จรูป) นักโภชนาการจะวางแผนอาหารเฉพาะให้' },
    ],
  },
  {
    category: 'แรงงานต่างด้าว',
    color: 'bg-amber-100 text-amber-700',
    items: [
      { q: 'ตรวจสุขภาพแรงงานต่างด้าวต้องตรวจอะไรบ้าง?', a: 'ตามกฎหมายแรงงานไทย ประกอบด้วย เอกซเรย์ปอด, ตรวจเลือด (CBC, ซิฟิลิส, มาลาเรีย, ไส้เดือนฝอย), ตรวจปัสสาวะ และตรวจร่างกายโดยแพทย์' },
      { q: 'รองรับแรงงานกี่สัญชาติ?', a: 'รองรับ 4 สัญชาติหลัก: เมียนมา กัมพูชา ลาว เวียดนาม มีล่ามหรือเอกสารภาษาท้องถิ่น' },
      { q: 'ใช้เวลานานแค่ไหน? ออกใบรับรองแพทย์ได้เลยไหม?', a: 'สำหรับ walk-in ใช้เวลา 1–2 ชั่วโมง สำหรับ B2B แบบ onsite หรือนัดหมู่ ออกผลและใบรับรองแพทย์ได้ภายในวันเดียว' },
      { q: 'B2B บริการยังไง? ต้องมีจำนวนขั้นต่ำเท่าไหร่?', a: 'รับ B2B ตั้งแต่ 5 คนขึ้นไป มีบริการ onsite ถึงโรงงาน ราคา package ขึ้นอยู่กับจำนวนและ scope การตรวจ ติดต่อขอใบเสนอราคาได้ที่ /contact?service=foreign' },
    ],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.flatMap(cat =>
    cat.items.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    }))
  ),
}

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <NavBar />

      <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">FAQ</p>
          <h1 className="font-display text-3xl md:text-4xl text-forest mb-3">คำถามที่พบบ่อย</h1>
          <p className="text-muted text-sm">ไม่เจอคำตอบที่ต้องการ? <Link href="/ask" className="text-forest underline">ถามผู้เชี่ยวชาญได้เลย →</Link></p>
        </div>

        {/* FAQ sections */}
        <div className="space-y-10">
          {FAQS.map(cat => (
            <div key={cat.category}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${cat.color}`}>{cat.category}</span>
              </div>
              <div className="space-y-3">
                {cat.items.map((faq, i) => (
                  <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none hover:bg-mint/5 transition-colors">
                      <span className="text-sm font-semibold text-forest">{faq.q}</span>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-mint/10 text-forest flex items-center justify-center text-xs font-bold transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-mint/10 pt-4">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 bg-gradient-to-br from-forest to-sage rounded-2xl p-7 text-white text-center">
          <h2 className="font-display text-xl mb-2">ยังมีคำถามอีก?</h2>
          <p className="text-white/70 text-sm mb-5">ทีมผู้เชี่ยวชาญพร้อมตอบทุกคำถาม ฟรี ไม่ตัดสิน ตอบภายใน 30 นาที</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/contact" className="bg-white text-forest px-6 py-3 rounded-full font-bold text-sm hover:bg-cream transition-all">📝 ปรึกษาฟรีเลย</Link>
            <Link href="/ask" className="bg-white/15 border border-white/30 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-white/25 transition-all">💬 ถามผู้เชี่ยวชาญ AI</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
