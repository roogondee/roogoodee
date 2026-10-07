import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp } from '@/lib/dmglp/roles'
import { DRUGS, SCHEDULE_TEMPLATE } from '@/lib/dmglp/config'
import { updateRule } from '../../actions'
import { Card, Flash, PageHeader, Table, td } from '../../ui'

export const dynamic = 'force-dynamic'

export default async function RulesPage({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const me = await requireDmglp('settings.read')
  const editable = me.role === 'doctor' || me.role === 'pharmacist'
  const { data: rules } = await supabaseAdmin.from('dmglp_eligibility_rules').select('key, value, label_th, updated_at').order('key')
  return (
    <>
      <PageHeader title="เกณฑ์ทางคลินิก" subtitle="แก้ได้โดยแพทย์/เภสัชกร · ต้องตรวจสอบกับเอกสารกำกับยาฉบับปัจจุบันของแต่ละ lot" />
      <Flash searchParams={searchParams} />
      <Card title="เกณฑ์ที่ปรับได้" className="mb-5">
        <Table head={['เกณฑ์', 'ค่า', '']}>
          {(rules ?? []).map(r => (
            <tr key={r.key}>
              <td className={td}>{r.label_th}<div className="text-xs text-gray-400 font-mono">{r.key}</div></td>
              <td className={td} colSpan={2}>
                {editable ? (
                  <form action={updateRule} className="flex items-center gap-2">
                    <input type="hidden" name="key" value={r.key} />
                    <input name="value" type="number" step="0.1" min={0} defaultValue={Number(r.value)} className="border border-gray-200 rounded px-2 py-1 text-sm w-28" />
                    <button className="text-xs text-forest underline">บันทึก</button>
                  </form>
                ) : <span className="font-semibold">{Number(r.value)}</span>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="ขั้นขนาดยา (คงที่ในโค้ด — ธงเตือนเท่านั้น)">
          <ul className="text-sm space-y-1">
            {Object.values(DRUGS).map(d => <li key={d.label}><b>{d.label}</b>: {d.steps_mg.join(' → ')} mg · ≥ {d.min_days_per_step} วัน/ขั้น · ลืมฉีดได้ภายใน {d.missed_dose_window_days} วัน</li>)}
          </ul>
        </Card>
        <Card title="ตารางนัดมาตรฐาน (Day 0 = วันเริ่ม)">
          <ul className="text-sm space-y-0.5">
            {SCHEDULE_TEMPLATE.map(s => <li key={s.code}><b>{s.code}</b> วันที่ +{s.offsetDays} · {s.type}{s.labPanel ? ` · แล็บ ${s.labPanel}` : ''}</li>)}
          </ul>
        </Card>
      </div>
    </>
  )
}
