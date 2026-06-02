import { getSessionUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import LabUploader from '@/components/admin/lab/LabUploader'
import ClaimCodeButton from '@/components/admin/lab/ClaimCodeButton'
import type { LabReport, RiskLevel } from '@/lib/lab/types'

export const revalidate = 0

const RISK_DOT: Record<RiskLevel, string> = { green: 'bg-green-500', yellow: 'bg-amber-500', red: 'bg-red-500' }

export default async function PatientPage({ params }: { params: { patientId: string } }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id, name, phone, gender, dob, line_id')
    .eq('id', params.patientId)
    .maybeSingle()
  if (!patient) notFound()

  const { data: reports } = await supabaseAdmin
    .from('lab_reports')
    .select('id, report_date, status, health_score, risk_level, analytes')
    .eq('patient_id', params.patientId)
    .order('report_date', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/admin/lab" className="text-sm text-gray-400 hover:text-forest">← กลับ</Link>
        <h1 className="font-display text-2xl text-forest mt-1">{patient.name}</h1>
        <p className="text-sm text-gray-500">{patient.phone}</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <ClaimCodeButton patientId={patient.id} linked={!!patient.line_id} />
      </div>

      <LabUploader patientId={patient.id} />

      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-forest mb-3">ประวัติผลตรวจ</h2>
        {(!reports || reports.length === 0) ? (
          <p className="text-sm text-gray-400">ยังไม่มีผลตรวจ — อัปโหลดด้านบนเพื่อเริ่ม</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(reports as Pick<LabReport, 'id' | 'report_date' | 'status' | 'health_score' | 'risk_level' | 'analytes'>[]).map((r) => {
              const abnormal = (r.analytes ?? []).filter((a) => a.flag !== 'N' && a.flag !== 'unknown').length
              return (
                <li key={r.id}>
                  <Link href={`/admin/lab/${patient.id}/${r.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded">
                    <div className="flex items-center gap-3">
                      {r.risk_level && <span className={`w-2.5 h-2.5 rounded-full ${RISK_DOT[r.risk_level]}`} />}
                      <div>
                        <div className="font-medium text-forest">{r.report_date}</div>
                        <div className="text-xs text-gray-400">{r.analytes?.length ?? 0} รายการ · {abnormal} ผิดปกติ</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.health_score != null && <span className="text-sm font-semibold text-forest">{r.health_score}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status === 'confirmed' ? 'รับรองแล้ว' : 'รอตรวจสอบ'}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
