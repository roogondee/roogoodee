import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { createLead, updateLead } from '../actions'
import { Badge, Card, Field, Flash, PageHeader, Table, btn, btnSmallSecondary, dateTimeTh, input, one, td } from '../ui'

export const dynamic = 'force-dynamic'

interface LeadRow {
  id: string; display_name: string | null; phone: string | null; line_user_id: string | null; status: string; notes: string | null; created_at: string
  attribution: { ref_code: string; channel: string | null; gclid: string | null } | { ref_code: string; channel: string | null; gclid: string | null }[] | null
  patients: { id: string }[] | null
}

const STATUSES = ['new', 'contacted', 'booked', 'converted', 'lost']

export default async function LeadsPage({ searchParams }: { searchParams: { ok?: string; err?: string; status?: string } }) {
  const me = await requireDmglp('leads.read')
  const write = can(me.role, 'leads.write')
  let q = supabaseAdmin
    .from('dmglp_leads')
    .select('id, display_name, phone, line_user_id, status, notes, created_at, attribution:dmglp_attribution(ref_code, channel, gclid), patients:dmglp_patients(id)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (searchParams.status && STATUSES.includes(searchParams.status)) q = q.eq('status', searchParams.status)
  const { data } = await q
  const rows = (data ?? []) as LeadRow[]

  return (
    <>
      <PageHeader title="Leads" subtitle="ผู้สนใจจากโฆษณา / LINE / พาร์ตเนอร์ — ก่อนเป็นผู้ป่วย" />
      <Flash searchParams={searchParams} />
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <Link href="/dmglp/staff/leads" className={btnSmallSecondary}>ทั้งหมด</Link>
        {STATUSES.map(s => <Link key={s} href={`?status=${s}`} className={btnSmallSecondary}><Badge value={s} /></Link>)}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Leads ล่าสุด" className="lg:col-span-2">
          <Table head={['วันที่', 'ชื่อ / เบอร์', 'ที่มา', 'สถานะ', 'บันทึก', '']} empty={rows.length === 0}>
            {rows.map(r => {
              const a = one(r.attribution)
              const patient = r.patients?.[0]
              return (
                <tr key={r.id}>
                  <td className={td}><span className="text-xs text-gray-500">{dateTimeTh(r.created_at)}</span></td>
                  <td className={td}>
                    <div className="font-semibold text-forest">{r.display_name || '—'}</div>
                    <div className="text-xs text-gray-500">{r.phone || (r.line_user_id ? 'LINE' : '—')}</div>
                  </td>
                  <td className={td}>
                    <div className="text-xs">{a?.ref_code || '—'}</div>
                    <div className="text-xs text-gray-400">{a?.channel || ''}{a?.gclid ? ' · gclid' : ''}</div>
                  </td>
                  <td className={td}>
                    {write ? (
                      <form action={updateLead} className="flex flex-col gap-1">
                        <input type="hidden" name="id" value={r.id} />
                        <select name="status" defaultValue={r.status} className="border border-gray-200 rounded px-2 py-1 text-xs">
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input name="notes" defaultValue={r.notes ?? ''} placeholder="บันทึก" className="border border-gray-200 rounded px-2 py-1 text-xs" />
                        <button className="text-xs text-forest underline text-left">บันทึก</button>
                      </form>
                    ) : <Badge value={r.status} />}
                  </td>
                  <td className={`${td} text-xs text-gray-500 max-w-[14rem]`}>{write ? '' : r.notes}</td>
                  <td className={`${td} text-right`}>
                    {patient ? (
                      <Link href={`/dmglp/staff/patients/${patient.id}`} className="text-xs text-forest underline">ผู้ป่วย</Link>
                    ) : can(me.role, 'patients.write') ? (
                      <Link href={`/dmglp/staff/patients?lead=${r.id}&name=${encodeURIComponent(r.display_name || '')}&phone=${encodeURIComponent(r.phone || '')}`} className="text-xs text-forest underline">ลงทะเบียน</Link>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </Table>
        </Card>
        {write && (
          <Card title="เพิ่ม lead (โทรเข้า / walk-in)">
            <form action={createLead} className="space-y-3">
              <Field name="display_name" labelText="ชื่อ" />
              <Field name="phone" labelText="เบอร์โทร" type="tel" />
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">บันทึก</label>
                <textarea name="notes" rows={3} className={input} />
              </div>
              <button className={btn}>เพิ่ม</button>
            </form>
          </Card>
        )}
      </div>
    </>
  )
}
