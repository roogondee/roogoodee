import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CERT_TYPE_LABEL, FIT_STATUS_LABEL, type CertType, type FitStatus } from '@/lib/certs/types'

export const revalidate = 0

// Buddhist-era "YYYY-MM" default for the current month, computed server-side.
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// First day of the month after `month` (YYYY-MM) — exclusive upper bound.
function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

interface Row {
  cert_no: string | null; cert_type: CertType; status: string
  visit_date: string; fit_status: FitStatus | null
  patient_snapshot: { name?: string } | null
}

export default async function CertSummaryPage({ searchParams }: { searchParams: { month?: string } }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? '') ? searchParams.month! : currentMonth()
  const start = `${month}-01`
  const end = nextMonthStart(month)

  // Certificates ISSUED within the month (issued_at window).
  const { data } = await supabaseAdmin
    .from('medical_certificates')
    .select('cert_no, cert_type, status, visit_date, fit_status, patient_snapshot, issued_at')
    .gte('issued_at', start)
    .lt('issued_at', end)
    .order('cert_no', { ascending: true })
  const rows = (data ?? []) as unknown as Row[]

  const byType = new Map<CertType, number>()
  const byFit = new Map<string, number>()
  let revokedCount = 0
  for (const r of rows) {
    byType.set(r.cert_type, (byType.get(r.cert_type) ?? 0) + 1)
    const fit = r.fit_status ?? 'unknown'
    byFit.set(fit, (byFit.get(fit) ?? 0) + 1)
    if (r.status === 'revoked') revokedCount++
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/admin/certs" className="text-sm text-gray-400 hover:text-forest">← ทะเบียน</Link>
        <a href={`/api/admin/certs/summary?month=${month}&format=csv`} className="text-sm bg-forest text-white px-4 py-2 rounded-xl hover:bg-sage">ดาวน์โหลด CSV</a>
      </div>

      <header className="bg-white rounded-2xl p-5 border border-gray-100">
        <h1 className="font-display text-2xl text-forest">สรุปการออกใบรับรองรายเดือน</h1>
        <form method="get" className="mt-3 flex items-end gap-2 text-sm">
          <div>
            <label className="text-xs text-gray-400 block mb-1">เดือน</label>
            <input type="month" name="month" defaultValue={month} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-forest text-white px-4 py-2 rounded-lg">ดู</button>
        </form>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="ออกทั้งหมด" value={rows.length} />
        <Stat label="เพิกถอน" value={revokedCount} tone="red" />
        <Stat label="Work Permit" value={byType.get('work_permit') ?? 0} />
        <Stat label="ทั่วไป" value={byType.get('general') ?? 0} />
      </div>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm">
        <h2 className="font-semibold text-forest mb-3">แยกตามประเภท</h2>
        <ul className="divide-y divide-gray-100">
          {Array.from(byType.entries()).map(([t, n]) => (
            <li key={t} className="flex justify-between py-2"><span>{CERT_TYPE_LABEL[t]}</span><span className="font-medium">{n}</span></li>
          ))}
          {byType.size === 0 && <li className="py-2 text-gray-400">ไม่มีข้อมูลในเดือนนี้</li>}
        </ul>
      </section>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm">
        <h2 className="font-semibold text-forest mb-3">แยกตามผลสรุป</h2>
        <ul className="divide-y divide-gray-100">
          {Array.from(byFit.entries()).map(([f, n]) => (
            <li key={f} className="flex justify-between py-2"><span>{f === 'unknown' ? 'ไม่ระบุ' : FIT_STATUS_LABEL[f as FitStatus]}</span><span className="font-medium">{n}</span></li>
          ))}
          {byFit.size === 0 && <li className="py-2 text-gray-400">—</li>}
        </ul>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-3 px-4">เลขที่</th><th className="py-3 px-4">ชื่อ</th>
              <th className="py-3 px-4">ประเภท</th><th className="py-3 px-4">วันตรวจ</th><th className="py-3 px-4">ผล</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2.5 px-4 font-medium text-forest">{r.cert_no ?? '-'}</td>
                <td className="py-2.5 px-4">{r.patient_snapshot?.name ?? '-'}</td>
                <td className="py-2.5 px-4 text-gray-600">{CERT_TYPE_LABEL[r.cert_type]}</td>
                <td className="py-2.5 px-4 text-gray-500">{r.visit_date}</td>
                <td className="py-2.5 px-4">{r.fit_status ? FIT_STATUS_LABEL[r.fit_status] : '-'}{r.status === 'revoked' ? ' (เพิกถอน)' : ''}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">ไม่มีใบรับรองที่ออกในเดือนนี้</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'red' }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-display ${tone === 'red' ? 'text-red-600' : 'text-forest'}`}>{value}</p>
    </div>
  )
}
