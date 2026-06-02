import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import PatientSearch from '@/components/admin/lab/PatientSearch'

export const revalidate = 0

export default async function LabHomePage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  // Pending reports patients submitted themselves via /lab/upload — staff must
  // verify and confirm these before the patient can see the result.
  const { data: pending } = await supabaseAdmin
    .from('lab_reports')
    .select('id, patient_id, report_date, risk_level, created_at, patients(name, phone)')
    .eq('submitted_by_patient', true)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(20)

  const rows = (pending ?? []) as unknown as {
    id: string; patient_id: string; report_date: string; risk_level: string | null
    created_at: string; patients: { name: string; phone: string | null } | null
  }[]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl text-forest">🧪 แปลผลแลป & เปรียบเทียบรายปี</h1>
        <a href="/admin/lab/watchlist" className="text-sm text-sage hover:text-forest">⚠️ Watchlist →</a>
      </div>

      {rows.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h2 className="font-semibold text-amber-800 mb-2">
            📥 ผลที่คนไข้ส่งมา — รอตรวจสอบ ({rows.length})
          </h2>
          <ul className="divide-y divide-amber-100">
            {rows.map((r) => (
              <li key={r.id}>
                <a
                  href={`/admin/lab/${r.patient_id}/${r.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:text-forest"
                >
                  <span className="font-medium text-forest">
                    {r.patients?.name ?? 'ไม่ระบุชื่อ'}
                    {r.patients?.phone ? <span className="text-gray-400 font-normal"> · {r.patients.phone}</span> : null}
                  </span>
                  <span className="text-gray-400">{r.report_date}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PatientSearch />
    </div>
  )
}
