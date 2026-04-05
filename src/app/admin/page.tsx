import { supabaseAdmin } from '@/lib/supabase'
import LeadStatusSelect from '@/components/admin/LeadStatusSelect'

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD & PrEP',
  glp1: '💉 GLP-1',
  ckd: '🫘 CKD',
  foreign: '🧪 แรงงาน',
  general: '💬 ทั่วไป',
  'chat-widget': '💬 Chat',
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export const revalidate = 30

export default async function AdminPage() {
  const [{ data: leads }, { data: posts }, { data: todayLeads }] = await Promise.all([
    supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('posts').select('id,title,slug,service,status,published_at,image_url').order('published_at', { ascending: false }).limit(50),
    supabaseAdmin.from('leads').select('id').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
  ])

  const totalLeads = leads?.length || 0
  const newLeads = leads?.filter(l => l.status === 'new').length || 0
  const todayCount = todayLeads?.length || 0
  const totalPosts = posts?.length || 0

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

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Lead ทั้งหมด</h2>
          <span className="text-xs text-gray-400">{totalLeads} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">ชื่อ</th>
                <th className="text-left px-4 py-3">เบอร์</th>
                <th className="text-left px-4 py-3">บริการ</th>
                <th className="text-left px-4 py-3">ช่องทาง</th>
                <th className="text-left px-4 py-3">สถานะ</th>
                <th className="text-left px-4 py-3">วันที่</th>
                <th className="text-left px-4 py-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(leads || []).map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`tel:${lead.phone}`} className="text-forest hover:underline font-mono">{lead.phone}</a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{SERVICE_LABELS[lead.service] || lead.service}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{lead.source || 'website'}</td>
                  <td className="px-4 py-3">
                    <LeadStatusSelect id={lead.id} initialStatus={lead.status || 'new'} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {lead.created_at ? formatDate(lead.created_at) : ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{lead.note}</td>
                </tr>
              ))}
              {totalLeads === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">ยังไม่มี Lead</td></tr>
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
