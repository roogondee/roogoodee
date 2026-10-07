import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { EMPLOYER_ALERT_AHEAD_DAYS, EMPLOYER_RECHECK_DAYS } from '@/lib/growth/config'
import { dueWorkers, fetchEmployerCertificates, workersFromCerts, type EmployerAccount } from '@/lib/growth/employer'
import EmployerAdmin from './EmployerAdmin'

export const dynamic = 'force-dynamic'

// HR portal accounts: one per client company, matched to issued certificates
// by the employer name staff typed at issue (patient_snapshot.employer_name).
// The daily post-visit cron alerts the sales group when a company has workers
// due for their annual checkup.

export default async function EmployersPage() {
  const me = await getSessionUser()
  const { data: accounts, error } = await supabaseAdmin
    .from('employer_accounts')
    .select('id, name, match_names, contact_name, contact_phone, active, last_viewed_at, renewal_notified_at, created_at')
    .order('created_at', { ascending: false })

  // Employer names already on issued certificates, to pick from.
  const { data: certNames } = await supabaseAdmin
    .from('medical_certificates')
    .select('employer:patient_snapshot->>employer_name')
    .eq('status', 'issued')
    .limit(5000)
  const knownNames = Array.from(new Set(
    ((certNames as { employer: string | null }[] | null) ?? []).map(r => (r.employer || '').trim()).filter(Boolean),
  )).sort()

  const now = Date.now()
  const rows = await Promise.all(((accounts as EmployerAccount[] | null) ?? []).map(async a => {
    const certs = await fetchEmployerCertificates(a.match_names).catch(() => [])
    return {
      ...a,
      workers: workersFromCerts(certs, now, EMPLOYER_RECHECK_DAYS).length,
      due: dueWorkers(certs, now, EMPLOYER_RECHECK_DAYS, EMPLOYER_ALERT_AHEAD_DAYS).length,
    }
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display text-forest">พอร์ทัล HR โรงงาน</h1>
        <p className="text-sm text-gray-500 mt-1">
          ให้ HR ของลูกค้าดูสถานะใบรับรองแพทย์ของแรงงาน + วันครบรอบตรวจประจำปี ผ่านลิงก์ส่วนตัว (ไม่ต้องมีรหัสผ่าน)
        </p>
      </div>
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          ยังไม่ได้รัน migration <code>create_growth_loops.sql</code> ({error.message})
        </div>
      )}
      <EmployerAdmin rows={rows} knownNames={knownNames} canManage={me?.role === 'manager'} />
    </div>
  )
}
