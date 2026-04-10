import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา — รู้ก่อนดี | บริษัท เจียรักษา จำกัด',
  description: 'รู้ก่อนดีดำเนินงานโดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร ทีมผู้เชี่ยวชาญด้านสุขภาพ STD PrEP GLP-1 CKD แรงงานต่างด้าว',
  alternates: { canonical: 'https://roogondee.com/about' },
  openGraph: {
    title: 'เกี่ยวกับรู้ก่อนดี',
    description: 'ทีมผู้เชี่ยวชาญด้านสุขภาพ ปรึกษาฟรี ไม่ตัดสิน สมุทรสาคร',
    url: 'https://roogondee.com/about',
  },
}

const TEAM = [
  {
    name: 'ทีมแพทย์เฉพาะทาง',
    role: 'Sexual Health & Infectious Disease',
    desc: 'เชี่ยวชาญด้าน STD, HIV/AIDS, PrEP และ PEP ประสบการณ์กว่า 10 ปี ดูแลผู้ป่วยด้วยความเข้าใจและไม่ตัดสิน',
    icon: '👨‍⚕️',
    color: 'bg-rose-50 border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
  },
  {
    name: 'ทีมต่อมไร้ท่อ',
    role: 'Endocrinology & Metabolic Medicine',
    desc: 'เชี่ยวชาญด้านยา GLP-1 การควบคุมน้ำหนัก เบาหวาน และโรคเมตาบอลิก วางแผนการรักษาเฉพาะบุคคล',
    icon: '💉',
    color: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    name: 'ทีมอายุรแพทย์โรคไต',
    role: 'Nephrology & Internal Medicine',
    desc: 'เชี่ยวชาญด้าน CKD การดูแลไตเรื้อรัง ชะลอการเสื่อมของไต และวางแผนโภชนาการสำหรับผู้ป่วยโรคไต',
    icon: '🫘',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    name: 'ทีมอาชีวเวชศาสตร์',
    role: 'Occupational Medicine',
    desc: 'เชี่ยวชาญด้านสุขภาพแรงงาน ตรวจสุขภาพก่อนเข้างาน ออกใบรับรองแพทย์ และบริการ B2B สำหรับโรงงาน',
    icon: '🧪',
    color: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
]

const VALUES = [
  { icon: '🔒', title: 'ความเป็นส่วนตัว', desc: 'ข้อมูลทุกอย่างถูกเก็บรักษาอย่างเป็นความลับตามมาตรฐาน PDPA' },
  { icon: '🌿', title: 'ไม่ตัดสิน', desc: 'เราเชื่อว่าทุกคนมีสิทธิ์รับการดูแลสุขภาพที่ดีโดยไม่ถูกตัดสิน' },
  { icon: '⚡', title: 'ตอบเร็ว', desc: 'ทีมพร้อมตอบทุกคำถามภายใน 30 นาทีทุกวัน ไม่มีวันหยุด' },
  { icon: '🎯', title: 'แม่นยำ', desc: 'ข้อมูลและคำแนะนำทางการแพทย์ที่ผ่านการตรวจสอบโดยผู้เชี่ยวชาญ' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'เกี่ยวกับรู้ก่อนดี',
  url: 'https://roogondee.com/about',
  description: 'บริษัท เจียรักษา จำกัด ดำเนินงานเว็บไซต์รู้ก่อนดี ร่วมกับ W Medical Hospital สมุทรสาคร',
  mainEntity: {
    '@type': 'MedicalOrganization',
    name: 'รู้ก่อนดี — บริษัท เจียรักษา จำกัด',
    url: 'https://roogondee.com',
    logo: 'https://roogondee.com/favicon.ico',
    address: { '@type': 'PostalAddress', addressLocality: 'สมุทรสาคร', addressCountry: 'TH' },
    telephone: '0819023540',
    sameAs: ['https://line.me/ti/p/@roogondee'],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '127',
      bestRating: '5',
    },
  },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
        <div className="hidden md:flex items-center gap-5 text-sm text-muted">
          <Link href="/blog" className="hover:text-forest transition-colors">บทความ</Link>
          <Link href="/tools" className="hover:text-forest transition-colors">เครื่องคำนวณ</Link>
          <Link href="/faq" className="hover:text-forest transition-colors">FAQ</Link>
        </div>
        <Link href="/contact" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">💬 ปรึกษาฟรี</Link>
      </nav>

      <div className="pt-28 pb-20 max-w-5xl mx-auto px-6">

        {/* Hero */}
        <div className="text-center mb-14 md:mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">เกี่ยวกับเรา</p>
          <h1 className="font-display text-4xl md:text-5xl text-forest leading-tight mb-5">
            สุขภาพของคุณ<br />คือภารกิจของเรา
          </h1>
          <p className="text-muted text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            รู้ก่อนดีก่อตั้งขึ้นด้วยความเชื่อว่าทุกคนควรเข้าถึงคำปรึกษาสุขภาพที่ดีได้ โดยไม่ต้องรู้สึกละอายหรือถูกตัดสิน
          </p>
        </div>

        {/* Story */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16 md:mb-20 items-center">
          <div className="bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-10 text-white">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-4">เรื่องราวของเรา</p>
            <h2 className="font-display text-2xl md:text-3xl mb-4">ทำไมถึงสร้างรู้ก่อนดี</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              ในสมุทรสาคร มีแรงงานและประชาชนจำนวนมากที่ต้องการคำปรึกษาสุขภาพ แต่ไม่กล้าไปหาหมอเพราะกลัวถูกตัดสิน หรือไม่รู้ว่าจะเริ่มต้นอย่างไร
            </p>
            <p className="text-white/70 text-sm leading-relaxed">
              รู้ก่อนดีจึงเกิดขึ้นเพื่อเป็นสะพานเชื่อมระหว่างผู้ที่ต้องการความช่วยเหลือกับทีมผู้เชี่ยวชาญ ในบรรยากาศที่ปลอดภัย ไม่ตัดสิน และเป็นส่วนตัว
            </p>
          </div>
          <div className="space-y-4">
            {[
              { num: '500+', label: 'ผู้ใช้บริการแล้ว' },
              { num: '4.9★', label: 'คะแนนความพึงพอใจ (127 รีวิว)' },
              { num: '30 นาที', label: 'เวลาตอบกลับเฉลี่ย' },
              { num: '7 วัน', label: 'เปิดให้บริการทุกวัน 09-20 น.' },
            ].map(s => (
              <div key={s.num} className="bg-white border border-mint/15 rounded-2xl px-6 py-4 flex items-center gap-4">
                <p className="font-display text-2xl text-forest w-28 flex-shrink-0">{s.num}</p>
                <p className="text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16 md:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">ทีมผู้เชี่ยวชาญ</p>
            <h2 className="font-display text-2xl md:text-3xl text-forest">แพทย์และผู้เชี่ยวชาญของเรา</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEAM.map(t => (
              <div key={t.name} className={`border rounded-2xl p-6 ${t.color}`}>
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{t.icon}</span>
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${t.badge}`}>{t.role}</span>
                    <h3 className="font-semibold text-forest mb-2">{t.name}</h3>
                    <p className="text-sm text-forest/70 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner */}
        <div className="mb-16 md:mb-20 bg-white border border-mint/15 rounded-3xl p-7 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="w-20 h-20 bg-forest/10 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">🏥</div>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">พาร์ทเนอร์</p>
              <h2 className="font-display text-xl text-forest mb-2">W Medical Hospital สมุทรสาคร</h2>
              <p className="text-sm text-muted leading-relaxed">
                รู้ก่อนดีดำเนินงานร่วมกับ W Medical Hospital สมุทรสาคร โรงพยาบาลเอกชนที่ได้รับการรับรองมาตรฐาน มีแพทย์เฉพาะทางครบทุกสาขา และพร้อมให้บริการทั้งคนไทยและแรงงานต่างด้าว
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-16 md:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">ค่านิยมของเรา</p>
            <h2 className="font-display text-2xl md:text-3xl text-forest">สิ่งที่เราเชื่อ</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white border border-mint/15 rounded-2xl p-5 flex items-start gap-4">
                <span className="text-2xl">{v.icon}</span>
                <div>
                  <h3 className="font-semibold text-forest mb-1">{v.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="font-display text-2xl md:text-3xl mb-2">พร้อมให้บริการคุณแล้ว</h2>
          <p className="text-white/70 text-sm mb-6">ปรึกษาฟรี ไม่ตัดสิน ตอบกลับภายใน 30 นาที</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="bg-white text-forest px-8 py-3.5 rounded-full font-bold text-sm hover:bg-cream transition-all">📝 ปรึกษาฟรีเลย</Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer"
              className="bg-white/15 border border-white/30 text-white px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-white/25 transition-all">
              💬 LINE: @roogondee
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
