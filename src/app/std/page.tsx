import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ตรวจ STD & PrEP HIV — ปลอดภัย ไม่ตัดสิน | รู้ก่อนดี สมุทรสาคร',
  description: 'ตรวจโรคติดต่อทางเพศสัมพันธ์ครบ 10 โรค, PrEP/PEP ป้องกัน HIV ผลตรวจเป็นความลับ 100% ทีมไม่ตัดสิน รับผล 24 ชั่วโมง',
  keywords: 'ตรวจ STD สมุทรสาคร, PrEP HIV, ตรวจโรคซิฟิลิส, ตรวจหนองใน, PEP ยาฉุกเฉิน',
  alternates: { canonical: 'https://roogondee.com/std' },
  openGraph: {
    title: 'ตรวจ STD & PrEP HIV — ปลอดภัย ไม่ตัดสิน',
    description: 'ตรวจโรคติดต่อทางเพศสัมพันธ์ครบ 10 โรค, PrEP/PEP ป้องกัน HIV ผลลับ 100%',
    url: 'https://roogondee.com/std',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ตรวจ STD & PrEP HIV — รู้ก่อนดี',
  url: 'https://roogondee.com/std',
  description: 'บริการตรวจโรคติดต่อทางเพศสัมพันธ์ครบ 10 โรค และ PrEP/PEP ป้องกัน HIV โดย รู้ก่อนดี ร่วมกับ W Medical Hospital สมุทรสาคร',
  about: { '@type': 'MedicalCondition', name: 'Sexually Transmitted Infections' },
  specialty: 'Sexual Health',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'ตรวจ STD ใช้เวลานานแค่ไหนถึงรู้ผล?', acceptedAnswer: { '@type': 'Answer', text: 'ผลตรวจส่วนใหญ่ทราบภายใน 24-48 ชั่วโมง บางรายการเช่น HIV Rapid Test ทราบผลภายใน 20 นาที' } },
    { '@type': 'Question', name: 'PrEP คืออะไร และต้องกินนานแค่ไหน?', acceptedAnswer: { '@type': 'Answer', text: 'PrEP คือยาป้องกัน HIV สำหรับผู้ที่มีความเสี่ยง กินทุกวันสม่ำเสมอ ลดความเสี่ยงติด HIV ได้มากกว่า 99% ต้องพบแพทย์ทุก 3 เดือนเพื่อตรวจค่าไตและ HIV ซ้ำ' } },
    { '@type': 'Question', name: 'ผลตรวจ STD เป็นความลับหรือเปล่า?', acceptedAnswer: { '@type': 'Answer', text: 'เป็นความลับ 100% ไม่มีการระบุชื่อบนผลตรวจ ไม่มีการบันทึกใดๆ ที่ไม่จำเป็น ทีมของเราให้ความสำคัญกับความเป็นส่วนตัวสูงสุด' } },
    { '@type': 'Question', name: 'PEP แตกต่างจาก PrEP อย่างไร?', acceptedAnswer: { '@type': 'Answer', text: 'PEP (Post-Exposure Prophylaxis) คือยาฉุกเฉินที่ต้องเริ่มกินภายใน 72 ชั่วโมงหลังจากมีความเสี่ยง กินต่อเนื่อง 28 วัน ส่วน PrEP ใช้ก่อนมีความเสี่ยงเป็นประจำ' } },
    { '@type': 'Question', name: 'ตรวจ STD โดยไม่มีอาการได้ไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ได้และแนะนำอย่างยิ่ง เพราะโรค STD หลายชนิดไม่มีอาการในระยะต้น แต่ยังแพร่เชื้อได้ การตรวจสม่ำเสมอทุก 6-12 เดือนช่วยให้รู้สถานะและรักษาได้ทันท่วงที' } },
  ],
}

const INCLUDES = [
  { icon: '🧪', title: 'ตรวจ STD ครบ 10 โรค', desc: 'HIV, ซิฟิลิส, หนองใน, หนองในเทียม, เริม, HPV, ไวรัสตับอักเสบ B/C และอื่นๆ' },
  { icon: '💊', title: 'PrEP — ป้องกัน HIV ก่อนสัมผัส', desc: 'ยาป้องกัน HIV ที่กินทุกวัน ลดความเสี่ยงได้มากกว่า 99% ต้องสั่งโดยแพทย์เท่านั้น' },
  { icon: '🚨', title: 'PEP — ยาฉุกเฉินหลังสัมผัส', desc: 'ต้องเริ่มภายใน 72 ชั่วโมง กินต่อเนื่อง 28 วัน มาพบเราโดยเร็ว' },
  { icon: '🔒', title: 'ปรึกษาสุขภาพทางเพศ', desc: 'ทีมผู้เชี่ยวชาญรับฟัง ไม่ตัดสิน ทุกเรื่องเป็นความลับ' },
]

const STEPS = [
  { num: '01', title: 'ปรึกษาฟรี', desc: 'กรอกฟอร์มหรือทักผ่าน LINE ทีมจะติดต่อกลับภายใน 30 นาที' },
  { num: '02', title: 'ประเมินและนัดหมาย', desc: 'แพทย์ประเมินความเสี่ยง แนะนำรายการตรวจที่เหมาะสม' },
  { num: '03', title: 'ตรวจและรับผล', desc: 'รับผลตรวจภายใน 24-48 ชั่วโมง พร้อมคำแนะนำการรักษา' },
]

const FAQS = [
  { q: 'ตรวจ STD ใช้เวลานานแค่ไหนถึงรู้ผล?', a: 'ผลตรวจส่วนใหญ่ทราบภายใน 24-48 ชั่วโมง บางรายการเช่น HIV Rapid Test ทราบผลภายใน 20 นาที' },
  { q: 'PrEP คืออะไร และต้องกินนานแค่ไหน?', a: 'PrEP คือยาป้องกัน HIV สำหรับผู้ที่มีความเสี่ยง กินทุกวันสม่ำเสมอ ลดความเสี่ยงติด HIV ได้มากกว่า 99% ต้องพบแพทย์ทุก 3 เดือนเพื่อตรวจค่าไตและ HIV ซ้ำ' },
  { q: 'ผลตรวจ STD เป็นความลับหรือเปล่า?', a: 'เป็นความลับ 100% ไม่มีการระบุชื่อบนผลตรวจ ทีมของเราให้ความสำคัญกับความเป็นส่วนตัวสูงสุด' },
  { q: 'PEP แตกต่างจาก PrEP อย่างไร?', a: 'PEP คือยาฉุกเฉินที่ต้องเริ่มกินภายใน 72 ชั่วโมงหลังมีความเสี่ยง กินต่อเนื่อง 28 วัน ส่วน PrEP ใช้ก่อนมีความเสี่ยงเป็นประจำ' },
  { q: 'ตรวจ STD โดยไม่มีอาการได้ไหม?', a: 'ได้และแนะนำอย่างยิ่ง โรค STD หลายชนิดไม่มีอาการในระยะต้นแต่แพร่เชื้อได้ การตรวจสม่ำเสมอทุก 6-12 เดือนช่วยให้รู้สถานะและรักษาได้ทันท่วงที' },
]

export default function STDPage() {
  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
        <div className="hidden md:flex items-center gap-5 text-sm text-muted">
          <Link href="/tools" className="hover:text-forest transition-colors">เครื่องคำนวณ</Link>
          <Link href="/ask" className="hover:text-forest transition-colors">ถามผู้เชี่ยวชาญ</Link>
          <Link href="/blog" className="hover:text-forest transition-colors">บทความ</Link>
        </div>
        <Link href="/contact?service=std" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
          💬 ปรึกษาฟรี
        </Link>
      </nav>

      {/* HERO */}
      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-rose-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-rose-100 border border-rose-200 text-rose-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            🔴 Sexual Health
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            ตรวจ STD<br/>&amp; PrEP HIV<br/>
            <em className="text-rose-500">ปลอดภัย ไม่ตัดสิน</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            ตรวจโรคติดต่อทางเพศสัมพันธ์ครบ 10 โรค ผลลับ 100% ไม่ระบุชื่อ<br/>
            PrEP/PEP ป้องกัน HIV โดยแพทย์ผู้เชี่ยวชาญ สมุทรสาคร
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact?service=std" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              📝 ปรึกษาฟรี
            </Link>
            <Link href="/tools#prep" className="flex items-center justify-center gap-2 border-2 border-rose-300 text-rose-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-rose-50 transition-all">
              🔴 ทำ PrEP Risk Quiz
            </Link>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[['🔒','ผลลับ 100%'],['⚡','รู้ผล 24-48 ชม.'],['✓','ไม่ตัดสิน']].map(([icon,text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INCLUDES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">บริการของเรา</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">ครอบคลุมทุกด้าน</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {INCLUDES.map(item => (
              <div key={item.title} className="bg-rose-50 border border-rose-100 rounded-2xl p-6">
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
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">พร้อมดูแลสุขภาพทางเพศของคุณ</h2>
          <p className="text-muted mb-8">ปรึกษาฟรี ไม่ตัดสิน ตอบกลับภายใน 30 นาที</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?service=std" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              📝 ปรึกษาฟรี
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              💬 LINE @roogondee
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER minimal */}
      <footer className="bg-dark py-8 px-6 md:px-20 text-white/40 text-xs flex flex-col md:flex-row justify-between gap-2">
        <span>© 2026 บริษัท เจียรักษา จำกัด | รู้ก่อนดี</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/terms" className="hover:text-white transition-colors">ข้อตกลง</Link>
          <Link href="/" className="hover:text-white transition-colors">หน้าแรก</Link>
        </div>
      </footer>
    </main>
  )
}
