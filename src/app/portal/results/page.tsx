import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getPatientSession } from '@/lib/patient-auth'
import { buildTimeline } from '@/lib/lab/compare'
import HealthScoreBadge from '@/components/admin/lab/HealthScoreBadge'
import LabInterpretationCard from '@/components/admin/lab/LabInterpretationCard'
import LabTimelineTable from '@/components/admin/lab/LabTimelineTable'
import LabTimelineChart from '@/components/admin/lab/LabTimelineChart'
import type { LabReport } from '@/lib/lab/types'

export const revalidate = 0
export const metadata = { title: 'ผลตรวจของคุณ — รู้ก่อนดี' }

const FLAG_CLS: Record<string, string> = {
  HH: 'text-red-700 font-bold', LL: 'text-red-700 font-bold',
  H: 'text-amber-600 font-semibold', L: 'text-amber-600 font-semibold',
  A: 'text-amber-600 font-semibold', N: 'text-green-600', unknown: 'text-gray-400',
}

export default async function PortalResultsPage() {
  const session = await getPatientSession()
  if (!session) redirect('/portal')

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id, name')
    .eq('id', session.patientId)
    .maybeSingle()
  if (!patient) redirect('/portal')

  // Patients only ever see CONFIRMED reports (no AI drafts, no pending review).
  const { data: reportsRaw } = await supabaseAdmin
    .from('lab_reports')
    .select('*')
    .eq('patient_id', session.patientId)
    .eq('status', 'confirmed')
    .order('report_date', { ascending: false })

  const reports = (reportsRaw ?? []) as LabReport[]
  const latest = reports[0]

  // Timeline across all confirmed reports.
  const timeline = buildTimeline(
    reports.map((r) => ({ id: r.id, report_date: r.report_date, analytes: r.analytes }))
  )
  const charts = timeline.analytes.filter((t) => t.points.length >= 2).slice(0, 8)

  return (
    <main className="min-h-screen bg-cream">
      <header className="bg-forest text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-display text-lg">ผลตรวจสุขภาพของคุณ</div>
          <div className="text-xs text-white/60">{patient.name}</div>
        </div>
        <a href="/api/portal/logout" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">ออกจากระบบ</a>
      </header>

      <div className="max-w-4xl mx-auto p-5 space-y-6">
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-500">ยังไม่มีผลตรวจที่รับรองแล้วในระบบ</p>
            <p className="text-sm text-gray-400 mt-1">เมื่อผลตรวจของคุณพร้อม จะแสดงที่นี่</p>
          </div>
        ) : (
          <>
            {/* Latest report */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-2xl text-forest">ผลล่าสุด {latest.report_date}</h1>
                <p className="text-sm text-gray-500">{latest.lab_name}</p>
              </div>
              {latest.health_score != null && latest.risk_level && (
                <HealthScoreBadge score={latest.health_score} risk={latest.risk_level} />
              )}
            </div>

            {latest.interpretation && <LabInterpretationCard interp={latest.interpretation} />}

            {/* Analytes */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h2 className="font-semibold text-forest mb-3">รายการตรวจ</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3">รายการ</th><th className="py-2 pr-3">ผล</th>
                      <th className="py-2 pr-3">ค่าอ้างอิง</th><th className="py-2">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.analytes.map((a, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 pr-3 font-medium text-forest">{a.test_name}</td>
                        <td className="py-2 pr-3">{a.value}{a.unit ? ` ${a.unit}` : ''}</td>
                        <td className="py-2 pr-3 text-gray-500">{a.reference_range ?? (a.ref_low != null || a.ref_high != null ? `${a.ref_low ?? ''}-${a.ref_high ?? ''}` : '-')}</td>
                        <td className={`py-2 ${FLAG_CLS[a.flag] ?? ''}`}>{a.flag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trends */}
            {timeline.analytes.length > 0 && reports.length >= 2 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-5">
                <h2 className="font-semibold text-forest">แนวโน้มเทียบรายปี</h2>
                <LabTimelineTable analytes={timeline.analytes} />
                {charts.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {charts.map((t) => (
                      <div key={t.canonical} className="border border-gray-100 rounded-xl p-3">
                        <div className="text-sm font-medium text-forest mb-1">{t.test_name}{t.unit ? ` (${t.unit})` : ''}</div>
                        <LabTimelineChart t={t} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Past reports list */}
            {reports.length > 1 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-forest mb-3">ผลตรวจย้อนหลัง</h2>
                <ul className="divide-y divide-gray-100">
                  {reports.slice(1).map((r) => (
                    <li key={r.id} className="py-2.5 flex items-center justify-between text-sm">
                      <span className="text-forest">{r.report_date}</span>
                      <span className="text-gray-400">{r.lab_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              ผลตรวจนี้แสดงเฉพาะรายงานที่แพทย์รับรองแล้ว · หากมีข้อสงสัยกรุณาปรึกษาแพทย์
            </p>
          </>
        )}
      </div>
    </main>
  )
}
