import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import type { RiskLevel } from '@/lib/lab/types'

export const revalidate = 0

const RISK_RANK: Record<RiskLevel, number> = { red: 0, yellow: 1, green: 2 }
const RISK_BADGE: Record<RiskLevel, string> = {
  red: 'bg-red-100 text-red-700', yellow: 'bg-amber-100 text-amber-700', green: 'bg-green-100 text-green-700',
}
const RISK_LABEL: Record<RiskLevel, string> = { red: 'ควรพบแพทย์', yellow: 'ควรติดตาม', green: 'ปกติ' }

interface Row {
  id: string
  report_date: string
  health_score: number | null
  risk_level: RiskLevel | null
  patient_id: string
  patients: { name: string; phone: string | null } | null
}

export default async function WatchlistPage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const { data } = await supabaseAdmin
    .from('lab_reports')
    .select('id, report_date, health_score, risk_level, patient_id, patients(name, phone)')
    .eq('status', 'confirmed')
    .order('report_date', { ascending: false })

  // Keep the latest confirmed report per patient, then surface non-green ones.
  const latest = new Map<string, Row>()
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!latest.has(r.patient_id)) latest.set(r.patient_id, r)
  }
  const rows = Array.from(latest.values())
    .filter((r) => r.risk_level && r.risk_level !== 'green')
    .sort((a, b) => RISK_RANK[a.risk_level!] - RISK_RANK[b.risk_level!])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link href="/admin/lab" className="text-sm text-gray-400 hover:text-forest">← กลับ</Link>
        <h1 className="font-display text-2xl text-forest mt-1">⚠️ Watchlist — คนไข้ที่ควรติดตาม</h1>
        <p className="text-sm text-gray-500">ผลล่าสุดที่อยู่ในระดับควรติดตาม/ควรพบแพทย์ — สำหรับทีมขายติดตามเชิงรุก</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">ยังไม่มีคนไข้ในรายการเฝ้าระวัง</p>
        ) : rows.map((r) => (
          <Link key={r.id} href={`/admin/lab/${r.patient_id}/${r.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
            <div>
              <div className="font-medium text-forest">{r.patients?.name ?? '-'}</div>
              <div className="text-xs text-gray-400">{r.patients?.phone} · ตรวจล่าสุด {r.report_date}</div>
            </div>
            <div className="flex items-center gap-3">
              {r.health_score != null && <span className="text-sm font-semibold text-forest">{r.health_score}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_BADGE[r.risk_level!]}`}>{RISK_LABEL[r.risk_level!]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
