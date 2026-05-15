import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QUIZZES } from '@/lib/quiz/questions'
import type { Service } from '@/types'

export const revalidate = 0

const SERVICE_LABELS: Record<string, string> = {
  glp1:    '💉 GLP-1',
  std:     '🔴 STD',
  ckd:     '🫘 CKD',
  foreign: '🧪 แรงงาน',
  mens:    '👨 Men',
}

const SERVICES: Service[] = ['glp1', 'std', 'ckd', 'mens', 'foreign']
const DAY_OPTIONS = [7, 30, 90] as const

interface FunnelRow {
  session_id: string
  service: string
  event: string
  question_index: number | null
}

interface ServiceStats {
  service: Service
  totalSessions: number
  submitted: number
  reachedContact: number
  perQuestion: { index: number; question_id: string; reached: number }[]
}

function aggregate(rows: FunnelRow[], service: Service): ServiceStats {
  const def = QUIZZES[service]
  const sessions = new Map<string, { maxIdx: number; reachedContact: boolean; submitted: boolean }>()
  for (const r of rows) {
    if (r.service !== service) continue
    const cur = sessions.get(r.session_id) ?? { maxIdx: -1, reachedContact: false, submitted: false }
    if (r.event === 'progress' && typeof r.question_index === 'number' && r.question_index > cur.maxIdx) {
      cur.maxIdx = r.question_index
    }
    if (r.event === 'complete') cur.reachedContact = true
    if (r.event === 'submit_success') cur.submitted = true
    sessions.set(r.session_id, cur)
  }

  const totalSessions = sessions.size
  let reachedContact = 0
  let submitted = 0
  const reachCounts = new Array(def.questions.length).fill(0)
  for (const s of Array.from(sessions.values())) {
    if (s.reachedContact) reachedContact += 1
    if (s.submitted) submitted += 1
    for (let i = 0; i <= s.maxIdx && i < reachCounts.length; i += 1) {
      reachCounts[i] += 1
    }
  }

  return {
    service,
    totalSessions,
    submitted,
    reachedContact,
    perQuestion: def.questions.map((q, i) => ({
      index: i,
      question_id: q.id,
      reached: reachCounts[i],
    })),
  }
}

function pct(n: number, total: number): string {
  if (!total) return '—'
  return `${Math.round((n / total) * 100)}%`
}

export default async function QuizFunnelPage({
  searchParams,
}: {
  searchParams: { service?: string; days?: string }
}) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const filterService = (searchParams.service ?? 'all') as 'all' | Service
  const days = DAY_OPTIONS.includes(Number(searchParams.days) as 7 | 30 | 90)
    ? (Number(searchParams.days) as 7 | 30 | 90)
    : 7
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabaseAdmin
    .from('quiz_funnel_events')
    .select('session_id, service, event, question_index')
    .gte('created_at', sinceIso)
    .limit(50_000)
  if (filterService !== 'all') query = query.eq('service', filterService)

  const { data, error } = await query
  const rows = (data ?? []) as FunnelRow[]

  const visibleServices: Service[] = filterService === 'all' ? SERVICES : [filterService]
  const stats = visibleServices
    .map(s => aggregate(rows, s))
    .filter(s => s.totalSessions > 0 || filterService !== 'all')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-forest mb-1">Quiz Funnel</h1>
        <p className="text-sm text-gray-500">
          การหายไปของผู้ใช้ระหว่างทำ quiz — ดูว่าคำถามไหนทำคนหลุดเยอะ
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <a
          href={`/admin/quiz-funnel?service=all&days=${days}`}
          className={`px-3 py-1.5 rounded-full border font-medium transition-colors ${filterService === 'all' ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}
        >ทั้งหมด</a>
        {SERVICES.map(s => (
          <a
            key={s}
            href={`/admin/quiz-funnel?service=${s}&days=${days}`}
            className={`px-3 py-1.5 rounded-full border font-medium transition-colors ${filterService === s ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}
          >{SERVICE_LABELS[s]}</a>
        ))}
        <span className="text-gray-300 mx-1">|</span>
        {DAY_OPTIONS.map(d => (
          <a
            key={d}
            href={`/admin/quiz-funnel?service=${filterService}&days=${d}`}
            className={`px-3 py-1.5 rounded-full border font-medium transition-colors ${days === d ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}
          >{d} วัน</a>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ดึงข้อมูลไม่สำเร็จ: {error.message}
        </div>
      )}

      {stats.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400 text-sm">
          ยังไม่มีข้อมูลในช่วง {days} วันที่ผ่านมา
        </div>
      )}

      {stats.map(s => {
        const def = QUIZZES[s.service]
        return (
          <section key={s.service} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{SERVICE_LABELS[s.service]}</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">{s.totalSessions} sessions</span>
                <span className="text-forest font-bold">
                  Conversion {pct(s.submitted, s.totalSessions)}
                </span>
              </div>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 w-12">#</th>
                    <th className="text-left px-4 py-3">คำถาม</th>
                    <th className="text-right px-4 py-3">เข้าถึง</th>
                    <th className="text-right px-4 py-3">% รวม</th>
                    <th className="text-right px-4 py-3">หลุดจากขั้นนี้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {s.perQuestion.map((row, i) => {
                    const next = s.perQuestion[i + 1]?.reached ?? s.reachedContact
                    const drop = row.reached - next
                    const dropRate = row.reached ? drop / row.reached : 0
                    const heavy = dropRate >= 0.25 && row.reached >= 5
                    const q = def.questions[row.index]
                    return (
                      <tr key={row.question_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-400">{row.index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{q?.title ?? row.question_id}</div>
                          <div className="text-xs text-gray-400 font-mono">{row.question_id}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{row.reached}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {pct(row.reached, s.totalSessions)}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs ${heavy ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                          {drop > 0 ? `−${drop} (${Math.round(dropRate * 100)}%)` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-mint/5">
                    <td className="px-4 py-3 text-xs text-gray-400">✓</td>
                    <td className="px-4 py-3 font-semibold text-forest">ถึงหน้ากรอกข้อมูลติดต่อ</td>
                    <td className="px-4 py-3 text-right font-mono">{s.reachedContact}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {pct(s.reachedContact, s.totalSessions)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      −{Math.max(0, s.reachedContact - s.submitted)}
                    </td>
                  </tr>
                  <tr className="bg-forest/5">
                    <td className="px-4 py-3 text-xs text-gray-400">🎟</td>
                    <td className="px-4 py-3 font-semibold text-forest">ส่งฟอร์มสำเร็จ (ได้ voucher)</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{s.submitted}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-forest">
                      {pct(s.submitted, s.totalSessions)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      <p className="text-xs text-gray-400">
        ข้อมูลจาก <code className="font-mono">quiz_funnel_events</code> — บันทึกฝั่งเซิร์ฟเวอร์ทุกครั้งที่ผู้ใช้กด &ldquo;ถัดไป&rdquo;
        แยกจาก GA4/Pixel ที่ ad-blocker บล็อกได้
      </p>
    </div>
  )
}
