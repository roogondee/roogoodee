import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ยา GLP-1 ลดน้ำหนักถาวร — ภายใต้การดูแลแพทย์ | รู้ก่อนดี สมุทรสาคร',
  description: 'ยา GLP-1 (Ozempic, Saxenda) ลดน้ำหนักอย่างปลอดภัยภายใต้การดูแลแพทย์ ประเมิน BMI ฟรี เหมาะสำหรับ BMI ≥ 27.5 ที่มีโรคร่วม หรือ BMI ≥ 30',
  keywords: 'GLP-1 สมุทรสาคร, Ozempic ราคา, Saxenda ราคา, ยาลดน้ำหนัก GLP-1, ลดน้ำหนักด้วยแพทย์',
  alternates: { canonical: 'https://roogondee.com/glp1' },
  openGraph: {
    title: 'ยา GLP-1 ลดน้ำหนักถาวร — ภายใต้การดูแลแพทย์',
    description: 'ยา GLP-1 ปลอดภัย ภายใต้การดูแลแพทย์ ประเมิน BMI ฟรี',
    url: 'https://roogondee.com/glp1',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'ยา GLP-1 ลดน้ำหนักถาวร — รู้ก่อนดี',
  url: 'https://roogondee.com/glp1',
  description: 'บริการยา GLP-1 ลดน้ำหนักภายใต้การดูแลแพทย์ โดย รู้ก่อนดี ร่วมกับ W Medical Hospital สมุทรสาคร',
  about: { '@type': 'MedicalCondition', name: 'Obesity' },
  specialty: 'Endocrinology',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'GLP-1 คืออะไร?', acceptedAnswer: { '@type': 'Answer', text: 'GLP-1 คือฮอร์โมนธรรมชาติที่ร่างกายผลิตขึ้นหลังกินอาหาร ยาในกลุ่มนี้เช่น Semaglutide (Ozempic) และ Liraglutide (Saxenda) ช่วยลดความหิว ควบคุมน้ำตาล และทำให้น้ำหนักลดได้อย่างยั่งยืน' } },
    { '@type': 'Question', name: 'ใครเหมาะสมกับยา GLP-1?', acceptedAnswer: { '@type': 'Answer', text: 'เหมาะสำหรับผู้ที่มี BMI ≥ 30 หรือ BMI ≥ 27.5 ร่วมกับโรคเช่น เบาหวาน ความดันสูง ไขมันสูง ต้องผ่านการประเมินจากแพทย์ก่อนเสมอ' } },
    { '@type': 'Question', name: 'GLP-1 มีผลข้างเคียงอะไรบ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'ผลข้างเคียงที่พบบ่อยคือคลื่นไส้ อาเจียน ท้องเสีย โดยเฉพาะช่วงแรก ซึ่งมักดีขึ้นเองภายใน 2-4 สัปดาห์ แพทย์จะปรับยาเพื่อลดผลข้างเคียง' } },
    { '@type': 'Question', name: 'ต้องใช้ยานานแค่ไหน?', acceptedAnswer: { '@type': 'Answer', text: 'ระยะเวลาขึ้นอยู่กับเป้าหมายน้ำหนักและสุขภาพโดยรวม โดยทั่วไป 6-12 เดือน แพทย์จะติดตามผลและปรับแผนทุก 1-3 เดือน' } },
    { '@type': 'Question', name: 'ยา GLP-1 ซื้อเองได้ไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ไม่ได้ครับ ยา GLP-1 ต้องสั่งโดยแพทย์เท่านั้น เนื่องจากต้องประเมินความเหมาะสมและมีการติดตามผลเพื่อความปลอดภัย' } },
  ],
}

const INCLUDES = [
  { icon: '📊', title: 'ประเมิน BMI และสุขภาพ', desc: 'ตรวจร่างกาย ประเมิน BMI น้ำหนัก ค่าไขมัน และโรคร่วม ก่อนเริ่มยา' },
  { icon: '💉', title: 'ยา GLP-1 โดยแพทย์', desc: 'Ozempic (Semaglutide), Saxenda (Liraglutide) เลือกยาที่เหมาะสมกับคุณโดยแพทย์' },
  { icon: '📈', title: 'ติดตามผลต่อเนื่อง', desc: 'นัดพบแพทย์ทุก 1-3 เดือน ปรับยาตามการตอบสนองของร่างกาย' },
  { icon: '🥗', title: 'แผนอาหารและออกกำลังกาย', desc: 'คำแนะนำโภชนาการที่เหมาะสมควบคู่กับยา เพื่อผลลัพธ์ที่ยั่งยืน' },
]

const STEPS = [
  { num: '01', title: 'ประเมิน BMI ฟรี', desc: 'ใช้เครื่องคำนวณ BMI ของเรา หรือปรึกษาแพทย์โดยตรงเพื่อประเมินความเหมาะสม' },
  { num: '02', title: 'พบแพทย์และตรวจเลือด', desc: 'แพทย์ตรวจสุขภาพเบื้องต้น สั่งยาและปริมาณที่เหมาะสมกับคุณ' },
  { num: '03', title: 'ติดตามผลและปรับยา', desc: 'พบแพทย์สม่ำเสมอ ติดตามน้ำหนักและค่าไต ปรับยาให้เหมาะสม' },
]

const FAQS = [
  { q: 'GLP-1 คืออะไร?', a: 'GLP-1 คือฮอร์โมนธรรมชาติที่ร่างกายผลิตหลังกินอาหาร ยาในกลุ่มนี้เช่น Semaglutide (Ozempic) และ Liraglutide (Saxenda) ช่วยลดความหิว ควบคุมน้ำตาล และทำให้น้ำหนักลดได้อย่างยั่งยืน' },
  { q: 'ใครเหมาะสมกับยา GLP-1?', a: 'เหมาะสำหรับผู้ที่มี BMI ≥ 30 หรือ BMI ≥ 27.5 ร่วมกับโรคเช่น เบาหวาน ความดันสูง ไขมันสูง ต้องผ่านการประเมินจากแพทย์ก่อนเสมอ' },
  { q: 'GLP-1 มีผลข้างเคียงอะไรบ้าง?', a: 'ผลข้างเคียงที่พบบ่อยคือคลื่นไส้ อาเจียน ท้องเสีย โดยเฉพาะช่วงแรก ซึ่งมักดีขึ้นเองภายใน 2-4 สัปดาห์ แพทย์จะปรับยาเพื่อลดผลข้างเคียง' },
  { q: 'ต้องใช้ยานานแค่ไหน?', a: 'ระยะเวลาขึ้นอยู่กับเป้าหมายน้ำหนักและสุขภาพโดยรวม โดยทั่วไป 6-12 เดือน แพทย์จะติดตามผลและปรับแผนทุก 1-3 เดือน' },
  { q: 'ยา GLP-1 ซื้อเองได้ไหม?', a: 'ไม่ได้ครับ ยา GLP-1 ต้องสั่งโดยแพทย์เท่านั้น เนื่องจากต้องประเมินความเหมาะสมและมีการติดตามผลเพื่อความปลอดภัย' },
]

export default function GLP1Page() {
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
        <Link href="/contact?service=glp1" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
          💬 ปรึกษาฟรี
        </Link>
      </nav>

      {/* HERO */}
      <section className="min-h-[70vh] flex items-center pt-16 px-6 md:px-20 bg-gradient-to-br from-emerald-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            💉 Weight Management
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            GLP-1<br/>ลดน้ำหนักถาวร<br/>
            <em className="text-emerald-600">ภายใต้การดูแลแพทย์</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            Ozempic, Saxenda และยา GLP-1 อื่นๆ สั่งโดยแพทย์ผู้เชี่ยวชาญ<br/>
            ปลอดภัย ผลลัพธ์ยั่งยืน ติดตามผลต่อเนื่อง สมุทรสาคร
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/contact?service=glp1" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              📝 ประเมิน BMI ฟรี
            </Link>
            <Link href="/tools#bmi" className="flex items-center justify-center gap-2 border-2 border-emerald-300 text-emerald-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-emerald-50 transition-all">
              💉 คำนวณ BMI
            </Link>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[['✓','ยาแท้จาก บ.ผู้ผลิต'],['🩺','ดูแลโดยแพทย์'],['📈','ติดตามผลต่อเนื่อง']].map(([icon,text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INCLUDES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">บริการของเรา</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">ดูแลทุกขั้นตอน</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {INCLUDES.map(item => (
              <div key={item.title} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
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
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">พร้อมเริ่มต้นลดน้ำหนักอย่างถูกต้อง?</h2>
          <p className="text-muted mb-8">ประเมิน BMI ฟรี ปรึกษาแพทย์โดยตรง ตอบกลับภายใน 30 นาที</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact?service=glp1" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              📝 ปรึกษาฟรี
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              💬 LINE @roogondee
            </a>
          </div>
        </div>
      </section>

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
