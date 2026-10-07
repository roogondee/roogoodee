import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { getPriceMap } from '@/lib/dmglp/db'
import { calculateRefund } from '@/lib/dmglp/refund'
import { todayBkk } from '@/lib/dmglp/dates'
import { cancelProgram, purchaseProgram } from '../../actions'
import { Badge, Card, Check, Field, Flash, PageHeader, PatientLink, Select, Table, baht, btn, dateTh, input, one, td } from '../../ui'

export const dynamic = 'force-dynamic'

export default async function ProgramsPage({ searchParams }: { searchParams: { ok?: string; err?: string; q?: string } }) {
  const me = await requireDmglp('finance.read')
  const write = can(me.role, 'finance.write')
  const [{ data: tiers }, prices, { data: programs }] = await Promise.all([
    supabaseAdmin.from('dmglp_program_tiers').select('tier, price_code, installments, validity_months, renewal_discount, entitlements').order('tier'),
    getPriceMap(),
    supabaseAdmin.from('dmglp_programs')
      .select('id, tier, price, amount_paid, payment_mode, purchased_at, expires_at, status, refund_amount, refund_note, patient:dmglp_patients(id, first_name, last_name, hn), usage:dmglp_program_usage(item_code, qty)')
      .order('purchased_at', { ascending: false }).limit(100),
  ])
  const q = (searchParams.q || '').trim()
  const { data: patients } = q
    ? await supabaseAdmin.from('dmglp_patients').select('id, first_name, last_name, hn').or(`hn.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`).limit(10)
    : { data: [] }

  return (
    <>
      <PageHeader title="โปรแกรม 6 เดือน" subtitle="แพ็กเกจครอบคลุมค่าบริการเท่านั้น — ยาคิดต่อปากกาตอนจ่ายยาเสมอ · อายุแพ็กเกจ 8 เดือน · ยังจ่ายรายครั้งได้" />
      <Flash searchParams={searchParams} />
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {(tiers ?? []).map(t => (
          <div key={t.tier} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="font-semibold text-forest">{t.tier} · {baht(prices[t.price_code])}</div>
            <div className="text-xs text-gray-500">ผ่อน 0% × {t.installments} = {baht(Math.ceil((prices[t.price_code] ?? 0) / t.installments))}/เดือน · ต่ออายุลด {Math.round(Number(t.renewal_discount) * 100)}%</div>
            <ul className="text-xs mt-2 text-gray-600">{Object.entries(t.entitlements as Record<string, number>).map(([k, v]) => <li key={k}>{k} × {v}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="โปรแกรมที่ซื้อ" className="lg:col-span-2">
          <Table head={['ผู้ป่วย', 'แพ็กเกจ', 'ชำระ', 'ซื้อ / หมดอายุ', 'สถานะ', 'ใช้ไป', '']} empty={(programs ?? []).length === 0}>
            {(programs ?? []).map(pr => {
              const p = one(pr.patient) as { id: string; first_name: string; last_name: string; hn: string | null } | null
              const r = calculateRefund(Number(pr.amount_paid), pr.usage ?? [], prices)
              return (
                <tr key={pr.id}>
                  <td className={td}><PatientLink p={p} /></td>
                  <td className={td}>{pr.tier}<div className="text-xs text-gray-500">{pr.payment_mode === 'installment' ? 'ผ่อน' : 'จ่ายเต็ม'}</div></td>
                  <td className={td}>{baht(pr.amount_paid)}<div className="text-xs text-gray-400">/ {baht(pr.price)}</div></td>
                  <td className={`${td} text-xs`}>{dateTh(pr.purchased_at)}<br />{dateTh(pr.expires_at)}</td>
                  <td className={td}><Badge value={pr.status} />{pr.refund_amount != null && <div className="text-xs text-gray-500">คืน {baht(pr.refund_amount)}</div>}</td>
                  <td className={`${td} text-xs`}>{baht(r.usedValue)}{pr.status === 'active' && <div className="text-gray-400">คืนได้ {baht(r.refund)}</div>}</td>
                  <td className={`${td} text-right`}>
                    {write && pr.status === 'active' && (
                      <details><summary className="text-xs text-red-600 underline cursor-pointer">ยกเลิก/คืนเงิน</summary>
                        <form action={cancelProgram} className="mt-1 space-y-1">
                          <input type="hidden" name="id" value={pr.id} />
                          <input name="reason" placeholder="เหตุผล" className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                          <p className="text-xs text-gray-500">คืน = ชำระ − ราคาปกติของบริการที่ใช้ไป = {baht(r.refund)}</p>
                          <button className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">ยืนยัน</button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        </Card>
        {write && (
          <Card title="ขายโปรแกรม">
            <form className="flex gap-2 mb-3">
              <input name="q" defaultValue={q} placeholder="ค้นหาผู้ป่วย (HN/ชื่อ)" className={input} />
              <button className="text-xs text-forest underline">ค้นหา</button>
            </form>
            {q && (patients ?? []).length === 0 && <p className="text-xs text-gray-400 mb-2">ไม่พบ</p>}
            <form action={purchaseProgram} className="space-y-3">
              <Select name="patient_id" labelText="ผู้ป่วย" required options={(patients ?? []).map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name} (${p.hn || '-'})` }))} />
              <Select name="tier" labelText="แพ็กเกจ" required options={(tiers ?? []).map(t => ({ value: t.tier, label: `${t.tier} — ${baht(prices[t.price_code])}` }))} />
              <Select name="payment_mode" labelText="การชำระ" required options={[{ value: 'upfront', label: 'จ่ายเต็ม' }, { value: 'installment', label: 'ผ่อน 0% × 6' }]} />
              <Field name="purchased_at" labelText="วันที่ซื้อ" type="date" required defaultValue={todayBkk()} />
              <Check name="renewal" labelText="ต่ออายุ (ส่วนลด 10%)" />
              <button className={btn} disabled={(patients ?? []).length === 0}>บันทึกการซื้อ</button>
            </form>
          </Card>
        )}
      </div>
    </>
  )
}
