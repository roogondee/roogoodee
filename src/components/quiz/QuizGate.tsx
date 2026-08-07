import Link from 'next/link'
import Image from 'next/image'
import type { QuizDefinition } from '@/lib/quiz/questions'
import { SERVICES } from '@/types'
import { liffQuizUrl } from '@/lib/liff-links'
import QuizGateActions from './QuizGateActions'

// LINE-first gate that replaced the on-site quiz.
//
// The quiz now lives exclusively inside LINE (/liff/quiz): the customer adds
// @roogondee once, takes the quiz in the chat, and the voucher is pushed to
// them there — so every lead is contactable from the first second instead of
// being an anonymous web submission. These /quiz/* routes stay alive because
// ads, blog CTAs, and the FB/LINE composer all link to them; they now hand
// the visitor to LINE rather than running the quiz.
//
// Server component on purpose: this is ad landing copy that must exist in the
// static HTML. Only the CTAs are a client island (see QuizGateActions).

const STEPS = [
  { n: '1', title: 'กดปุ่มเขียว เพิ่มเพื่อน @roogondee', desc: 'ใช้เวลา 2 วินาที ไม่มีค่าใช้จ่าย' },
  { n: '2', title: 'ทำแบบประเมินในแชท', desc: 'ตอบคำถามสั้นๆ ไม่ต้องกรอกชื่อ เบอร์ หรืออีเมล' },
  { n: '3', title: 'รับ voucher เข้าแชททันที', desc: 'พร้อมผลประเมินเบื้องต้น ทีมงานดูแลต่อในแชทเดิม' },
]

interface Props {
  definition: QuizDefinition
  /** Server-rendered QR of the LIFF link, for desktop visitors. */
  qrDataUrl?: string
}

export default function QuizGate({ definition, qrDataUrl }: Props) {
  const dark = definition.darkMode
  const service = definition.service
  const meta = SERVICES[service]
  const baseHref = liffQuizUrl({ service })

  return (
    <main className={`min-h-screen flex items-center justify-center p-4 md:p-6 ${dark ? 'bg-neutral-900' : 'bg-gradient-to-br from-forest via-sage to-mint'}`}>
      <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl ${dark ? 'bg-neutral-800 border border-white/10' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className={`text-sm ${dark ? 'text-white/60' : 'text-muted'}`}>← หน้าแรก</Link>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${dark ? 'bg-mint/15 text-mint' : 'bg-mint/15 text-forest'}`}>
            ฟรี ไม่มีค่าใช้จ่าย
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{meta?.emoji}</div>
          <h1 className={`font-display text-2xl md:text-3xl mb-2 ${dark ? 'text-white' : 'text-forest'}`}>
            {definition.landingHeadline}
          </h1>
          <p className={`text-sm leading-relaxed ${dark ? 'text-white/60' : 'text-muted'}`}>
            {definition.subHeadline}
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-5 border bg-mint/5 border-mint/20">
          <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${dark ? 'text-mint' : 'text-forest'}`}>
            แบบประเมินอยู่ในแชท LINE
          </p>
          <ol className="space-y-3">
            {STEPS.map(s => (
              <li key={s.n} className="flex gap-3">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${dark ? 'bg-mint text-neutral-900' : 'bg-forest text-white'}`}>
                  {s.n}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${dark ? 'text-white' : 'text-forest'}`}>{s.title}</span>
                  <span className={`block text-xs ${dark ? 'text-white/50' : 'text-muted'}`}>{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <QuizGateActions service={service} baseHref={baseHref} dark={dark} />

        {qrDataUrl && (
          <div className={`rounded-2xl p-4 mt-5 text-center border ${dark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xs mb-3 ${dark ? 'text-white/60' : 'text-muted'}`}>
              อยู่บนคอมพิวเตอร์? สแกน QR นี้ด้วยมือถือเพื่อเริ่ม
            </p>
            <Image
              src={qrDataUrl}
              alt="QR code เปิดแบบประเมินใน LINE"
              width={160}
              height={160}
              unoptimized
              className="mx-auto rounded-xl bg-white p-2"
            />
          </div>
        )}
      </div>
    </main>
  )
}
