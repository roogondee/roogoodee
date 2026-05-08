import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'

export const revalidate = 0

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD', glp1: '💉 GLP-1', ckd: '🫘 CKD', foreign: '🧪 แรงงาน',
  general: '💬 ทั่วไป', 'chat-widget': '💬 Chat',
}

const TIER_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  hot:    'bg-orange-100 text-orange-700',
  warm:   'bg-yellow-100 text-yellow-700',
  cold:   'bg-sky-100 text-sky-700',
}

const OUTCOME_LABEL: Record<string, string> = {
  answered: 'รับสาย', no_answer: 'ไม่รับ', voicemail: 'ฝากข้อความ',
  wrong_number: 'เบอร์ผิด', line_sent: 'LINE แล้ว', sms_sent: 'SMS แล้ว',
  email_sent: 'Email แล้ว', scheduled: 'นัดไว้',
}

function fmtRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const minutes = Math.round(abs / 60_000)
  const hours = Math.round(abs / 3_600_000)
  const days = Math.round(abs / 86_400_000)
  const past = diffMs < 0
  if (minutes < 60)  return past ? `เลย ${minutes} นาที` : `อีก ${minutes} นาที`
  if (hours < 24)    return past ? `เลย ${hours} ชม.`     : `อีก ${hours} ชม.`
  return past ? `เลย ${days} วัน` : `อีก ${days} วัน`
}

interface LeadRow {
  id: string
  service: string
  first_name: string
  last_name: string | null
  phone: string
  status: string | null
  lead_tier: string | null
  ai_score: number | null
  ai_score_action: string | null
  next_followup_at: string | null
  last_contacted_at: string | null
  last_outcome: string | null
  contact_attempts: number | null
  created_at: string
}

// Salesperson task queue. The list a sale opens first thing in the morning to
// know "who do I call today?" — built so the highest-leverage lead is always
// row 1 and the team doesn't need to think about ordering.
//
// Ordering rules (top to bottom):
//   1. Overdue follow-ups (next_followup_at <= now) — sorted by how overdue.
//   2. Untouched new leads — never been contacted, ordered by AI score desc.
//   3. Future scheduled follow-ups, ordered by next_followup_at asc.
//
// Closed states (customer / lost) are filtered out — those leads no longer
// need salesperson attention and pollute the queue.
export default async function MyTasksPage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const now = new Date().toISOString()

  let query = supabaseAdmin
    .from('leads')
    .select('id, service, first_name, last_name, phone, status, lead_tier, ai_score, ai_score_action, next_followup_at, last_contacted_at, last_outcome, contact_attempts, created_at')
    .not('status', 'in', '(customer,lost)')
    .limit(200)

  // Sales role sees only their own assignments. Manager sees everyone's so
  // they can spot bottlenecks (e.g. one salesperson with 50 overdue leads).
  if (me.role === 'sale' && me.id) query = query.eq('assigned_to', me.id)

  const { data, error } = await query
  if (error) {
    return <div className="text-red-600 text-sm">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>
  }
  const leads = (data || []) as LeadRow[]

  const overdue: LeadRow[] = []
  const untouched: LeadRow[] = []
  const upcoming: LeadRow[] = []

  for (const l of leads) {
    if (l.next_followup_at && l.next_followup_at <= now) overdue.push(l)
    else if (!l.last_contacted_at && !l.next_followup_at) untouched.push(l)
    else if (l.next_followup_at) upcoming.push(l)
    // leads with last_contacted_at but no next_followup_at are paused — show
    // them in upcoming bucket (sorted to the bottom) so they're not forgotten.
    else upcoming.push(l)
  }

  overdue.sort((a, b) => (a.next_followup_at || '').localeCompare(b.next_followup_at || ''))
  untouched.sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
  upcoming.sort((a, b) => (a.next_followup_at || 'z').localeCompare(b.next_followup_at || 'z'))

  const totalActive = overdue.length + untouched.length + upcoming.length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-forest">My Tasks</h1>
          <p className="text-sm text-muted">
            {me.role === 'sale' ? `สวัสดีคุณ ${me.name || me.email}` : `Manager view — ทั้งทีม`}
            {' · '}{totalActive} lead ที่ยังต้องตามต่อ
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Stat label="เกินกำหนด" count={overdue.length} color="bg-red-100 text-red-700" />
          <Stat label="ยังไม่แตะ"  count={untouched.length} color="bg-amber-100 text-amber-700" />
          <Stat label="นัดไว้แล้ว" count={upcoming.length} color="bg-sky-100 text-sky-700" />
        </div>
      </header>

      <Section
        title="🚨 เกินกำหนดติดตาม"
        description="นัดเอาไว้แต่ผ่านมาแล้ว — โทรก่อนเลย ไม่งั้น lead เย็น"
        leads={overdue}
        bucket="overdue"
      />

      <Section
        title="📞 Lead ใหม่ ยังไม่ได้ติดต่อ"
        description="เรียงตาม AI score — โทรตัวคะแนนสูงก่อนได้เปอร์เซ็นต์ปิดดีลที่สุด"
        leads={untouched}
        bucket="untouched"
      />

      <Section
        title="🗓 นัดติดตามที่กำหนดไว้"
        description="ยังไม่ถึงเวลา — เรียงตามวันใกล้สุด"
        leads={upcoming}
        bucket="upcoming"
      />

      {totalActive === 0 && (
        <div className="bg-mint/10 border border-mint/30 rounded-xl p-8 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-forest font-semibold">ไม่มี lead ค้าง — ทำไปแล้วเรียบร้อย!</p>
          <p className="text-sm text-muted mt-1">ใหม่ๆ มาแล้วจะเด้งมาเป็นรายแรกในช่อง "ยังไม่แตะ"</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`px-3 py-1.5 rounded-full ${color} font-semibold`}>
      {label}: {count}
    </div>
  )
}

function Section({
  title,
  description,
  leads,
  bucket,
}: {
  title: string
  description: string
  leads: LeadRow[]
  bucket: 'overdue' | 'untouched' | 'upcoming'
}) {
  if (leads.length === 0) return null
  return (
    <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-semibold text-forest text-sm">{title} ({leads.length})</h2>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </header>
      <ul className="divide-y divide-gray-50">
        {leads.map(l => (
          <li key={l.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
            <Link href={`/admin/leads/${l.id}`} className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-forest text-sm">{l.first_name} {l.last_name || ''}</span>
                  <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} className="text-xs font-mono text-mint hover:underline">{l.phone}</a>
                  <span className="text-xs text-muted">{SERVICE_LABELS[l.service] || l.service}</span>
                  {l.lead_tier && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TIER_COLOR[l.lead_tier]}`}>
                      {l.lead_tier.toUpperCase()}
                    </span>
                  )}
                  {typeof l.ai_score === 'number' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-gray-100 text-gray-700">
                      AI {l.ai_score}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted mt-1 flex items-center gap-3 flex-wrap">
                  {bucket === 'overdue' && l.next_followup_at && (
                    <span className="text-red-600 font-semibold">⏰ {fmtRelative(l.next_followup_at)}</span>
                  )}
                  {bucket === 'upcoming' && l.next_followup_at && (
                    <span className="text-sky-600">🗓 {fmtRelative(l.next_followup_at)}</span>
                  )}
                  {bucket === 'untouched' && (
                    <span className="text-amber-600 font-semibold">⏰ ใหม่ — {fmtRelative(l.created_at)}</span>
                  )}
                  {typeof l.contact_attempts === 'number' && l.contact_attempts > 0 && (
                    <span>โทรไปแล้ว {l.contact_attempts}×</span>
                  )}
                  {l.last_outcome && (
                    <span>ล่าสุด: {OUTCOME_LABEL[l.last_outcome] || l.last_outcome}</span>
                  )}
                </div>
                {l.ai_score_action && (
                  <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">💡 {l.ai_score_action}</p>
                )}
              </div>
              <span className="text-mint text-lg shrink-0">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
