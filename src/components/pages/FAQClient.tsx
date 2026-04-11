'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'

const FAQS_TH = [
  {
    category: 'ทั่วไป', color: 'bg-forest/5 text-forest',
    items: [
      { q: 'รู้ก่อนดีคือใคร?', a: 'รู้ก่อนดีเป็นแพลตฟอร์มปรึกษาสุขภาพออนไลน์ของบริษัท เจียรักษา จำกัด ดำเนินงานร่วมกับ W Medical Hospital สมุทรสาคร ให้บริการ STD & PrEP HIV, GLP-1 ลดน้ำหนัก, CKD Clinic และตรวจสุขภาพแรงงานต่างด้าว' },
      { q: 'ปรึกษาฟรีจริงไหม?', a: 'การปรึกษาเบื้องต้นผ่านแบบฟอร์มและ LINE ฟรี 100% ค่าบริการจะเกิดขึ้นเมื่อนัดหมายตรวจหรือรับยาจริงๆ เท่านั้น' },
      { q: 'ข้อมูลของฉันปลอดภัยแค่ไหน?', a: 'เราเก็บข้อมูลด้วยมาตรฐาน PDPA และ SSL encryption ทุกชั้น ข้อมูลของคุณจะไม่ถูกแชร์ให้บุคคลภายนอกโดยเด็ดขาด' },
      { q: 'ตอบกลับเร็วแค่ไหน?', a: 'ทีมผู้เชี่ยวชาญตอบกลับภายใน 30 นาทีในเวลาทำการ (09.00–20.00 น.) วันจันทร์–อาทิตย์' },
    ],
  },
  {
    category: 'STD & PrEP HIV', color: 'bg-rose-100 text-rose-700',
    items: [
      { q: 'PrEP คืออะไร? ใครควรทาน?', a: 'PrEP คือยาป้องกัน HIV ก่อนสัมผัสเชื้อ เหมาะสำหรับผู้ที่มีความเสี่ยงสูง ยามีประสิทธิภาพสูงถึง 99%' },
      { q: 'PEP คืออะไร?', a: 'PEP คือยาฉุกเฉินหลังสัมผัสเชื้อ HIV ต้องเริ่มภายใน 72 ชั่วโมง กินต่อเนื่อง 28 วัน' },
      { q: 'ตรวจ STD ต้องตรวจอะไรบ้าง?', a: 'Package ครอบคลุม HIV, ซิฟิลิส, หนองใน, หนองในเทียม, เริม, ตับอักเสบ B/C แพทย์จะ��นะนำตามความเสี่ยง' },
      { q: 'ผลตรวจเป็น Positive ต้องทำอย่างไร?', a: 'ทีมแพทย์จะติดต่อกลับทันที วางแผนการรักษา ทุกขั้นตอนเป็นความลับ' },
    ],
  },
  {
    category: 'GLP-1 ลดน้ำหนัก', color: 'bg-emerald-100 text-emerald-700',
    items: [
      { q: 'ยา GLP-1 คืออะไร?', a: 'GLP-1 receptor agonists เป็นกลุ่มยาควบคุมน้ำหนักที่ได้รับการรับรองจาก FDA เช่น Semaglutide (Ozempic) และ Liraglutide (Saxenda)' },
      { q: 'BMI เท่าไหร่ถึงจะได้รับยา?', a: 'BMI ≥ 27.5 ที่มีโรคร่วม หรือ BMI ≥ 30 แพทย์จะประเมินเป็นรายบุคคล' },
      { q: 'มีผลข้างเคียงอะไร?', a: 'คลื่นไส้ อาเจียน ท้องเสีย มักดีขึ้นหลัง 2–4 สัปดาห์ แพทย์จะปรับยาค่อยเป็นค่อยไป' },
      { q: 'ต้องใช้ยานานแค่ไหน?', a: 'ส่วนใหญ่เห็นผลใน 3–6 เดือนแรก แพทย์จะนัดติดตามทุก 1–3 เดือน' },
    ],
  },
  {
    category: 'CKD โรคไต', color: 'bg-blue-100 text-blue-700',
    items: [
      { q: 'CKD คืออะไร?', a: 'โรคไตเรื้อรัง แบ่งเป็น 5 ระยะตามค่า eGFR ระยะที่ 1–3 มักไม่มีอาการ ต้องตรวจเลือดสม่ำเสมอ' },
      { q: 'ค่า Creatinine ปกติคือเท่าไหร่?', a: 'ผู้ชาย: 0.7–1.3 mg/dL ผู้หญิง: 0.5–1.1 mg/dL ค่า eGFR แม่นยำกว่า Creatinine อย่างเดียว' },
      { q: 'ต้องล้างไตเมื่อไหร่?', a: 'เมื่อ eGFR ต่ำกว่า 10–15 (G5) และมีอาการยูรีเมีย แพทย์จะเตรียมล่วงหน้า' },
      { q: 'ควรหลีกเลี่ยงอาหารอะไร?', a: 'ควรระวังโพแทสเซียมสูง ฟอสฟอรัสสูง โซเดียมสูง นักโภชนาการจะวางแผนให้เฉพาะ' },
    ],
  },
  {
    category: 'แรงงานต่างด้าว', color: 'bg-amber-100 text-amber-700',
    items: [
      { q: 'ต้องตรวจอะไรบ้าง?', a: 'เอกซเรย์ปอด ตรวจเลือด ตรวจปัสสาวะ และตรวจร่างกายโดยแพทย์ ตามกฎหมายแรงงาน' },
      { q: 'รองรับกี่สัญชาติ?', a: 'รองรับ 4 สัญชาติ: พม่า กัมพูชา ลาว เวียดนาม มีล่ามหรือเอกสารภาษาท้องถิ่น' },
      { q: 'ใช้เวลานานแค่ไหน?', a: 'Walk-in 1–2 ชั่วโมง B2B หมู่คณะออกผลภายในวันเดียว' },
      { q: 'B2B บริการยังไง?', a: 'รับตั้งแต่ 5 คนขึ้นไป มีบริการ onsite ราคาพิเศษ ติดต่อขอใบเสนอราคาได้' },
    ],
  },
]

export default function FAQClient() {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />

      <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">FAQ</p>
          <h1 className="font-display text-3xl md:text-4xl text-forest mb-3">{t.common.faq}</h1>
          <p className="text-muted text-sm">
            <Link href="/ask" className="text-forest underline">{t.common.askExpert} →</Link>
          </p>
        </div>

        <div className="space-y-10">
          {FAQS_TH.map(cat => (
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
                    <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-mint/10 pt-4">{faq.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 bg-gradient-to-br from-forest to-sage rounded-2xl p-7 text-white text-center">
          <h2 className="font-display text-xl mb-2">{t.ask.needPersonal}</h2>
          <p className="text-white/70 text-sm mb-5">{t.ask.needPersonalDesc}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/contact" className="bg-white text-forest px-6 py-3 rounded-full font-bold text-sm hover:bg-cream transition-all">📝 {t.common.consultFree}</Link>
            <Link href="/ask" className="bg-white/15 border border-white/30 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-white/25 transition-all">💬 {t.common.askExpert}</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
