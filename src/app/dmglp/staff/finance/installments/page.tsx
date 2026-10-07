import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { todayBkk } from '@/lib/dmglp/dates'
import { payInstallment } from '../../actions'
import { Badge, Card, Flash, PageHeader, PatientLink, Table, baht, btnSmall, dateTh, one, td } from '../../ui'

export const dynamic = 'force-dynamic'

export default async function InstallmentsPage({ searchParams }: { searchParams: { ok?: string; err?: string; all?: string } }) {
  const me = await requireDmglp('finance.read')
  const today = todayBkk()
  let q = supabaseAdmin
    .from('dmglp_installments')
    .select('id, seq, amount, due_date, status, paid_at, program:dmglp_programs(id, tier, status, patient:dmglp_patients(id, first_name, last_name, hn, phone))')
    .order('due_date').limit(300)
  if (!searchParams.all) q = q.in('status', ['due', 'overdue'])
  const { data } = await q
  const rows = data ?? []
  return (
    <>
      <PageHeader title="งวดชำระ" subtitle="ผ่อน 0% × 6 — งวดที่เลยกำหนดแสดงเป็นสีแดง" actions={<a href={searchParams.all ? '?' : '?all=1'} className="text-sm text-forest underline">{searchParams.all ? 'เฉพาะค้างชำระ' : 'ดูทั้งหมด'}</a>} />
      <Flash searchParams={searchParams} />
      <Card>
        <Table head={['ผู้ป่วย', 'แพ็กเกจ', 'งวด', 'จำนวน', 'กำหนด', 'สถานะ', '']} empty={rows.length === 0}>
          {rows.map(i => {
            const pr = one(i.program) as { id: string; tier: string; status: string; patient: unknown } | null
            const p = pr ? one(pr.patient as { id: string; first_name: string; last_name: string; hn: string | null; phone: string | null } | null) : null
            const overdue = i.status === 'due' && i.due_date < today
            return (
              <tr key={i.id} className={overdue ? 'bg-red-50/60' : ''}>
                <td className={td}><PatientLink p={p} />{p?.phone && <div className="text-xs text-gray-500">{p.phone}</div>}</td>
                <td className={td}>{pr?.tier} <Badge value={pr?.status} /></td>
                <td className={td}>{i.seq}</td>
                <td className={`${td} font-semibold`}>{baht(i.amount)}</td>
                <td className={td}>{dateTh(i.due_date)}</td>
                <td className={td}><Badge value={overdue ? 'overdue' : i.status} />{i.paid_at && <div className="text-xs text-gray-400">{dateTh(i.paid_at.slice(0, 10))}</div>}</td>
                <td className={`${td} text-right`}>
                  {(i.status === 'due' || i.status === 'overdue') && can(me.role, 'finance.write') && (
                    <form action={payInstallment}><input type="hidden" name="id" value={i.id} /><button className={btnSmall}>รับชำระ</button></form>
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
