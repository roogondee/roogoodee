import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD & PrEP',
  glp1: '💉 GLP-1',
  ckd: '🫘 CKD',
  foreign: '🧪 แรงงาน',
  general: '💬 ทั่วไป',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

interface Message {
  role: 'user' | 'assistant'
  content: unknown
}

// Pull the first user-typed text out of the message array for the list preview.
// We skip tool_result blocks (they're echoed back as user role but contain JSON).
function firstUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return ''
  for (const m of messages as Message[]) {
    if (m?.role !== 'user') continue
    if (typeof m.content === 'string') return m.content
    if (Array.isArray(m.content)) {
      for (const block of m.content as Array<{ type?: string; text?: string }>) {
        if (block?.type === 'text' && typeof block.text === 'string') return block.text
      }
    }
  }
  return ''
}

export const revalidate = 30

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: { service?: string; has_lead?: string }
}) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  let query = supabaseAdmin
    .from('chat_sessions')
    .select('id,messages,service_hint,turn_count,lead_id,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(150)

  if (searchParams.service && searchParams.service !== 'all') {
    query = query.eq('service_hint', searchParams.service)
  }
  if (searchParams.has_lead === 'yes') query = query.not('lead_id', 'is', null)
  if (searchParams.has_lead === 'no') query = query.is('lead_id', null)

  const { data: sessions } = await query

  // Pull lead names for sessions that captured one, in a single round-trip
  const leadIds = (sessions || [])
    .map(s => s.lead_id as string | null)
    .filter((id): id is string => !!id)
  const { data: leads } = leadIds.length
    ? await supabaseAdmin.from('leads').select('id,first_name,phone').in('id', leadIds)
    : { data: [] as { id: string; first_name: string; phone: string }[] }
  const leadById = new Map((leads || []).map(l => [l.id, l]))

  const total = sessions?.length || 0
  const withLead = (sessions || []).filter(s => s.lead_id).length
  const conversionRate = total ? Math.round((withLead / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest">💬 Chat Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">บทสนทนาจาก AI chat widget — เรียงตามอัปเดตล่าสุด</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="text-gray-500 text-xs">ทั้งหมด (150 ล่าสุด)</div>
            <div className="font-bold text-forest">{total}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="text-gray-500 text-xs">ปิด lead ได้</div>
            <div className="font-bold text-forest">{withLead} <span className="text-xs text-gray-400">({conversionRate}%)</span></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 text-xs">
        <FilterPill label="ทั้งหมด" param="service" value="all" current={searchParams.service ?? 'all'} />
        <FilterPill label="STD" param="service" value="std" current={searchParams.service ?? 'all'} />
        <FilterPill label="GLP-1" param="service" value="glp1" current={searchParams.service ?? 'all'} />
        <FilterPill label="CKD" param="service" value="ckd" current={searchParams.service ?? 'all'} />
        <FilterPill label="แรงงาน" param="service" value="foreign" current={searchParams.service ?? 'all'} />
        <FilterPill label="ทั่วไป" param="service" value="general" current={searchParams.service ?? 'all'} />
        <span className="mx-2 text-gray-300">|</span>
        <FilterPill label="ทุกสถานะ" param="has_lead" value="" current={searchParams.has_lead ?? ''} />
        <FilterPill label="ปิดดีลได้" param="has_lead" value="yes" current={searchParams.has_lead ?? ''} />
        <FilterPill label="ยังไม่ได้ลีด" param="has_lead" value="no" current={searchParams.has_lead ?? ''} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">เวลา</th>
              <th className="text-left p-3">บริการ</th>
              <th className="text-left p-3">คำถามแรก</th>
              <th className="text-center p-3">turns</th>
              <th className="text-left p-3">Lead</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(sessions || []).map(s => {
              const lead = s.lead_id ? leadById.get(s.lead_id as string) : null
              const preview = firstUserText(s.messages)
              return (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-gray-500 whitespace-nowrap">{formatDate(s.updated_at as string)}</td>
                  <td className="p-3 whitespace-nowrap">{SERVICE_LABELS[s.service_hint as string] || s.service_hint || '—'}</td>
                  <td className="p-3 text-gray-700 max-w-md truncate">{preview || <span className="text-gray-300">(ไม่มี)</span>}</td>
                  <td className="p-3 text-center text-gray-500">{s.turn_count}</td>
                  <td className="p-3">
                    {lead ? (
                      <span className="text-forest">
                        ✅ {lead.first_name} <span className="text-gray-400 text-xs">{lead.phone}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/chats/${s.id}`} className="text-mint hover:text-forest font-medium">
                      เปิดดู →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {(!sessions || sessions.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">ยังไม่มี chat session</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterPill({
  label,
  param,
  value,
  current,
}: {
  label: string
  param: string
  value: string
  current: string
}) {
  const active = current === value
  // Build href as plain query string — keeps the page a server component
  const qs = value ? `?${param}=${encodeURIComponent(value)}` : '?'
  return (
    <Link
      href={`/admin/chats${qs}`}
      className={`px-3 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-forest text-white border-forest'
          : 'bg-white text-gray-600 border-gray-200 hover:border-forest'
      }`}
    >
      {label}
    </Link>
  )
}
