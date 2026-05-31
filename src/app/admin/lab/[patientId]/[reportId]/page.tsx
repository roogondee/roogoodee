import { getSessionUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { buildTimeline } from '@/lib/lab/compare'
import HealthScoreBadge from '@/components/admin/lab/HealthScoreBadge'
import LabInterpretationCard from '@/components/admin/lab/LabInterpretationCard'
import LabTimelineTable from '@/components/admin/lab/LabTimelineTable'
import LabTimelineChart from '@/components/admin/lab/LabTimelineChart'
import LabUpsellCards from '@/components/admin/lab/LabUpsellCards'
import ConfirmReportButton from '@/components/admin/lab/ConfirmReportButton'
import type { LabReport } from '@/lib/lab/types'

export const revalidate = 0

const FLAG_CLS: Record<string, string> = {
  HH: 'text-red-700 font-bold', LL: 'text-red-700 font-bold',
  H: 'text-amber-600 font-semibold', L: 'text-amber-600 font-semibold',
  A: 'text-amber-600 font-semibold', N: 'text-green-600', unknown: 'text-gray-400',
}

export default async function ReportPage({ params }: { params: { patientId: string; reportId: string } }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const { data: report } = await supabaseAdmin
    .from('lab_reports')
    .select('*')
    .eq('id', params.reportId)
    .maybeSingle()
  if (!report || report.patient_id !== params.patientId) notFound()

  const r = report as LabReport

  // Timeline: prior confirmed reports + this one (so the chart shows current).
  const { data: confirmed } = await supabaseAdmin
    .from('lab_reports')
    .select('id, report_date, analytes')
    .eq('patient_id', params.patientId)
    .eq('status', 'confirmed')

  const rows = (confirmed ?? []) as { id: string; report_date: string; analytes: LabReport['analytes'] }[]
  if (!rows.find((x) => x.id === r.id)) rows.push({ id: r.id, report_date: r.report_date, analytes: r.analytes })
  const timeline = buildTimeline(rows)
  const charts = timeline.analytes.filter((t) => t.points.length >= 2).slice(0, 8)

  const interp = r.interpretation
  const confirmedStatus = r.status === 'confirmed'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/admin/lab/${params.patientId}`} className="text-sm text-gray-400 hover:text-forest">← กลับ</Link>
          <h1 className="font-display text-2xl text-forest mt-1">ผลตรวจ {r.report_date}</h1>
          <p className="text-sm text-gray-500">{r.lab_name}</p>
        </div>
        {r.health_score != null && r.risk_level && <HealthScoreBadge score={r.health_score} risk={r.risk_level} />}
      </div>

      {/* Sign-off / actions */}
      <div className="flex flex-wrap items-center gap-3">
        {!confirmedStatus && <ConfirmReportButton reportId={r.id} defaultName={me.name ?? me.email} />}
        {confirmedStatus && (
          <>
            <span className="text-sm text-green-700">✓ รับรองโดย {r.reviewer_name}{r.reviewer_license ? ` (เลขที่ ${r.reviewer_license})` : ''}</span>
            <a href={`/api/admin/lab/${r.id}/pdf?lang=th`} className="bg-forest text-white px-4 py-2 rounded-xl text-sm hover:bg-sage">⬇ PDF (ไทย)</a>
            <a href={`/api/admin/lab/${r.id}/pdf?lang=en`} className="bg-white border border-forest/20 text-forest px-4 py-2 rounded-xl text-sm hover:bg-gray-50">⬇ PDF (EN)</a>
          </>
        )}
      </div>
      {!confirmedStatus && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ ผลนี้ AI ช่วยร่าง ยังไม่ได้รับการรับรอง — ตรวจสอบความถูกต้องก่อนรับรองและส่งให้ลูกค้า
        </p>
      )}

      {interp && <LabInterpretationCard interp={interp} />}

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
              {r.analytes.map((a, i) => (
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

      {/* Timeline comparison */}
      {timeline.analytes.length > 0 && (
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

      {/* Upsell */}
      {r.upsell && r.upsell.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-forest">แนะนำต่อยอด</h2>
          <LabUpsellCards upsell={r.upsell} />
        </div>
      )}
    </div>
  )
}
