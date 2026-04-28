import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import LeadStatusSelect from '@/components/admin/LeadStatusSelect'
import LeadChart from '@/components/admin/LeadChart'
import ExportCSV from '@/components/admin/ExportCSV'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { ReadonlyURLSearchParams } from 'next/navigation'

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD & PrEP',
  glp1: '💉 GLP-1',
  ckd: '🫘 CKD',
  foreign: '🧪 แรงงาน',
  general: '💬 ทั่วไป',
  'chat-widget': '💬 Chat',
}

const TIER_LABEL: Record<string, string> = {
  urgent: '🚨 URGENT',
  hot:    '🔥 Hot',
  warm:   '⚡ Warm',
  cold:   '❄️ Cold',
}

const TIER_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  hot:    'bg-orange-100 text-orange-700',
  warm:   'bg-yellow-100 text-yellow-700',
  cold:   'bg-sky-100 text-sky-700',
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export const revalidate = 0

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { service?: string; tier?: string; status?: string; q?: string }
}) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date(new Date().setHours(0,0,0,0)).toISOString()

  const filterService = searchParams.service || 'all'
  const filterTier    = searchParams.tier    || 'all'
  const filterStatus  = searchParams.status  || 'all'
  const filterQ       = searchParams.q       || ''

  // Sales see only their assigned leads (spec §8.2 access control)
  const saleOnly = me.role === 'sale' && me.id ? me.id : null

  let leadsQuery  = supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false }).limit(200)
  let todayQuery  = supabaseAdmin.from('leads').select('id').gte('created_at', today)
  let chartQuery  = supabaseAdmin.from('leads').select('created_at').gte('created_at', thirtyDaysAgo)
  if (saleOnly) {
    leadsQuery = leadsQuery.eq('assigned_to', saleOnly)
    todayQuery = todayQuery.eq('assigned_to', saleOnly)
    chartQuery = chartQuery.eq('assigned_to', saleOnly)
  }
  if (filterService !== 'all') leadsQuery = leadsQuery.eq('service', filterService)
  if (filterTier    !== 'all') leadsQuery = leadsQuery.eq('lead_tier', filterTier)
  if (filterStatus  !== 'all') leadsQuery = leadsQuery.eq('status', filterStatus)

  const [{ data: leads }, { data: posts }, { data: todayLeads }, { data: chartLeads }, { data: vouchers }] = await Promise.all([
    leadsQuery,
    supabaseAdmin.from('posts').select('id,title,slug,service,status,published_at,image_url').order('published_at', { ascending: false }).limit(50),
    todayQuery,
    chartQuery,
    supabaseAdmin.from('vouchers').select('code, lead_id, expires_at, redeemed_at'),
  ])

  const voucherByLead = new Map(
    (vouchers || []).map(v => [v.lead_id as string, v]),
  )

  const totalLeads = leads?.length || 0
  const newLeads = leads?.filter(l => l.status === 'new').length || 0
  const todayCount = todayLeads?.length || 0
  const totalPosts = posts?.length || 0

  // Build 30-day chart data
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
    const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    const isoDate = d.toISOString().slice(0, 10)
    const count = (chartLeads || []).filter(l => l.created_at.slice(0, 10) === isoDate).length
    return { date: dateStr, count }
  })

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Lead ทั้งหมด', value: totalLeads, color: 'text-forest' },
          { label: 'Lead ใหม่', value: newLeads, color: 'text-blue-600' },
          { label: 'วันนี้', value: todayCount, color: 'text-mint' },
          { label: 'บทความ', value: totalPosts, color: 'text-sage' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <LeadChart data={chartData} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Service filter */}
        {[
          { label: 'ทั้งหมด', value: 'all' },
          { label: '🔴 STD', value: 'std' },
          { label: '💉 GLP-1', value: 'glp1' },
          { label: '🫘 CKD', value: 'ckd' },
          { label: '🧪 แรงงาน', value: 'foreign' },
        ].map(f => (
          <a key={f.value}
            href={`/admin?service=${f.value}&tier=${filterTier}&status=${filterStatus}`}
            className={`px-3 py-1.5 rounded-full border font-medium transition-colors ${filterService === f.value ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}
          >{f.label}</a>
        ))}
        <span className="text-gray-300 mx-1">|</span>
        {/* Tier filter */}
        {[
          { label: 'All tier', value: 'all' },
          { label: '🚨 Urgent', value: 'urgent' },
          { label: '🔥 Hot', value: 'hot' },
          { label: '⚡ Warm', value: 'warm' },
          { label: '❄️ Cold', value: 'cold' },
        ].map(f => (
          <a key={f.value}
            href={`/admin?service=${filterService}&tier=${f.value}&status=${filterStatus}`}
            className={`px-3 py-1.5 rounded-full border font-medium transition-colors ${filterTier === f.value ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}
          >{f.label}</a>
        ))}
        <span className="text-gray-300 mx-1">|</span>
        {/* Status filter */}
        {[
          { label: 'All status', value: 'all' },
          { label: 'New', value: 'new' },
          { label: 'Contacted', value: 'contacted' },
          { label: 'Qualified', value: 'qualified' },
          { label: 'Booked', value: 'booked' },
        ].map(f => (
          <a key={f.value}
            href={`/admin?service=${filterService}&tier=${filterTier}&status=${f.value}`}
            className={`px-3 py-1.5 rounded-full border font-medium transition-colors ${filterStatus === f.value ? 'bg-forest text-white border-forest' : 'bg-white text-gray-600 border-gray-200 hover:border-forest'}`}
          >{f.label}</a>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Lead {filterService !== 'all' || filterTier !== 'all' || filterStatus !== 'all' ? '(filtered)' : 'ทั้งหมด'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{totalLeads} รายการ</span>
            {(filterService !== 'all' || filterTier !== 'all' || filterStatus !== 'all') && (
              <a href="/admin" className="text-xs text-red-400 hover:text-red-600 underline">ล้าง filter</a>
            )}
            <ExportCSV />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">ชื่อ</th>
                <th className="text-left px-4 py-3">เบอร์</th>
                <th className="text-left px-4 py-3">บริการ</th>
                <th className="text-left px-4 py-3">Tier</th>
                <th className="text-left px-4 py-3">🤖 AI</th>
                <th className="text-left px-4 py-3">Voucher</th>
                <th className="text-left px-4 py-3">ช่องทาง</th>
                <th className="text-left px-4 py-3">สถานะ</th>
                <th className="text-left px-4 py-3">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(leads || []).map(lead => {
                const voucher = voucherByLead.get(lead.id)
                return (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link href={`/admin/leads/${lead.id}`} className="hover:text-forest hover:underline">
                      {lead.first_name} {lead.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`tel:${lead.phone}`} className="text-forest hover:underline font-mono">{lead.phone}</a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{SERVICE_LABELS[lead.service] || lead.service}</span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.lead_tier ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_COLOR[lead.lead_tier] || 'bg-gray-100 text-gray-600'}`}>
                        {TIER_LABEL[lead.lead_tier] || lead.lead_tier}
                        {typeof lead.lead_score === 'number' ? ` · ${lead.lead_score}` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {typeof lead.ai_score === 'number' ? (
                      <span
                        title={`${lead.ai_score_reason || ''}${lead.ai_score_action ? ' — ' + lead.ai_score_action : ''}`}
                        className={`text-xs px-2 py-0.5 rounded-full font-bold cursor-help ${
                          lead.ai_score >= 80 ? 'bg-red-100 text-red-700'
                          : lead.ai_score >= 60 ? 'bg-orange-100 text-orange-700'
                          : lead.ai_score >= 40 ? 'bg-yellow-100 text-yellow-700'
                          : lead.ai_score >= 20 ? 'bg-sky-100 text-sky-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {lead.ai_score >= 80 ? '🔥' : lead.ai_score >= 60 ? '⚡' : lead.ai_score >= 40 ? '☀️' : lead.ai_score >= 20 ? '🌤' : '❄️'} {lead.ai_score}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {voucher ? (
                      <span className={`font-mono text-xs ${voucher.redeemed_at ? 'text-green-700' : 'text-forest'}`}>
                        {voucher.code}
                        {voucher.redeemed_at && <span className="ml-1">✓</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{lead.source || 'website'}</td>
                  <td className="px-4 py-3">
                    <LeadStatusSelect id={lead.id} initialStatus={lead.status || 'new'} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {lead.created_at ? formatDate(lead.created_at) : ''}
                  </td>
                </tr>
              )})}
              {totalLeads === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">ยังไม่มี Lead</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">บทความ</h2>
          <span className="text-xs text-gray-400">{totalPosts} บทความ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">หัวข้อ</th>
                <th className="text-left px-4 py-3">บริการ</th>
                <th className="text-left px-4 py-3">สถานะ</th>
                <th className="text-left px-4 py-3">วันที่โพสต์</th>
                <th className="text-left px-4 py-3">รูป</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(posts || []).map(post => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a href={`/blog/${post.slug}`} target="_blank" className="text-forest hover:underline font-medium line-clamp-1">
                      {post.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs">{SERVICE_LABELS[post.service] || post.service}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {post.published_at ? formatDate(post.published_at) : ''}
                  </td>
                  <td className="px-4 py-3">
                    {post.image_url ? (
                      <img src={post.image_url} alt="" className="w-12 h-8 object-cover rounded" />
                    ) : <span className="text-gray-300 text-xs">ไม่มีรูป</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
