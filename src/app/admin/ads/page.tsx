import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdDraftActions from '@/components/admin/AdDraftActions'

export const revalidate = 0

const SERVICE_LABEL: Record<string, string> = {
  glp1: '💉 GLP-1',
  std:  '🔴 STD',
  ckd:  '🫘 CKD',
}

const STATUS_COLOR: Record<string, string> = {
  draft:    'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  live:     'bg-blue-100 text-blue-700',
  paused:   'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdsAdminPage({
  searchParams,
}: {
  searchParams: { status?: string; service?: string }
}) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const filterStatus  = searchParams.status  || 'draft'
  const filterService = searchParams.service || 'all'

  let query = supabaseAdmin
    .from('ad_drafts')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(200)

  if (filterStatus !== 'all') query = query.eq('status', filterStatus)
  if (filterService !== 'all') query = query.eq('service', filterService)

  const { data: drafts, error } = await query

  const counts = await supabaseAdmin
    .from('ad_drafts')
    .select('status')
    .then(({ data }) => {
      const c: Record<string, number> = {}
      for (const row of data || []) c[row.status] = (c[row.status] || 0) + 1
      return c
    })

  const tabs: Array<{ label: string; value: string; count?: number }> = [
    { label: 'Draft', value: 'draft', count: counts['draft'] },
    { label: 'Approved', value: 'approved', count: counts['approved'] },
    { label: 'Rejected', value: 'rejected', count: counts['rejected'] },
    { label: 'All', value: 'all' },
  ]

  const services = ['all', 'glp1', 'std', 'ckd']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Ad Drafts Review</h1>
        <span className="text-xs text-gray-400">AI-generated · ทีม ads รีวิวก่อน publish</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <a
            key={t.value}
            href={`/admin/ads?status=${t.value}&service=${filterService}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterStatus === t.value
                ? 'bg-forest text-white border-forest'
                : 'bg-white text-gray-600 border-gray-200 hover:border-forest'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 text-xs opacity-70">{t.count}</span>
            )}
          </a>
        ))}
        <span className="text-gray-300 mx-2">|</span>
        {services.map(s => (
          <a
            key={s}
            href={`/admin/ads?status=${filterStatus}&service=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterService === s
                ? 'bg-mint/20 text-forest border-mint'
                : 'bg-white text-gray-500 border-gray-200 hover:border-mint'
            }`}
          >
            {s === 'all' ? 'ทุก service' : SERVICE_LABEL[s] || s}
          </a>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          Error: {error.message}
        </div>
      )}

      {/* Drafts table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3 w-20">Service</th>
                <th className="text-left px-4 py-3 w-24">Angle</th>
                <th className="text-left px-4 py-3">Primary Text</th>
                <th className="text-left px-4 py-3 w-40">Headline</th>
                <th className="text-left px-4 py-3 w-16">Lint</th>
                <th className="text-left px-4 py-3 w-20">Status</th>
                <th className="text-left px-4 py-3 w-36">สร้างเมื่อ</th>
                <th className="text-left px-4 py-3 w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(drafts || []).map(d => (
                <tr key={d.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 text-xs font-semibold">
                    {SERVICE_LABEL[d.service] || d.service}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.angle}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-xs text-gray-800 leading-relaxed line-clamp-3 mb-1">{d.primary_text}</p>
                    {d.description && (
                      <p className="text-xs text-gray-400 line-clamp-1">{d.description}</p>
                    )}
                    {d.image_url && (
                      <img
                        src={d.image_url}
                        alt=""
                        className="mt-2 w-16 h-16 object-cover rounded-lg border border-gray-100"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-800">{d.headline}</p>
                    {d.cta_button && (
                      <span className="text-xs text-mint font-medium">{d.cta_button}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${d.lint_pass ? 'text-green-600' : 'text-red-500'}`}>
                      {d.lint_pass ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[d.status] || 'bg-gray-100 text-gray-600'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {d.generated_at ? formatDate(d.generated_at) : ''}
                    {d.approved_by && (
                      <div className="text-gray-300 mt-0.5">by {d.approved_by.split('@')[0]}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AdDraftActions id={d.id} status={d.status} />
                  </td>
                </tr>
              ))}
              {(drafts || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    ไม่มี ad draft ใน status นี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
