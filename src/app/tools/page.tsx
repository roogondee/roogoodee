import type { Metadata } from 'next'
import { BMICalc, EGFRCalc, PrEPQuiz } from '@/components/ui/HealthCalcs'

export const metadata: Metadata = {
  title: 'เครื่องคำนวณสุขภาพ — BMI, eGFR, PrEP | รู้ก่อนดี',
  description: 'คำนวณ BMI ประเมินความเหมาะสม GLP-1, คำนวณ eGFR ประเมินระยะ CKD, และ PrEP Risk Assessment ฟรี โดย รู้ก่อนดี',
  alternates: { canonical: 'https://roogondee.com/tools' },
  openGraph: {
    title: 'เครื่องคำนวณสุขภาพ — BMI, eGFR, PrEP',
    description: 'เครื่องมือประเมินสุขภาพฟรี: BMI+GLP-1, eGFR+CKD, PrEP Risk Quiz',
    url: 'https://roogondee.com/tools',
  },
}

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-cream">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <a href="/" className="font-display text-xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></a>
        <a href="/contact" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
          💬 ปรึกษาฟรี
        </a>
      </nav>

      <div className="pt-24 pb-16 px-6 md:px-20 max-w-6xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">Health Tools</p>
          <h1 className="font-display text-3xl md:text-5xl text-forest mb-4">เครื่องคำนวณสุขภาพ</h1>
          <p className="text-muted text-base md:text-lg max-w-xl">ประเมินสุขภาพเบื้องต้นด้วยตัวเอง ฟรี ก่อนพบแพทย์ ผลลัพธ์เป็นการประเมินเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยโรค</p>
        </div>

        {/* Tool tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { emoji: '💉', label: 'BMI & GLP-1', anchor: '#bmi', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { emoji: '🫘', label: 'eGFR & CKD', anchor: '#egfr', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { emoji: '🔴', label: 'PrEP Risk', anchor: '#prep', color: 'bg-rose-50 border-rose-200 text-rose-700' },
          ].map(t => (
            <a key={t.anchor} href={t.anchor} className={`flex items-center gap-3 ${t.color} border rounded-xl px-5 py-3.5 font-semibold text-sm hover:shadow-md transition-all`}>
              <span className="text-2xl">{t.emoji}</span>{t.label}
            </a>
          ))}
        </div>

        <div className="space-y-8">
          <div id="bmi"><BMICalc /></div>
          <div id="egfr"><EGFRCalc /></div>
          <div id="prep"><PrEPQuiz /></div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="font-display text-2xl md:text-3xl mb-3">ต้องการคำแนะนำจากแพทย์?</h2>
          <p className="text-white/70 text-sm mb-6">ปรึกษาทีมผู้เชี่ยวชาญฟรี ไม่ตัดสิน ตอบภายใน 30 นาที</p>
          <a href="/contact" className="inline-block bg-white text-forest font-bold px-8 py-3 rounded-full text-sm hover:bg-cream transition-colors">
            📝 ปรึกษาฟรี →
          </a>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
          ข้อมูลจากเครื่องคำนวณนี้ใช้เพื่อการศึกษาและประเมินเบื้องต้นเท่านั้น ไม่สามารถใช้แทนการวินิจฉัยและคำแนะนำจากแพทย์หรือบุคลากรทางการแพทย์ที่มีใบอนุญาต หากมีอาการผิดปกติหรือข้อสงสัยด้านสุขภาพ กรุณาพบแพทย์เสมอ
        </p>
      </div>
    </main>
  )
}
