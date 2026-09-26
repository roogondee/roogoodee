import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { FRIDGE_MAX_C, FRIDGE_MIN_C } from '@/lib/dmglp/config'
import { logFridge } from '../../actions'
import { Card, Field, Flash, PageHeader, Table, btn, dateTimeTh, one, td } from '../../ui'

export const dynamic = 'force-dynamic'

export default async function FridgePage({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const me = await requireDmglp('pharmacy.read')
  const { data } = await supabaseAdmin
    .from('dmglp_fridge_logs').select('id, fridge, temp_c, in_range, recorded_at, by:admin_users!dmglp_fridge_logs_recorded_by_fkey(name, email)')
    .order('recorded_at', { ascending: false }).limit(60)
  return (
    <>
      <PageHeader title="บันทึกอุณหภูมิตู้เย็น" subtitle={`ช่วงที่ยอมรับ ${FRIDGE_MIN_C}–${FRIDGE_MAX_C} °C บันทึกวันละ 2 ครั้ง (เช้า/เย็น) — นอกช่วงจะกักสต็อกในตู้นั้นและแจ้งเตือนทันที`} />
      <Flash searchParams={searchParams} />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="บันทึกล่าสุด" className="lg:col-span-2">
          <Table head={['เวลา', 'ตู้', 'อุณหภูมิ', 'ผล', 'โดย']} empty={(data ?? []).length === 0}>
            {(data ?? []).map(r => {
              const by = one(r.by) as { name: string | null; email: string } | null
              return (
                <tr key={r.id} className={r.in_range ? '' : 'bg-red-50/60'}>
                  <td className={td}>{dateTimeTh(r.recorded_at)}</td>
                  <td className={td}>{r.fridge}</td>
                  <td className={`${td} font-semibold`}>{r.temp_c} °C</td>
                  <td className={td}>{r.in_range ? <span className="text-emerald-700 text-xs">ปกติ</span> : <span className="text-red-700 text-xs font-semibold">นอกช่วง</span>}</td>
                  <td className={`${td} text-xs`}>{by?.name || by?.email}</td>
                </tr>
              )
            })}
          </Table>
        </Card>
        {can(me.role, 'pharmacy.write') && (
          <Card title="บันทึกอุณหภูมิ">
            <form action={logFridge} className="space-y-3">
              <Field name="fridge" labelText="ตู้" defaultValue="main" required />
              <Field name="temp_c" labelText="อุณหภูมิ (°C)" type="number" step="0.1" required />
              <button className={btn}>บันทึก</button>
            </form>
          </Card>
        )}
      </div>
    </>
  )
}
