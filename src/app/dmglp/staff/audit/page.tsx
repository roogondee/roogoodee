import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp } from '@/lib/dmglp/roles'
import { Card, PageHeader, Table, dateTimeTh, one, td } from '../ui'

export const dynamic = 'force-dynamic'

export default async function AuditPage({ searchParams }: { searchParams: { table?: string; page?: string } }) {
  await requireDmglp('audit.read')
  const page = Math.max(0, Number(searchParams.page) || 0)
  let q = supabaseAdmin
    .from('dmglp_audit_log').select('id, staff_id, staff_role, action, table_name, record_id, details, at, staff:admin_users(email)')
    .order('at', { ascending: false }).range(page * 100, page * 100 + 99)
  if (searchParams.table) q = q.eq('table_name', searchParams.table.slice(0, 60))
  const { data } = await q
  return (
    <>
      <PageHeader title="Audit log" subtitle="ทุกการอ่าน/เขียนข้อมูลทางคลินิก" actions={<><a href={`?page=${Math.max(0, page - 1)}`} className="text-sm text-forest underline">← ใหม่กว่า</a><a href={`?page=${page + 1}`} className="text-sm text-forest underline">เก่ากว่า →</a></>} />
      <Card>
        <Table head={['เวลา', 'ผู้ใช้', 'บทบาท', 'การกระทำ', 'ตาราง', 'record', 'รายละเอียด']} empty={(data ?? []).length === 0}>
          {(data ?? []).map(r => (
            <tr key={r.id}>
              <td className={`${td} text-xs`}>{dateTimeTh(r.at)}</td>
              <td className={`${td} text-xs`}>{(one(r.staff) as { email: string } | null)?.email || r.staff_id?.slice(0, 8) || '—'}</td>
              <td className={td}>{r.staff_role}</td>
              <td className={td}>{r.action}</td>
              <td className={`${td} text-xs`}><a href={`?table=${r.table_name}`} className="underline">{r.table_name}</a></td>
              <td className={`${td} text-xs font-mono`}>{r.record_id?.slice(0, 8)}</td>
              <td className={`${td} text-xs text-gray-500`}>{r.details ? JSON.stringify(r.details).slice(0, 120) : ''}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
