import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { completeTask } from '../actions'
import { Badge, Card, Flash, PageHeader, PatientLink, Table, btnSmall, btnSmallSecondary, dateTh, one, td } from '../ui'

export const dynamic = 'force-dynamic'

const KIND_TH: Record<string, string> = { call_no_show: 'โทรตาม (ไม่มาตามนัด)', line_followup: 'ติดตามทาง LINE/โทร', survey_followup: 'ติดตามอาการจากแบบสอบถาม', review_alert: 'ตรวจสอบแจ้งเตือน' }

export default async function TasksPage({ searchParams }: { searchParams: { ok?: string; err?: string; done?: string } }) {
  const me = await requireDmglp('tasks.read')
  const { data } = await supabaseAdmin
    .from('dmglp_tasks')
    .select('id, kind, priority, assignee_role, due_date, status, note, created_at, patient:dmglp_patients(id, first_name, last_name, hn, phone), appointment:dmglp_appointments(scheduled_date, template_code)')
    .eq('status', searchParams.done ? 'done' : 'open')
    .order('priority').order('due_date', { ascending: true, nullsFirst: false })
    .limit(200)
  const rows = data ?? []
  return (
    <>
      <PageHeader title="งานที่ต้องทำ" subtitle="โทรตามผู้ไม่มาตามนัด, ติดตามอาการ — สร้างอัตโนมัติจากตารางนัดและแบบสอบถาม"
        actions={<a href={searchParams.done ? '?' : '?done=1'} className={btnSmallSecondary}>{searchParams.done ? 'ดูงานค้าง' : 'ดูงานที่เสร็จแล้ว'}</a>} />
      <Flash searchParams={searchParams} />
      <Card>
        <Table head={['ความสำคัญ', 'งาน', 'ผู้ป่วย', 'นัดที่พลาด', 'กำหนด', 'ผู้รับผิดชอบ', 'บันทึก', '']} empty={rows.length === 0}>
          {rows.map(t => {
            const p = one(t.patient) as { id: string; first_name: string; last_name: string; hn: string | null; phone: string | null } | null
            const a = one(t.appointment) as { scheduled_date: string; template_code: string | null } | null
            return (
              <tr key={t.id}>
                <td className={td}><Badge value={t.priority} /></td>
                <td className={td}>{KIND_TH[t.kind] || t.kind}</td>
                <td className={td}><PatientLink p={p} />{p?.phone && <div className="text-xs text-gray-500">{p.phone}</div>}</td>
                <td className={td}>{a ? `${a.template_code || ''} ${dateTh(a.scheduled_date)}` : '—'}</td>
                <td className={td}>{dateTh(t.due_date)}</td>
                <td className={td}>{t.assignee_role}</td>
                <td className={`${td} text-xs text-gray-500`}>{t.note}</td>
                <td className={`${td} text-right`}>
                  {t.status === 'open' && can(me.role, 'tasks.write') && (
                    <form action={completeTask} className="flex gap-1 justify-end">
                      <input type="hidden" name="id" value={t.id} />
                      <input name="note" placeholder="ผลการติดต่อ" className="border border-gray-200 rounded px-2 py-1 text-xs w-32" />
                      <button name="status" value="done" className={btnSmall}>เสร็จ</button>
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
