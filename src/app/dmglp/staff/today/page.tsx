import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { todayBkk, addDays } from '@/lib/dmglp/dates'
import { checkInAppointment, sendLineFollowup } from '../actions'
import { Badge, Card, Flash, PageHeader, PatientLink, Table, btnSmall, btnSmallSecondary, dateTh, one, td } from '../ui'

export const dynamic = 'force-dynamic'

interface Row {
  id: string
  template_code: string | null
  type: string
  scheduled_date: string
  status: string
  lab_panel: string | null
  survey_sent_at: string | null
  patient: { id: string; first_name: string; last_name: string; hn: string | null; line_user_id: string | null } | { id: string; first_name: string; last_name: string; hn: string | null; line_user_id: string | null }[] | null
  visit: { id: string }[] | null
}

const TYPE_BY_ROLE: Record<string, string[] | null> = {
  doctor: ['specialist_visit', 'followup_visit', 'lab_only'],
  nurse: ['specialist_visit', 'followup_visit', 'lab_only'],
  pharmacist: ['line_followup', 'followup_visit'],
  admin: null, manager: null, finance: null, marketing: null, auditor: null,
}

export default async function TodayPage({ searchParams }: { searchParams: { ok?: string; err?: string; date?: string; all?: string } }) {
  const me = await requireDmglp('appointments.read')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date || '') ? searchParams.date! : todayBkk()
  const { data } = await supabaseAdmin
    .from('dmglp_appointments')
    .select('id, template_code, type, scheduled_date, status, lab_panel, survey_sent_at, patient:dmglp_patients(id, first_name, last_name, hn, line_user_id), visit:dmglp_visits(id)')
    .eq('scheduled_date', date)
    .neq('status', 'cancelled')
    .order('type')
  const rows = (data ?? []) as Row[]
  const filter = searchParams.all ? null : TYPE_BY_ROLE[me.role]
  const shown = filter ? rows.filter(r => filter.includes(r.type)) : rows

  const { count: missedCount } = await supabaseAdmin
    .from('dmglp_appointments').select('id', { count: 'exact', head: true }).eq('status', 'missed')

  return (
    <>
      <PageHeader
        title={`นัดวันที่ ${dateTh(date)}`}
        subtitle={filter ? `กรองตามบทบาท (${me.role}) — ` : ''}
        actions={
          <>
            <Link href={`?date=${addDays(date, -1)}`} className={btnSmallSecondary}>← วันก่อน</Link>
            <Link href={`?date=${todayBkk()}`} className={btnSmallSecondary}>วันนี้</Link>
            <Link href={`?date=${addDays(date, 1)}`} className={btnSmallSecondary}>วันถัดไป →</Link>
            {filter && <Link href={`?date=${date}&all=1`} className={btnSmallSecondary}>ดูทั้งหมด</Link>}
          </>
        }
      />
      <Flash searchParams={searchParams} />
      {(missedCount ?? 0) > 0 && can(me.role, 'tasks.read') && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4">
          มีนัดที่ผู้ป่วยไม่มา {missedCount} รายการ — ดูที่ <Link href="/dmglp/staff/tasks" className="underline">งาน</Link>
        </p>
      )}
      <Card>
        <Table head={['เวลา/ประเภท', 'ผู้ป่วย', 'รหัสนัด', 'แล็บ', 'สถานะ', '']} empty={shown.length === 0}>
          {shown.map(r => {
            const p = one(r.patient)
            const visit = r.visit?.[0]
            const open = ['scheduled', 'rescheduled', 'missed'].includes(r.status)
            return (
              <tr key={r.id}>
                <td className={td}><Badge value={r.type} /></td>
                <td className={td}><PatientLink p={p} />{p && !p.line_user_id && <span className="ml-1 text-xs text-gray-400">(ไม่มี LINE)</span>}</td>
                <td className={td}>{r.template_code || '—'}</td>
                <td className={td}>{r.lab_panel || '—'}</td>
                <td className={td}><Badge value={r.status} /></td>
                <td className={`${td} text-right`}>
                  {visit ? (
                    <Link href={`/dmglp/staff/visits/${visit.id}`} className={btnSmall}>เปิดการตรวจ</Link>
                  ) : r.type === 'line_followup' ? (
                    open && can(me.role, 'appointments.write') && (
                      <form action={sendLineFollowup}><input type="hidden" name="id" value={r.id} /><button className={btnSmall}>ส่ง LINE ติดตาม</button></form>
                    )
                  ) : (
                    open && can(me.role, 'appointments.write') && (
                      <form action={checkInAppointment}><input type="hidden" name="id" value={r.id} /><button className={btnSmall}>เช็กอิน</button></form>
                    )
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
