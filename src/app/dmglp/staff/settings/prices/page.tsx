import { requireDmglp } from '@/lib/dmglp/roles'
import { getPriceItems } from '@/lib/dmglp/db'
import { updatePrice } from '../../actions'
import { Card, Flash, PageHeader, Table, baht, td } from '../../ui'

export const dynamic = 'force-dynamic'

const CAT_TH: Record<string, string> = { drug: 'ยา (ต่อปากกา)', service: 'บริการ', lab: 'แล็บ', package: 'แพ็กเกจ' }

export default async function PricesPage({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const me = await requireDmglp('settings.read')
  const items = await getPriceItems()
  const editable = me.role === 'finance'
  return (
    <>
      <PageHeader title="ตารางราคา" subtitle="แก้ได้เฉพาะฝ่ายการเงิน · รายการที่มี * ยังเป็นราคาตั้งต้น รอการเงินยืนยัน · ราคายาแสดงเฉพาะในระบบเจ้าหน้าที่ ไม่ปรากฏบนหน้าเว็บสาธารณะ" />
      <Flash searchParams={searchParams} />
      {(['drug', 'service', 'lab', 'package'] as const).map(cat => (
        <Card key={cat} title={CAT_TH[cat]} className="mb-5">
          <Table head={['รหัส', 'รายการ', 'ราคา (บาท)', 'ใช้งาน', '']}>
            {items.filter(i => i.category === cat).map(i => (
              <tr key={i.code} className={i.active ? '' : 'text-gray-400'}>
                <td className={`${td} font-mono text-xs`}>{i.code}</td>
                <td className={td}>{i.name_th}{i.placeholder && <span className="text-amber-600"> *</span>}</td>
                {editable ? (
                  <td className={td} colSpan={3}>
                    <form action={updatePrice} className="flex items-center gap-2">
                      <input type="hidden" name="code" value={i.code} />
                      <input name="price" type="number" step="0.01" min={0} defaultValue={i.price} className="border border-gray-200 rounded px-2 py-1 text-sm w-32" />
                      <label className="text-xs flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={i.active} /> ใช้งาน</label>
                      <button className="text-xs text-forest underline">บันทึก</button>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className={`${td} font-semibold`}>{baht(i.price)}</td>
                    <td className={td}>{i.active ? 'ใช่' : 'ไม่'}</td>
                    <td className={td}></td>
                  </>
                )}
              </tr>
            ))}
          </Table>
        </Card>
      ))}
    </>
  )
}
