import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp } from '@/lib/dmglp/roles'
import { getRules } from '@/lib/dmglp/db'
import { saveScreening } from '../../../actions'
import { Card, Check, Field, Flash, PageHeader, btn, btnSecondary, input, label } from '../../../ui'

export const dynamic = 'force-dynamic'

// Nurse/doctor screening form (§4.1). The eligibility status + flags are
// computed server-side in saveScreening from the editable rule table.
export default async function ScreeningPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  await requireDmglp('clinical.write')
  const { data: p } = await supabaseAdmin.from('dmglp_patients').select('id, first_name, last_name, hn, sex').eq('id', params.id).maybeSingle()
  if (!p) notFound()
  const { data: prev } = await supabaseAdmin.from('dmglp_screenings').select('*').eq('patient_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const rules = await getRules()
  const co = new Set<string>((prev?.comorbidities as string[] | undefined) ?? [])

  return (
    <>
      <PageHeader title={`คัดกรอง — ${p.first_name} ${p.last_name}`} subtitle={`HN ${p.hn || '-'} · เกณฑ์: BMI ≥ ${rules.obesity_bmi} หรือ ≥ ${rules.overweight_bmi} + โรคร่วม หรือ T2DM`}
        actions={<Link href={`/dmglp/staff/patients/${p.id}`} className={btnSecondary}>← กลับ</Link>} />
      <Flash searchParams={searchParams} />
      <form action={saveScreening} className="grid lg:grid-cols-2 gap-5">
        <input type="hidden" name="patient_id" value={p.id} />
        <Card title="สัดส่วนร่างกาย">
          <div className="grid grid-cols-3 gap-3">
            <Field name="weight_kg" labelText="น้ำหนัก (kg)" type="number" step="0.1" min={20} max={400} defaultValue={prev?.weight_kg} />
            <Field name="height_cm" labelText="ส่วนสูง (cm)" type="number" step="0.1" min={100} max={250} defaultValue={prev?.height_cm} />
            <Field name="waist_cm" labelText="รอบเอว (cm)" type="number" step="0.1" defaultValue={prev?.waist_cm} />
          </div>
          <p className="text-xs text-gray-400 mt-2">BMI คำนวณอัตโนมัติ = น้ำหนัก / ส่วนสูง(ม.)²</p>
        </Card>
        <Card title="ข้อบ่งใช้">
          <div className="space-y-2">
            <Check name="has_t2dm" labelText="เบาหวานชนิดที่ 2 (T2DM)" defaultChecked={prev?.has_t2dm} />
            <p className={label}>โรคร่วมที่เกี่ยวกับน้ำหนัก</p>
            <Check name="comorbidities" value="ht" labelText="ความดันโลหิตสูง" defaultChecked={co.has('ht')} />
            <Check name="comorbidities" value="dyslipidemia" labelText="ไขมันในเลือดสูง" defaultChecked={co.has('dyslipidemia')} />
            <Check name="comorbidities" value="osa" labelText="ภาวะหยุดหายใจขณะหลับ" defaultChecked={co.has('osa')} />
            <Check name="comorbidities" value="nafld" labelText="ไขมันพอกตับ" defaultChecked={co.has('nafld')} />
          </div>
        </Card>
        <Card title="ข้อห้ามใช้ (ถ้ามี → ไม่เข้าเกณฑ์)">
          <div className="space-y-2">
            {p.sex !== 'M' && <>
              <Check name="pregnant_or_planning" labelText="ตั้งครรภ์ หรือวางแผนตั้งครรภ์" defaultChecked={prev?.pregnant_or_planning} />
              <Check name="breastfeeding" labelText="ให้นมบุตร" defaultChecked={prev?.breastfeeding} />
            </>}
            <Check name="mtc_men2_history" labelText="ประวัติมะเร็งไทรอยด์ชนิด medullary (MTC) หรือ MEN2 — ตนเองหรือครอบครัว" defaultChecked={prev?.mtc_men2_history} />
          </div>
        </Card>
        <Card title="ข้อควรระวัง (ถ้ามี → แพทย์พิจารณา)">
          <div className="space-y-2">
            <Check name="pancreatitis_history" labelText="ประวัติตับอ่อนอักเสบ" defaultChecked={prev?.pancreatitis_history} />
            <Check name="gallbladder_history" labelText="ประวัติโรคถุงน้ำดี / นิ่วในถุงน้ำดี" defaultChecked={prev?.gallbladder_history} />
            <Check name="gastroparesis" labelText="กระเพาะอาหารบีบตัวช้า (gastroparesis)" defaultChecked={prev?.gastroparesis} />
            <Check name="on_insulin" labelText="ใช้อินซูลินอยู่" defaultChecked={prev?.on_insulin} />
            <Check name="on_sulfonylurea" labelText="ใช้ยากลุ่ม sulfonylurea อยู่" defaultChecked={prev?.on_sulfonylurea} />
            <Check name="retinopathy" labelText="เบาหวานขึ้นตา (retinopathy)" defaultChecked={prev?.retinopathy} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <label className={label}>บันทึกเพิ่มเติม</label>
          <textarea name="note" rows={3} className={input} defaultValue={prev?.note ?? ''} />
          <div className="mt-4 flex gap-3">
            <button className={btn}>บันทึกและประเมิน</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">ผลประเมินเป็นเพียงธงคำเตือน — แพทย์ต้องยืนยันข้อบ่งใช้และ ICD-10 ก่อนสั่งยาทุกครั้ง</p>
        </Card>
      </form>
    </>
  )
}
