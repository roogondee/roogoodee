import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { todayBkk } from '@/lib/dmglp/dates'
import { dispensePen } from '../../actions'
import { Card, Check, Flash, PageHeader, Table, btn, dateTh, dateTimeTh, one, td } from '../../ui'

export const dynamic = 'force-dynamic'

// Pharmacist dispense screen (§4.8): pending prescriptions, FEFO pen pick,
// counselling checklist, and the gates (prescription, doctor licence, HN,
// indication, eligibility, pen in stock) enforced again in dispensePen.
export default async function DispensePage({ searchParams }: { searchParams: { ok?: string; err?: string; rx?: string } }) {
  const me = await requireDmglp('pharmacy.read')
  const write = can(me.role, 'pharmacy.write')
  const { data: pending } = await supabaseAdmin
    .from('dmglp_prescriptions')
    .select('id, sku, directions, created_at, patient:dmglp_patients(id, first_name, last_name, hn), doctor:admin_users!dmglp_prescriptions_doctor_id_fkey(name, email, license_no), dispense:dmglp_dispenses(id)')
    .order('created_at', { ascending: false }).limit(100)
  const open = (pending ?? []).filter(r => !r.dispense || r.dispense.length === 0)
  const selected = open.find(r => r.id === searchParams.rx) || open[0]

  const { data: pens } = selected
    ? await supabaseAdmin.from('dmglp_pens').select('id, sku, lot, expiry, received_at, fridge').eq('sku', selected.sku).eq('status', 'in_stock').gte('expiry', todayBkk()).order('expiry').limit(20)
    : { data: [] }
  const { data: recent } = await supabaseAdmin
    .from('dmglp_dispenses')
    .select('id, dispensed_at, doctor_name, patient:dmglp_patients(id, first_name, last_name, hn), prescription:dmglp_prescriptions(sku), pen:dmglp_pens(lot, expiry), pharmacist:admin_users!dmglp_dispenses_pharmacist_id_fkey(name, email)')
    .order('dispensed_at', { ascending: false }).limit(20)

  return (
    <>
      <PageHeader title="จ่ายยา (ยาควบคุมพิเศษ)" subtitle="1 ใบสั่งยา = 1 ปากกา = ผู้ป่วย 1 คน · เลือกปากกาที่หมดอายุก่อน (FEFO)" />
      <Flash searchParams={searchParams} />
      {!me.licenseNo && write && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4">บัญชีของคุณยังไม่มีเลขใบประกอบวิชาชีพเภสัชกรรม — ให้ manager ตั้งค่าที่ ทีมงาน ก่อนจึงจะจ่ายยาได้</p>}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card title={`ใบสั่งยาที่รอจ่าย (${open.length})`}>
          <Table head={['เวลา', 'ผู้ป่วย', 'SKU', 'แพทย์', '']} empty={open.length === 0}>
            {open.map(r => {
              const p = one(r.patient) as { id: string; first_name: string; last_name: string; hn: string | null } | null
              const d = one(r.doctor) as { name: string | null; email: string; license_no: string | null } | null
              return (
                <tr key={r.id} className={selected?.id === r.id ? 'bg-emerald-50/60' : ''}>
                  <td className={`${td} text-xs`}>{dateTimeTh(r.created_at)}</td>
                  <td className={td}>{p ? `${p.first_name} ${p.last_name}` : '—'}<div className="text-xs text-gray-500">HN {p?.hn || <span className="text-red-600">ไม่มี</span>}</div></td>
                  <td className={`${td} font-semibold`}>{r.sku}</td>
                  <td className={`${td} text-xs`}>{d?.name || d?.email}<div className={d?.license_no ? 'text-gray-500' : 'text-red-600'}>{d?.license_no ? `ใบ ว. ${d.license_no}` : 'ไม่มีเลขใบประกอบฯ'}</div></td>
                  <td className={`${td} text-right`}><a href={`?rx=${r.id}`} className="text-xs text-forest underline">เลือก</a></td>
                </tr>
              )
            })}
          </Table>
        </Card>
        <Card title={selected ? `จ่าย ${selected.sku} ให้ ${(one(selected.patient) as { first_name: string; last_name: string } | null)?.first_name || ''}` : 'เลือกใบสั่งยา'}>
          {selected && write && (
            <form action={dispensePen} className="space-y-3">
              <input type="hidden" name="prescription_id" value={selected.id} />
              <p className="text-xs text-gray-500">วิธีใช้: {selected.directions}</p>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">เลือกปากกา (เรียงตามวันหมดอายุ)</p>
                {(pens ?? []).length === 0 ? <p className="text-sm text-red-600">ไม่มี {selected.sku} ในสต็อกที่จ่ายได้</p> : (
                  <div className="space-y-1">
                    {(pens ?? []).map((pen, i) => (
                      <label key={pen.id} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="pen_id" value={pen.id} defaultChecked={i === 0} required />
                        <span>lot {pen.lot} · หมดอายุ {dateTh(pen.expiry)} · ตู้ {pen.fridge}{i === 0 && <span className="ml-1 text-xs text-emerald-700">(FEFO)</span>}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-600">การให้คำแนะนำ</p>
                <Check name="teach_back" labelText="สอนวิธีฉีดและให้ผู้ป่วยทำ/พูดทวน (teach-back) แล้ว" />
                <Check name="hypo_education" labelText="อธิบายอาการน้ำตาลต่ำและวิธีแก้แล้ว" />
                <Check name="missed_dose_rule" labelText="อธิบายกฎเมื่อลืมฉีดแล้ว" />
              </div>
              <button className={btn} disabled={(pens ?? []).length === 0}>บันทึกการจ่ายยา</button>
            </form>
          )}
          {selected && !write && <p className="text-sm text-gray-400">ดูอย่างเดียว</p>}
        </Card>
      </div>
      <Card title="จ่ายล่าสุด" className="mt-5">
        <Table head={['เวลา', 'ผู้ป่วย', 'SKU', 'Lot / หมดอายุ', 'แพทย์', 'เภสัชกร']} empty={(recent ?? []).length === 0}>
          {(recent ?? []).map(r => {
            const p = one(r.patient) as { id: string; first_name: string; last_name: string; hn: string | null } | null
            const rx = one(r.prescription) as { sku: string } | null
            const pen = one(r.pen) as { lot: string; expiry: string } | null
            const ph = one(r.pharmacist) as { name: string | null; email: string } | null
            return (
              <tr key={r.id}>
                <td className={`${td} text-xs`}>{dateTimeTh(r.dispensed_at)}</td>
                <td className={td}>{p ? `${p.first_name} ${p.last_name} · ${p.hn || '-'}` : '—'}</td>
                <td className={td}>{rx?.sku}</td>
                <td className={`${td} text-xs`}>{pen?.lot} / {dateTh(pen?.expiry)}</td>
                <td className={`${td} text-xs`}>{r.doctor_name}</td>
                <td className={`${td} text-xs`}>{ph?.name || ph?.email}</td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}
