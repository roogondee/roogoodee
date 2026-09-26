import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { todayBkk } from '@/lib/dmglp/dates'
import { recordPartnerService, savePartner } from '../actions'
import { Card, Field, Flash, PageHeader, Select, Table, baht, btn, dateTh, one, td } from '../ui'

export const dynamic = 'force-dynamic'

// Partners (§4.10): a clinic partner earns a shared-care fee only against a
// documented service row — never a per-head referral commission.
export default async function PartnersPage({ searchParams }: { searchParams: { ok?: string; err?: string; month?: string } }) {
  const me = await requireDmglp('finance.read')
  const write = can(me.role, 'finance.write')
  const month = /^\d{4}-\d{2}$/.test(searchParams.month || '') ? searchParams.month! : todayBkk().slice(0, 7)
  const [{ data: partners }, { data: services }, { data: patients }] = await Promise.all([
    supabaseAdmin.from('dmglp_partners').select('id, name, type, ref_code, shared_care_fee, active').order('name'),
    supabaseAdmin.from('dmglp_partner_services').select('id, partner_id, performed_at, service_note, fee, patient:dmglp_patients(first_name, last_name, hn)')
      .gte('performed_at', `${month}-01`).lt('performed_at', nextMonth(month)).order('performed_at'),
    supabaseAdmin.from('dmglp_patients').select('id, first_name, last_name, hn, partner_id').not('partner_id', 'is', null).limit(300),
  ])
  const statement: Record<string, { count: number; fee: number }> = {}
  for (const s of services ?? []) {
    statement[s.partner_id] ??= { count: 0, fee: 0 }
    statement[s.partner_id].count += 1
    statement[s.partner_id].fee += Number(s.fee || 0)
  }
  return (
    <>
      <PageHeader title="พาร์ตเนอร์ (คลินิก / ตัวแทน / โรงงาน)" subtitle="ค่าตอบแทน shared-care จ่ายเฉพาะเมื่อมีบันทึกบริการดูแลจริง — ไม่ใช่ค่าหัว"
        actions={<form className="flex gap-2"><input type="month" name="month" defaultValue={month} className="border border-gray-200 rounded-lg px-2 py-1 text-sm" /><button className="text-sm text-forest underline">ดูเดือน</button></form>} />
      <Flash searchParams={searchParams} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title={`สรุปรายเดือน ${month}`}>
            <Table head={['พาร์ตเนอร์', 'ประเภท', 'รหัส', 'ค่าตอบแทน/ปากกา', 'บริการเดือนนี้', 'ยอดจ่าย']} empty={(partners ?? []).length === 0}>
              {(partners ?? []).map(p => (
                <tr key={p.id} className={p.active ? '' : 'text-gray-400'}>
                  <td className={`${td} font-semibold`}>{p.name}</td>
                  <td className={td}>{p.type}</td>
                  <td className={td}><code className="text-xs">{p.ref_code}</code><div className="text-xs text-gray-400">roogondee.com/dmglp?ref={p.ref_code}</div></td>
                  <td className={td}>{baht(p.shared_care_fee)}</td>
                  <td className={td}>{statement[p.id]?.count ?? 0}</td>
                  <td className={`${td} font-semibold`}>{baht(statement[p.id]?.fee ?? 0)}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="บริการที่บันทึกเดือนนี้">
            <Table head={['วันที่', 'พาร์ตเนอร์', 'ผู้ป่วย', 'บริการ', 'ค่าตอบแทน']} empty={(services ?? []).length === 0}>
              {(services ?? []).map(s => {
                const pt = one(s.patient) as { first_name: string; last_name: string; hn: string | null } | null
                return (
                  <tr key={s.id}>
                    <td className={td}>{dateTh(s.performed_at)}</td>
                    <td className={td}>{(partners ?? []).find(p => p.id === s.partner_id)?.name}</td>
                    <td className={td}>{pt ? `${pt.first_name} ${pt.last_name} (${pt.hn || '-'})` : '—'}</td>
                    <td className={`${td} text-xs`}>{s.service_note}</td>
                    <td className={td}>{baht(s.fee)}</td>
                  </tr>
                )
              })}
            </Table>
          </Card>
        </div>
        {write && (
          <div className="space-y-5">
            <Card title="เพิ่มพาร์ตเนอร์">
              <form action={savePartner} className="space-y-3">
                <Field name="name" labelText="ชื่อ" required />
                <Select name="type" labelText="ประเภท" required options={[{ value: 'clinic', label: 'คลินิก' }, { value: 'agent', label: 'ตัวแทน' }, { value: 'factory', label: 'โรงงาน' }]} />
                <Field name="ref_code" labelText="รหัสอ้างอิง (ใช้ในลิงก์)" required placeholder="CLINIC-A" />
                <Field name="shared_care_fee" labelText="ค่าตอบแทน shared-care ต่อปากกา (บาท)" type="number" hint="1,000–1,500 ตามข้อตกลง (รอกฎหมายตรวจสอบ)" />
                <button className={btn}>บันทึก</button>
              </form>
            </Card>
            <Card title="บันทึกบริการดูแลของพาร์ตเนอร์">
              <form action={recordPartnerService} className="space-y-3">
                <Select name="partner_id" labelText="พาร์ตเนอร์" required options={(partners ?? []).filter(p => p.active).map(p => ({ value: p.id, label: p.name }))} />
                <Select name="patient_id" labelText="ผู้ป่วยที่ส่งต่อ" required options={(patients ?? []).map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name} (${p.hn || '-'})` }))} />
                <Field name="performed_at" labelText="วันที่ให้บริการ" type="date" required defaultValue={todayBkk()} />
                <Field name="service_note" labelText="บริการที่ทำ (เช่น ติดตามฉีดยา, วัดน้ำหนัก, ให้คำแนะนำ)" required />
                <Field name="fee" labelText="ค่าตอบแทนครั้งนี้ (ว่าง = ตามอัตราพาร์ตเนอร์)" type="number" />
                <button className={btn}>บันทึก</button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}

function nextMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`
}
