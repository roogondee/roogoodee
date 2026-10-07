import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { handleAlert } from '../actions'
import { Badge, Card, Flash, PageHeader, PatientLink, Table, btnSmall, btnSmallSecondary, dateTimeTh, one, td } from '../ui'

export const dynamic = 'force-dynamic'

export default async function AlertsPage({ searchParams }: { searchParams: { ok?: string; err?: string; all?: string } }) {
  const me = await requireDmglp('alerts.read')
  let q = supabaseAdmin
    .from('dmglp_alerts')
    .select('id, source, severity, message, status, created_at, handled_at, patient:dmglp_patients(id, first_name, last_name, hn, phone)')
    .order('severity').order('created_at', { ascending: false }).limit(200)
  if (!searchParams.all) q = q.neq('status', 'resolved')
  const { data } = await q
  const rows = data ?? []
  return (
    <>
      <PageHeader title="แจ้งเตือน" subtitle="อาการเตือนจากแบบสอบถาม, ตู้เย็นนอกช่วง, สต็อกไม่ตรง, คุณสมบัติ, การปรับยา"
        actions={<a href={searchParams.all ? '?' : '?all=1'} className={btnSmallSecondary}>{searchParams.all ? 'เฉพาะที่ยังเปิด' : 'ดูทั้งหมด'}</a>} />
      <Flash searchParams={searchParams} />
      <Card>
        <Table head={['ระดับ', 'ที่มา', 'ผู้ป่วย', 'ข้อความ', 'เวลา', 'สถานะ', '']} empty={rows.length === 0}>
          {rows.map(a => {
            const p = one(a.patient) as { id: string; first_name: string; last_name: string; hn: string | null; phone: string | null } | null
            return (
              <tr key={a.id} className={a.severity === 'high' && a.status === 'open' ? 'bg-red-50/60' : ''}>
                <td className={td}><Badge value={a.severity} /></td>
                <td className={td}>{a.source}</td>
                <td className={td}><PatientLink p={p} />{p?.phone && <div className="text-xs text-gray-500">{p.phone}</div>}</td>
                <td className={`${td} max-w-md`}>{a.message}</td>
                <td className={`${td} text-xs text-gray-500`}>{dateTimeTh(a.created_at)}</td>
                <td className={td}><Badge value={a.status} /></td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  {a.status !== 'resolved' && can(me.role, 'alerts.write') && (
                    <form action={handleAlert} className="flex gap-1 justify-end">
                      <input type="hidden" name="id" value={a.id} />
                      {a.status === 'open' && <button name="status" value="acknowledged" className={btnSmallSecondary}>รับทราบ</button>}
                      <button name="status" value="resolved" className={btnSmall}>ปิด</button>
                    </form>
                  )}
                </td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}
