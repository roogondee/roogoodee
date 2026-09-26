import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { getPriceItems } from '@/lib/dmglp/db'
import { todayBkk } from '@/lib/dmglp/dates'
import { saveStockCount } from '../../actions'
import { Card, Field, Flash, PageHeader, Select, Table, btn, dateTh, td } from '../../ui'

export const dynamic = 'force-dynamic'

// Monthly reconciliation: system count (in_stock + quarantine) vs physical.
export default async function ReconcilePage({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const me = await requireDmglp('pharmacy.read')
  const drugs = (await getPriceItems()).filter(i => i.category === 'drug')
  const { data: stock } = await supabaseAdmin.from('dmglp_pens').select('sku').in('status', ['in_stock', 'quarantine'])
  const system: Record<string, number> = {}
  for (const s of stock ?? []) system[s.sku] = (system[s.sku] || 0) + 1
  const { data: counts } = await supabaseAdmin
    .from('dmglp_stock_counts').select('id, count_month, sku, system_count, physical_count, variance_note, counted_at').order('count_month', { ascending: false }).order('sku').limit(120)
  const month = todayBkk().slice(0, 7)
  return (
    <>
      <PageHeader title="นับสต็อกประจำเดือน" subtitle="เทียบจำนวนในระบบกับที่นับจริง — ผลต่างต้องมีคำอธิบาย" />
      <Flash searchParams={searchParams} />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="ยอดในระบบตอนนี้" className="lg:col-span-2">
          <Table head={['SKU', 'ในระบบ (ในสต็อก+กัก)']}>
            {drugs.map(d => <tr key={d.code}><td className={td}>{d.code}</td><td className={`${td} font-semibold`}>{system[d.code] || 0}</td></tr>)}
          </Table>
          <h3 className="font-semibold text-forest mt-5 mb-2">ประวัติการนับ</h3>
          <Table head={['เดือน', 'SKU', 'ระบบ', 'นับจริง', 'ผลต่าง', 'หมายเหตุ']} empty={(counts ?? []).length === 0}>
            {(counts ?? []).map(c => (
              <tr key={c.id} className={c.system_count !== c.physical_count ? 'bg-amber-50/60' : ''}>
                <td className={td}>{dateTh(c.count_month).slice(2)}</td>
                <td className={td}>{c.sku}</td>
                <td className={td}>{c.system_count}</td>
                <td className={td}>{c.physical_count}</td>
                <td className={`${td} font-semibold`}>{c.physical_count - c.system_count}</td>
                <td className={`${td} text-xs text-gray-500`}>{c.variance_note}</td>
              </tr>
            ))}
          </Table>
        </Card>
        {can(me.role, 'pharmacy.write') && (
          <Card title="บันทึกผลนับ">
            <form action={saveStockCount} className="space-y-3">
              <Field name="count_month" labelText="เดือน" type="month" required defaultValue={month} />
              <Select name="sku" labelText="SKU" required options={drugs.map(d => ({ value: d.code, label: d.code }))} />
              <Field name="physical_count" labelText="นับจริง (ปากกา)" type="number" min={0} required />
              <Field name="variance_note" labelText="คำอธิบายผลต่าง (ถ้ามี)" />
              <button className={btn}>บันทึก</button>
            </form>
          </Card>
        )}
      </div>
    </>
  )
}
