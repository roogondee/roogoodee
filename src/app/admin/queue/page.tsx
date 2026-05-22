import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 0

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD', glp1: '💉 GLP-1', ckd: '🫘 CKD', foreign: '🧪 แรงงาน',
  mens: '👨 Men 40+', women: '👩 Women', mind: '🧠 Mind',
}

const TIER_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  hot:    'bg-orange-100 text-orange-700',
  warm:   'bg-yellow-100 text-yellow-700',
  cold:   'bg-sky-100 text-sky-700',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

function relativeFromNow(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const h = Math.round(abs / 3_600_000)
  if (h < 24) return diffMs >= 0 ? `อีก ${h} ชม.` : `เกิน ${h} ชม.`
  const d = Math.round(abs / 86_400_000)
  return diffMs >= 0 ? `อีก ${d} วัน` : `เกิน ${d} วัน`
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: { view?: string; assignee?: string }
}) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const view = searchParams.view || 'mine'
  const filterAssignee = searchParams.assignee || 'all'
  const showAll = me.role === 'manager' && view === 'all'
  const scopedAssignee = showAll ? null : (me.role === 'sale' ? me.id : (filterAssignee !== 'all' ? filterAssignee : null))

  const now = new Date().toISOString()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)

  // Bucket 1 — explicitly scheduled and due (next_action_at <= now)
  let overdueQuery = supabaseAdmin
    .from('leads')
    .select('id, first_name, last_name, phone, service, lead_tier, lead_score, status, assigned_to, last_contacted_at, next_action_at, next_action_note, created_at')
    .not('next_action_at', 'is', null)
    .lte('next_action_at', now)
    .not('status', 'in', '(customer,lost,converted)')
    .order('next_action_at', { ascending: true })
    .limit(100)

  // Bucket 2 — due later today
  let todayQuery = supabaseAdmin
    .from('leads')
    .select('id, first_name, last_name, phone, service, lead_tier, lead_score, status, assigned_to, last_contacted_at, next_action_at, next_action_note, created_at')
    .gt('next_action_at', now)
    .lte('next_action_at', endOfToday.toISOString())
    .not('status', 'in', '(customer,lost,converted)')
    .order('next_action_at', { ascending: true })
    .limit(100)

  // Bucket 3 — never contacted, new leads ≥24h old, no scheduled action
  let staleQuery = supabaseAdmin
    .from('leads')
    .select('id, first_name, last_name, phone, service, lead_tier, lead_score, status, assigned_to, last_contacted_at, next_action_at, next_action_note, created_at')
    .is('last_contacted_at', null)
    .is('next_action_at', null)
    .lt('created_at', dayAgo)
    .not('status', 'in', '(customer,lost,converted)')
    .order('lead_score', { ascending: false, nullsFirst: false })
    .limit(100)

  if (scopedAssignee) {
    overdueQuery = overdueQuery.eq('assigned_to', scopedAssignee)
    todayQuery   = todayQuery.eq('assigned_to', scopedAssignee)
    staleQuery   = staleQuery.eq('assigned_to', scopedAssignee)
  }

  const [{ data: overdue }, { data: today }, { data: stale }, { data: assignees }] = await Promise.all([
    overdueQuery,
    todayQuery,
    staleQuery,
    me.role === 'manager'
      ? supabaseAdmin.from('admin_users').select('id, name, email').is('disabled_at', null).order('name', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const assigneeById = new Map((assignees || []).map(u => [u.id, u.name || u.email]))

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl text-forest">คิวติดตาม</h1>
        {me.role === 'manager' && (
          <div className="flex items-center gap-2 text-xs">
            <Link href="/admin/queue?view=mine"
              className={`px-3 py-1.5 rounded-full border font-medium ${view === 'mine' ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}>
              ของฉัน
            </Link>
            <Link href="/admin/queue?view=all"
              className={`px-3 py-1.5 rounded-full border font-medium ${view === 'all' ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}>
              ทั้งทีม
            </Link>
            {view === 'all' && assignees && assignees.length > 0 && (
              <form method="GET" action="/admin/queue" className="contents">
                <input type="hidden" name="view" value="all" />
                <select
                  name="assignee"
                  defaultValue={filterAssignee}
                  className="border border-gray-200 rounded-full px-3 py-1.5 bg-white text-gray-700"
                >
                  <option value="all">ทุกคน</option>
                  {assignees.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
                <button type="submit" className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-forest">กรอง</button>
              </form>
            )}
          </div>
        )}
      </header>

      <Bucket
        title="🚨 ค้างคิว (เลยกำหนดแล้ว)"
        leads={overdue || []}
        emptyText="ไม่มีค้าง — เยี่ยมเลย"
        accent="border-red-300"
        showAssignee={showAll}
        assigneeById={assigneeById}
      />

      <Bucket
        title="📅 วันนี้ต้องตาม"
        leads={today || []}
        emptyText="วันนี้ไม่มีนัด"
        accent="border-blue-200"
        showAssignee={showAll}
        assigneeById={assigneeById}
      />

      <Bucket
        title="❄️ ยังไม่ได้แตะ (≥ 24 ชม.)"
        leads={stale || []}
        emptyText="ไม่มี lead ค้างไม่ได้แตะ"
        accent="border-gray-200"
        showAssignee={showAll}
        assigneeById={assigneeById}
      />
    </div>
  )
}

interface BucketLead {
  id: string
  first_name: string
  last_name: string | null
  phone: string | null
  service: string
  lead_tier: string | null
  lead_score: number | null
  status: string | null
  assigned_to: string | null
  last_contacted_at: string | null
  next_action_at: string | null
  next_action_note: string | null
  created_at: string
}

function Bucket({
  title, leads, emptyText, accent, showAssignee, assigneeById,
}: {
  title: string
  leads: BucketLead[]
  emptyText: string
  accent: string
  showAssignee: boolean
  assigneeById: Map<string, string>
}) {
  return (
    <section className={`bg-white rounded-xl border-2 ${accent} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <span className="text-xs text-gray-400">{leads.length} รายการ</span>
      </div>
      {leads.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-400 text-center">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {leads.map(l => (
            <li key={l.id} className="px-5 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/leads/${l.id}`} className="font-medium text-gray-800 hover:text-forest hover:underline">
                      {l.first_name} {l.last_name || ''}
                    </Link>
                    <span className="text-xs">{SERVICE_LABELS[l.service] || l.service}</span>
                    {l.lead_tier && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_COLOR[l.lead_tier] || 'bg-gray-100 text-gray-600'}`}>
                        {l.lead_tier}{typeof l.lead_score === 'number' ? ` ${l.lead_score}` : ''}
                      </span>
                    )}
                    {l.phone && <a href={`tel:${l.phone}`} className="text-xs text-forest font-mono hover:underline">{l.phone}</a>}
                    {showAssignee && l.assigned_to && (
                      <span className="text-xs text-gray-500">👤 {assigneeById.get(l.assigned_to) || '—'}</span>
                    )}
                  </div>
                  {l.next_action_note && (
                    <p className="text-xs text-gray-600 mt-1">⏭ {l.next_action_note}</p>
                  )}
                </div>
                <div className="text-right text-xs">
                  {l.next_action_at ? (
                    <>
                      <p className="text-gray-700 font-medium">{fmt(l.next_action_at)}</p>
                      <p className={new Date(l.next_action_at) < new Date() ? 'text-red-600' : 'text-blue-600'}>
                        {relativeFromNow(l.next_action_at)}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-400">สร้าง {fmt(l.created_at)}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
