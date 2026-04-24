import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD', glp1: '💉 GLP-1', ckd: '🫘 CKD', foreign: '🧪 แรงงาน',
}

const TIER_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  hot:    'bg-orange-100 text-orange-700',
  warm:   'bg-yellow-100 text-yellow-700',
  cold:   'bg-sky-100 text-sky-700',
}

interface Lead {
  id: string
  service: string | null
  status: string | null
  lead_tier: string | null
  utm_source: string | null
  created_at: string
}

interface Voucher {
  id: string
  service: string
  redeemed_at: string | null
  expires_at: string
}

function pct(n: number, d: number): string {
  if (!d) return '—'
  return `${((n / d) * 100).toFixed(1)}%`
}

export default async function AnalyticsPage() {
  const [{ data: allLeads }, { data: allVouchers }, { data: last30Leads }] = await Promise.all([
    supabaseAdmin.from('leads').select('id, service, status, lead_tier, utm_source, created_at').order('created_at', { ascending: false }).limit(2000),
    supabaseAdmin.from('vouchers').select('id, service, redeemed_at, expires_at').limit(2000),
    supabaseAdmin.from('leads').select('id, service, status, lead_tier, utm_source, created_at').gte('created_at', daysAgo(30)).limit(2000),
  ])

  const leads: Lead[] = (allLeads as Lead[] | null) || []
  const vouchers: Voucher[] = (allVouchers as Voucher[] | null) || []
  const last30: Lead[] = (last30Leads as Lead[] | null) || []

  // Funnel (spec §6.1 pipeline)
  const funnel = {
    total:     leads.length,
    contacted: leads.filter(l => ['contacted','qualified','booked','visited','customer'].includes(l.status || '')).length,
    booked:    leads.filter(l => ['booked','visited','customer'].includes(l.status || '')).length,
    visited:   leads.filter(l => ['visited','customer'].includes(l.status || '')).length,
    customer:  leads.filter(l => l.status === 'customer').length,
    lost:      leads.filter(l => l.status === 'lost').length,
  }

  // Voucher redemption (spec §7.1)
  const voucherTotal    = vouchers.length
  const voucherRedeemed = vouchers.filter(v => !!v.redeemed_at).length
  const voucherExpired  = vouchers.filter(v => !v.redeemed_at && new Date(v.expires_at).getTime() < Date.now()).length
  const voucherActive   = voucherTotal - voucherRedeemed - voucherExpired

  // By service
  const byService: Record<string, { leads: number; vouchers: number; redeemed: number; customer: number }> = {}
  for (const svc of ['glp1', 'ckd', 'std', 'foreign']) {
    byService[svc] = {
      leads:     leads.filter(l => l.service === svc).length,
      vouchers:  vouchers.filter(v => v.service === svc).length,
      redeemed:  vouchers.filter(v => v.service === svc && !!v.redeemed_at).length,
      customer:  leads.filter(l => l.service === svc && l.status === 'customer').length,
    }
  }

  // Tier distribution (last 30d)
  const tierCounts = { urgent: 0, hot: 0, warm: 0, cold: 0 } as Record<string, number>
  for (const l of last30) {
    if (l.lead_tier && l.lead_tier in tierCounts) tierCounts[l.lead_tier]++
  }

  // UTM source (last 30d)
  const utmCounts: Record<string, number> = {}
  for (const l of last30) {
    const src = l.utm_source || 'direct'
    utmCounts[src] = (utmCounts[src] || 0) + 1
  }
  const utmSorted = Object.entries(utmCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl text-forest mb-1">📊 Analytics</h1>
        <p className="text-sm text-gray-500">KPI ตาม spec §7.1 — คำนวณจากข้อมูลสดในระบบ</p>
      </div>

      {/* Funnel */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Lead Funnel (ทั้งหมด)</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Lead',       n: funnel.total,     conv: '100%' },
            { label: 'Contacted',  n: funnel.contacted, conv: pct(funnel.contacted, funnel.total) },
            { label: 'Booked',     n: funnel.booked,    conv: pct(funnel.booked, funnel.total) },
            { label: 'Visited',    n: funnel.visited,   conv: pct(funnel.visited, funnel.total) },
            { label: 'Customer',   n: funnel.customer,  conv: pct(funnel.customer, funnel.total) },
            { label: 'Lost',       n: funnel.lost,      conv: pct(funnel.lost, funnel.total) },
          ].map(f => (
            <div key={f.label} className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">{f.label}</p>
              <p className="text-2xl font-bold text-forest">{f.n}</p>
              <p className="text-xs text-gray-400">{f.conv}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Lead → Visit = {pct(funnel.visited, funnel.total)} (เป้า ≥ 30%) • Visit → Customer = {pct(funnel.customer, Math.max(funnel.visited, 1))} (เป้า ≥ 40%) • Overall = {pct(funnel.customer, funnel.total)} (เป้า 5-8%)</p>
      </section>

      {/* Vouchers */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Voucher Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="ออกทั้งหมด" value={voucherTotal} color="text-forest" />
          <Stat label="ใช้แล้ว" value={voucherRedeemed} sub={pct(voucherRedeemed, voucherTotal)} color="text-green-700" />
          <Stat label="พร้อมใช้" value={voucherActive} color="text-blue-700" />
          <Stat label="หมดอายุ" value={voucherExpired} sub={pct(voucherExpired, voucherTotal)} color="text-red-700" />
        </div>
        <p className="text-xs text-gray-400 mt-2">Voucher Redemption = {pct(voucherRedeemed, voucherTotal)} (เป้า ≥ 30%)</p>
      </section>

      {/* By service */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">แยกตาม Service</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">Service</th>
                <th className="text-right px-4 py-3">Leads</th>
                <th className="text-right px-4 py-3">Vouchers</th>
                <th className="text-right px-4 py-3">Redeemed</th>
                <th className="text-right px-4 py-3">Customers</th>
                <th className="text-right px-4 py-3">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(byService).map(([svc, s]) => (
                <tr key={svc}>
                  <td className="px-4 py-3">{SERVICE_LABELS[svc] || svc}</td>
                  <td className="px-4 py-3 text-right">{s.leads}</td>
                  <td className="px-4 py-3 text-right">{s.vouchers}</td>
                  <td className="px-4 py-3 text-right text-green-700">{s.redeemed} <span className="text-xs text-gray-400">({pct(s.redeemed, s.vouchers)})</span></td>
                  <td className="px-4 py-3 text-right font-semibold">{s.customer}</td>
                  <td className="px-4 py-3 text-right">{pct(s.customer, s.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tier distribution */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Lead Tier (30 วันล่าสุด)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['urgent', 'hot', 'warm', 'cold'] as const).map(t => (
            <div key={t} className="bg-white rounded-xl p-4 border border-gray-100">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_COLOR[t]}`}>{t.toUpperCase()}</span>
              <p className="text-2xl font-bold text-forest mt-2">{tierCounts[t]}</p>
              <p className="text-xs text-gray-400">{pct(tierCounts[t], last30.length)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* UTM breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Traffic Source (30 วันล่าสุด)</h2>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          {utmSorted.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {utmSorted.map(([src, n]) => (
                <div key={src} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-gray-600 truncate">{src}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-forest" style={{ width: `${(n / last30.length) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-semibold">{n}</span>
                  <span className="w-14 text-right text-xs text-gray-400">{pct(n, last30.length)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
