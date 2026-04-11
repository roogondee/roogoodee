import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import AskForm from '@/components/ui/AskForm'
import NavBar from '@/components/ui/NavBar'

export const metadata: Metadata = {
  title: 'ถามผู้เชี่ยวชาญ — Q&A สุขภาพฟรี | รู้ก่อนดี(รู้งี้)',
  description: 'ถามคำถามสุขภาพ รับคำตอบจากผู้เชี่ยวชาญทันที ฟรี ไม่ตัดสิน ครอบคลุม STD, GLP-1, CKD, แรงงานต่างด้าว',
  alternates: { canonical: 'https://roogondee.com/ask' },
  openGraph: {
    title: 'ถามผู้เชี่ยวชาญด้านสุขภาพ ฟรี',
    description: 'รับคำตอบทันทีจาก AI ที่ผ่านการตรวจสอบโดยทีมแพทย์ รู้ก่อนดี(รู้งี้)',
    url: 'https://roogondee.com/ask',
  },
}

export const revalidate = 60

async function getRecentQAs() {
  try {
    const { data } = await supabaseAdmin
      .from('qa_posts')
      .select('id, question, answer, service, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(10)
    return data || []
  } catch {
    return []
  }
}

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD & PrEP',
  glp1: '💉 GLP-1',
  ckd: '🫘 CKD',
  foreign: '🧪 แรงงาน',
  general: '💬 ทั่วไป',
}

const SERVICE_COLORS: Record<string, string> = {
  std: 'bg-rose-100 text-rose-700',
  glp1: 'bg-emerald-100 text-emerald-700',
  ckd: 'bg-blue-100 text-blue-700',
  foreign: 'bg-amber-100 text-amber-700',
  general: 'bg-gray-100 text-gray-600',
}

export default async function AskPage() {
  const recent = await getRecentQAs()

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />

      <div className="pt-24 pb-16 px-6 md:px-20 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">Q&A Hub</p>
          <h1 className="font-display text-3xl md:text-5xl text-forest mb-4">ถามผู้เชี่ยวชาญได้เลย</h1>
          <p className="text-muted text-base md:text-lg max-w-xl">
            รับคำตอบจาก AI ที่ผ่านการตรวจสอบโดยทีมแพทย์ ทันที ฟรี ไม่ตัดสิน<br/>
            <span className="text-sm">ไม่ต้องสมัครสมาชิก ไม่เก็บข้อมูลส่วนตัว</span>
          </p>
        </div>

        {/* Ask form — client component */}
        <AskForm />

        {/* Popular questions */}
        <div className="mt-6 bg-white border border-mint/20 rounded-2xl p-5">
          <p className="text-xs font-bold text-muted mb-3">ลองถามเรื่องเหล่านี้</p>
          <div className="flex flex-wrap gap-2">
            {[
              'PrEP ราคาเท่าไหร่ ต้องกินนานแค่ไหน?',
              'GLP-1 กับ BMI 28 เหมาะไหม?',
              'ค่าครีอะตินีน 1.5 อันตรายไหม?',
              'ตรวจ STD ครบต้องเสียเงินเท่าไหร่?',
              'แรงงานต้องตรวจโรคอะไรบ้างก่อนทำงาน?',
            ].map(q => (
              <button key={q} data-question={q}
                className="suggest-btn text-xs bg-mint/10 hover:bg-mint/20 text-sage border border-mint/20 rounded-full px-3 py-1.5 transition-colors cursor-pointer">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Q&As */}
        {recent.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-2xl text-forest mb-6">คำถามที่ผ่านมา</h2>
            <div className="space-y-4">
              {recent.map(qa => (
                <div key={qa.id} className="bg-white border border-mint/15 rounded-2xl p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-semibold text-forest text-sm md:text-base leading-tight">{qa.question}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${SERVICE_COLORS[qa.service] || SERVICE_COLORS.general}`}>
                      {SERVICE_LABELS[qa.service] || qa.service}
                    </span>
                  </div>
                  <p className="text-muted text-sm leading-relaxed line-clamp-4">{qa.answer}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    {qa.created_at ? new Date(qa.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-forest to-sage rounded-3xl p-8 text-white text-center">
          <h2 className="font-display text-2xl mb-2">ต้องการคำแนะนำส่วนตัว?</h2>
          <p className="text-white/70 text-sm mb-5">พูดคุยกับทีมผู้เชี่ยวชาญของเราโดยตรง ตอบภายใน 30 นาที</p>
          <a href="/contact" className="inline-block bg-white text-forest font-bold px-8 py-3 rounded-full text-sm hover:bg-cream transition-colors">
            📝 ปรึกษาฟรี →
          </a>
        </div>
      </div>
    </main>
  )
}
