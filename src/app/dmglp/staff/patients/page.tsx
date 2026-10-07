import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { createPatient } from '../actions'
import { Badge, Card, Check, Field, Flash, PageHeader, Select, Table, btn, btnSmallSecondary, dateTh, input, one, td } from '../ui'

export const dynamic = 'force-dynamic'

interface Row {
  id: string; hn: string | null; first_name: string; last_name: string; sex: string | null; birth_date: string | null; phone: string | null; line_user_id: string | null; created_at: string
  enrollments: { phase: string; drug: string }[] | null
  screenings: { eligibility_status: string }[] | null
}

export default async function PatientsPage({ searchParams }: { searchParams: { ok?: string; err?: string; q?: string; lead?: string; name?: string; phone?: string } }) {
  const me = await requireDmglp('patients.read')
  const q = (searchParams.q || '').trim().slice(0, 60)
  let query = supabaseAdmin
    .from('dmglp_patients')
    .select('id, hn, first_name, last_name, sex, birth_date, phone, line_user_id, created_at, enrollments:dmglp_enrollments(phase, drug), screenings:dmglp_screenings(eligibility_status)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (q) query = query.or(`hn.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
  const { data } = await query
  const rows = (data ?? []) as Row[]
  const { data: partners } = await supabaseAdmin.from('dmglp_partners').select('id, name').eq('active', true).order('name')
  const [leadFirst, ...leadRest] = (searchParams.name || '').split(' ')

  return (
    <>
      <PageHeader title="ทะเบียนผู้ป่วย" subtitle="เชื่อมกับ HIS ด้วย HN — เก็บเฉพาะข้อมูลที่โปรแกรมต้องใช้" />
      <Flash searchParams={searchParams} />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <form className="flex gap-2 mb-4">
            <input name="q" defaultValue={q} placeholder="ค้นหา HN / ชื่อ / เบอร์" className={input} />
            <button className={btnSmallSecondary}>ค้นหา</button>
          </form>
          <Table head={['HN', 'ชื่อ', 'เพศ/เกิด', 'เบอร์', 'คัดกรอง', 'โปรแกรม']} empty={rows.length === 0}>
            {rows.map(r => {
              const enr = r.enrollments?.find(e => e.phase !== 'stopped') || r.enrollments?.[0]
              const scr = r.screenings?.[r.screenings.length - 1]
              return (
                <tr key={r.id}>
                  <td className={td}>{r.hn || <span className="text-amber-600 text-xs">ยังไม่มี HN</span>}</td>
                  <td className={td}><Link href={`/dmglp/staff/patients/${r.id}`} className="font-semibold text-forest hover:underline">{r.first_name} {r.last_name}</Link>{r.line_user_id && <span className="ml-1 text-xs text-emerald-600">LINE</span>}</td>
                  <td className={td}>{r.sex || '—'} · {dateTh(r.birth_date)}</td>
                  <td className={td}>{r.phone || '—'}</td>
                  <td className={td}><Badge value={scr?.eligibility_status} /></td>
                  <td className={td}>{enr ? <><Badge value={enr.phase} /> <span className="text-xs text-gray-500">{enr.drug}</span></> : '—'}</td>
                </tr>
              )
            })}
          </Table>
        </Card>
        {can(me.role, 'patients.write') && (
          <Card title="ลงทะเบียนผู้ป่วยใหม่">
            <form action={createPatient} className="space-y-3">
              {searchParams.lead && <input type="hidden" name="lead_id" value={searchParams.lead} />}
              <Field name="hn" labelText="HN (จาก HIS)" hint="ต้องมีก่อนจ่ายยา" />
              <div className="grid grid-cols-2 gap-2">
                <Field name="first_name" labelText="ชื่อ" required defaultValue={leadFirst} />
                <Field name="last_name" labelText="นามสกุล" required defaultValue={leadRest.join(' ')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select name="sex" labelText="เพศ" options={[{ value: 'M', label: 'ชาย' }, { value: 'F', label: 'หญิง' }]} />
                <Field name="birth_date" labelText="วันเกิด" type="date" />
              </div>
              <Field name="phone" labelText="เบอร์โทร" type="tel" defaultValue={searchParams.phone} />
              {partners && partners.length > 0 && (
                <Select name="partner_id" labelText="ส่งต่อจากพาร์ตเนอร์" options={partners.map(p => ({ value: p.id, label: p.name }))} />
              )}
              <div className="space-y-1 pt-1">
                <p className="text-xs font-semibold text-gray-600">ความยินยอม (ลงนามบนกระดาษ/แท็บเล็ตของโรงพยาบาล)</p>
                <Check name="consent" value="pdpa" labelText="PDPA — ยินยอมให้เก็บและใช้ข้อมูลสุขภาพ (จำเป็น)" defaultChecked />
                <Check name="consent" value="treatment" labelText="ยินยอมรับการรักษาในโปรแกรม" />
                <input type="hidden" name="consent_version" value="2026-09" />
              </div>
              <button className={btn}>สร้างผู้ป่วย</button>
            </form>
          </Card>
        )}
      </div>
    </>
  )
}
