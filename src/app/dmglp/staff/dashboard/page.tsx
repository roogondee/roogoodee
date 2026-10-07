import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { todayBkk, addDays } from '@/lib/dmglp/dates'
import { Card, PageHeader, Stat, Table, td } from '../ui'

export const dynamic = 'force-dynamic'

// Dashboard v1 (§6.1.7) + outcome view (§6.3): aggregated only, so every
// role with dashboard.read (incl. marketing) can see it without touching
// identifiable clinical rows.
export default async function DashboardPage() {
  const me = await requireDmglp('dashboard.read')
  const today = todayBkk()
  const weekAgo = addDays(today, -7)
  const [active, newWeek, missed, dispenses, enrollments, hba1c, weights, leadsWeek] = await Promise.all([
    supabaseAdmin.from('dmglp_enrollments').select('id', { count: 'exact', head: true }).in('phase', ['initiation', 'maintenance', 'maintenance_program']),
    supabaseAdmin.from('dmglp_patients').select('id', { count: 'exact', head: true }).gte('created_at', `${weekAgo}T00:00:00+07:00`),
    supabaseAdmin.from('dmglp_appointments').select('id', { count: 'exact', head: true }).eq('status', 'missed'),
    supabaseAdmin.from('dmglp_dispenses').select('patient_id'),
    supabaseAdmin.from('dmglp_enrollments').select('id, patient_id, start_date, phase, drug'),
    supabaseAdmin.from('dmglp_labs').select('patient_id, value, collected_at').eq('test_code', 'HBA1C').order('collected_at'),
    supabaseAdmin.from('dmglp_visits').select('patient_id, weight_kg, visit_date').not('weight_kg', 'is', null).order('visit_date'),
    supabaseAdmin.from('dmglp_leads').select('id', { count: 'exact', head: true }).gte('created_at', `${weekAgo}T00:00:00+07:00`),
  ])

  // Retention = patients with > 2 pens dispensed.
  const pensBy: Record<string, number> = {}
  for (const d of dispenses.data ?? []) pensBy[d.patient_id] = (pensBy[d.patient_id] || 0) + 1
  const dispensedPatients = Object.keys(pensBy).length
  const retained = Object.values(pensBy).filter(n => n > 2).length

  // Outcomes: change from first to latest value, by patients with ≥ 2 points,
  // bucketed by months since enrollment start (3 / 6).
  const outcome = (rows: Array<{ patient_id: string; value: number | null; at: string }>) => {
    const by: Record<string, Array<{ value: number; at: string }>> = {}
    for (const r of rows) { if (r.value == null) continue; (by[r.patient_id] ??= []).push({ value: Number(r.value), at: r.at }) }
    const changes3: number[] = [], changes6: number[] = []
    for (const [pid, pts] of Object.entries(by)) {
      if (pts.length < 2) continue
      const enr = (enrollments.data ?? []).find(e => e.patient_id === pid)
      const first = pts[0]
      for (const p of pts.slice(1)) {
        const months = enr ? Math.round((Date.parse(p.at) - Date.parse(enr.start_date)) / (30.4 * 86_400_000)) : 0
        const delta = p.value - first.value
        const pct = first.value ? (delta / first.value) * 100 : 0
        if (months >= 2 && months <= 4) changes3.push(delta), changes3.push(pct)
        if (months >= 5 && months <= 7) changes6.push(delta), changes6.push(pct)
      }
    }
    const mean = (a: number[], i: 0 | 1) => { const v = a.filter((_, k) => k % 2 === i); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }
    return { n3: changes3.length / 2, abs3: mean(changes3, 0), pct3: mean(changes3, 1), n6: changes6.length / 2, abs6: mean(changes6, 0), pct6: mean(changes6, 1) }
  }
  const a1c = outcome((hba1c.data ?? []).map(l => ({ patient_id: l.patient_id, value: l.value, at: l.collected_at })))
  const wt = outcome((weights.data ?? []).map(v => ({ patient_id: v.patient_id, value: v.weight_kg, at: v.visit_date })))
  const fmt = (n: number | null, d = 1, suffix = '') => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(d)}${suffix}`

  return (
    <>
      <PageHeader title="Dashboard" subtitle="ตัวเลขรวม ไม่มีข้อมูลรายบุคคล" />
      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <Stat label="ผู้ป่วยในโปรแกรม" value={active.count ?? 0} />
        <Stat label="ผู้ป่วยใหม่ 7 วัน" value={newWeek.count ?? 0} hint={`leads ใหม่ ${leadsWeek.count ?? 0}`} />
        <Stat label="เริ่มยาแล้ว" value={dispensedPatients} />
        <Stat label="Retention (> 2 ปากกา)" value={dispensedPatients ? `${Math.round((retained / dispensedPatients) * 100)}%` : '—'} hint={`${retained} คน`} />
        <Stat label="นัดที่พลาด (ค้าง)" value={missed.count ?? 0} />
        <Stat label="หยุดยา" value={(enrollments.data ?? []).filter(e => e.phase === 'stopped').length} />
      </div>
      {can(me.role, 'clinical.read') || me.role === 'manager' || me.role === 'marketing' ? (
        <Card title="ผลลัพธ์ (ค่าเฉลี่ยการเปลี่ยนแปลงจากค่าแรก)">
          <Table head={['ตัวชี้วัด', 'ที่ 3 เดือน (n)', 'เปลี่ยนแปลง', 'ที่ 6 เดือน (n)', 'เปลี่ยนแปลง']}>
            <tr><td className={td}>HbA1c (%)</td><td className={td}>{a1c.n3}</td><td className={`${td} font-semibold`}>{fmt(a1c.abs3, 2)}</td><td className={td}>{a1c.n6}</td><td className={`${td} font-semibold`}>{fmt(a1c.abs6, 2)}</td></tr>
            <tr><td className={td}>น้ำหนัก (%)</td><td className={td}>{wt.n3}</td><td className={`${td} font-semibold`}>{fmt(wt.pct3, 1, '%')}</td><td className={td}>{wt.n6}</td><td className={`${td} font-semibold`}>{fmt(wt.pct6, 1, '%')}</td></tr>
          </Table>
          <p className="text-xs text-gray-400 mt-2">นับเฉพาะผู้ป่วยที่มีค่าอย่างน้อย 2 ครั้ง · 3 เดือน = 2–4 เดือนหลังเริ่ม, 6 เดือน = 5–7 เดือน</p>
        </Card>
      ) : null}
    </>
  )
}
