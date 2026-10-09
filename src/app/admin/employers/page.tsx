import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { EMPLOYER_ALERT_AHEAD_DAYS, EMPLOYER_RECHECK_DAYS } from '@/lib/growth/config'
import { EMPLOYER_COLUMNS, dueWorkers, fetchEmployerCertificates, workersFromCerts, type EmployerAccount } from '@/lib/growth/employer'
import { fetchWmedicalEmployerNames, wmedicalBridgeConfigured } from '@/lib/certs/wmedical'
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
    .select(EMPLOYER_COLUMNS)
    .order('created_at', { ascending: false })

  // Employer names already on issued certificates, to pick from — both the
  // roogondee-side table and cert.roogondee.com, where W Medical actually
  // issues (bridge unset/down → just the local ones).
  const [{ data: certNames }, wmNames] = await Promise.all([
    supabaseAdmin
      .from('medical_certificates')
      .select('employer:patient_snapshot->>employer_name')
      .eq('status', 'issued')
      .limit(5000),
    fetchWmedicalEmployerNames().catch(err => {
      console.error('[admin/employers] bridge failed:', err instanceof Error ? err.message : err)
      return []
    }),
  ])
  const knownNames = Array.from(new Set([
    ...((certNames as { employer: string | null }[] | null) ?? []).map(r => (r.employer || '').trim()),
    ...wmNames.map(r => (r.employer_name || '').trim()),
  ].filter(Boolean))).sort()
  const bridgeOn = wmedicalBridgeConfigured()

  const now = Date.now()
  const rows = await Promise.all(((accounts as EmployerAccount[] | null) ?? []).map(async a => {
    const certs = await fetchEmployerCertificates(a.match_names).catch(() => [])
    // The HR's LINE id and link code stay server-side; the table only needs
    // to know whether alerts are on.
    const { line_user_id, line_link_code: _code, line_linked_at: _at, ...rest } = a
    return {
      ...rest,
      line_linked: !!line_user_id,
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
          ยังไม่ได้รัน migration <code>create_growth_loops.sql</code> / <code>create_site_ref_codes.sql</code> ({error.message})
        </div>
      )}
      {!bridgeOn && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          ยังไม่ได้เชื่อมกับ cert.roogondee.com — ตั้งค่า <code>WMEDICAL_BRIDGE_SECRET</code> ใน Vercel
          แล้ว redeploy จึงจะเห็นใบรับรองที่ออกจากระบบนั้น (ดู <code>docs/hr-portal.md</code>)
        </div>
      )}
      <EmployerAdmin rows={rows} knownNames={knownNames} canManage={me?.role === 'manager'} />
    </div>
  )
}
