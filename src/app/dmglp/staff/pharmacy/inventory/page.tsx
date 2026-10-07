import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { getPriceItems } from '@/lib/dmglp/db'
import { todayBkk, addDays } from '@/lib/dmglp/dates'
import { addPens, setPenStatus } from '../../actions'
import { Badge, Card, Field, Flash, PageHeader, Select, Table, btn, btnSmallSecondary, dateTh, td } from '../../ui'

export const dynamic = 'force-dynamic'

export default async function InventoryPage({ searchParams }: { searchParams: { ok?: string; err?: string; status?: string } }) {
  const me = await requireDmglp('pharmacy.read')
  const write = can(me.role, 'pharmacy.write')
  const drugs = (await getPriceItems()).filter(i => i.category === 'drug' && i.active)
  const status = searchParams.status && ['in_stock', 'quarantine', 'dispensed', 'expired', 'damaged', 'returned'].includes(searchParams.status) ? searchParams.status : 'in_stock'
  const { data: pens } = await supabaseAdmin
    .from('dmglp_pens').select('id, sku, lot, expiry, received_at, supplier_doc, fridge, status, status_note').eq('status', status).order('expiry').limit(300)
  const { data: stock } = await supabaseAdmin.from('dmglp_pens').select('sku, status').in('status', ['in_stock', 'quarantine'])
  const counts: Record<string, { in_stock: number; quarantine: number }> = {}
  for (const s of stock ?? []) {
    counts[s.sku] ??= { in_stock: 0, quarantine: 0 }
    counts[s.sku][s.status as 'in_stock' | 'quarantine'] += 1
  }
  const soon = addDays(todayBkk(), 60)

  return (
    <>
      <PageHeader title="สต็อกปากกา (ทะเบียนยาควบคุมพิเศษ)" subtitle="ติดตามระดับปากกา: SKU, lot, วันหมดอายุ, วันรับเข้า, เอกสารผู้จำหน่าย"
        actions={<a href="/api/dmglp/pharmacy-export" className={btnSmallSecondary}>ส่งออก CSV (Track & Trace)</a>} />
      <Flash searchParams={searchParams} />
      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {drugs.map(d => (
          <div key={d.code} className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-xs text-gray-500">{d.code}</div>
            <div className="text-xl font-semibold text-forest">{counts[d.code]?.in_stock ?? 0}</div>
            {counts[d.code]?.quarantine ? <div className="text-xs text-amber-700">กัก {counts[d.code].quarantine}</div> : null}
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {['in_stock', 'quarantine', 'dispensed', 'expired', 'damaged', 'returned'].map(s => <a key={s} href={`?status=${s}`} className={btnSmallSecondary}><Badge value={s} /></a>)}
          </div>
          <Table head={['SKU', 'Lot', 'หมดอายุ', 'รับเข้า', 'เอกสาร', 'ตู้', 'หมายเหตุ', '']} empty={(pens ?? []).length === 0}>
            {(pens ?? []).map(p => (
              <tr key={p.id} className={p.expiry <= soon && status === 'in_stock' ? 'bg-amber-50/60' : ''}>
                <td className={`${td} font-semibold`}>{p.sku}</td>
                <td className={td}>{p.lot}</td>
                <td className={td}>{dateTh(p.expiry)}{p.expiry <= soon && status === 'in_stock' && <span className="ml-1 text-xs text-amber-700">ใกล้หมดอายุ</span>}</td>
                <td className={td}>{dateTh(p.received_at)}</td>
                <td className={`${td} text-xs`}>{p.supplier_doc || '—'}</td>
                <td className={td}>{p.fridge}</td>
                <td className={`${td} text-xs text-gray-500`}>{p.status_note}</td>
                <td className={`${td} text-right`}>
                  {write && status !== 'dispensed' && (
                    <form action={setPenStatus} className="flex gap-1 justify-end">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="status" defaultValue={p.status} className="border border-gray-200 rounded px-1 py-0.5 text-xs">
                        {['in_stock', 'quarantine', 'expired', 'damaged', 'returned'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="text-xs text-forest underline">เปลี่ยน</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
        {write && (
          <Card title="รับยาเข้า">
            <form action={addPens} className="space-y-3">
              <Select name="sku" labelText="SKU" required options={drugs.map(d => ({ value: d.code, label: `${d.code} — ${d.name_th}` }))} />
              <div className="grid grid-cols-2 gap-2">
                <Field name="lot" labelText="Lot" required />
                <Field name="qty" labelText="จำนวนปากกา" type="number" min={1} max={500} required defaultValue={1} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field name="expiry" labelText="วันหมดอายุ" type="date" required />
                <Field name="received_at" labelText="วันรับเข้า" type="date" required defaultValue={todayBkk()} />
              </div>
              <Field name="supplier_doc" labelText="เลขที่เอกสารผู้จำหน่าย" />
              <Field name="fridge" labelText="ตู้เย็น" defaultValue="main" />
              <button className={btn}>บันทึกรับเข้า</button>
            </form>
          </Card>
        )}
      </div>
    </>
  )
}
