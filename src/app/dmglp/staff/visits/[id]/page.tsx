import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { dmglpAudit } from '@/lib/dmglp/audit'
import { DRUGS, LAB_LABELS, LAB_PANELS, REPRODUCTIVE_AGE_MAX, UPT_CODE, type DrugKey, type LabPanel } from '@/lib/dmglp/config'
import { TITRATION_FLAG_LABELS_TH } from '@/lib/dmglp/titration'
import { todayBkk, ageOn, daysBetween, toBkkDate } from '@/lib/dmglp/dates'
import { completeVisit, saveDoseDecision, saveLabs, saveVisitVitals } from '../../actions'
import { Badge, Card, Check, Field, Flash, PageHeader, Select, btn, btnSecondary, dateTh, input, label, one } from '../../ui'

export const dynamic = 'force-dynamic'

const GI = [['nausea', 'คลื่นไส้'], ['vomiting', 'อาเจียน'], ['constipation', 'ท้องผูก'], ['diarrhea', 'ท้องเสีย'], ['reflux', 'กรดไหลย้อน'], ['appetite_loss', 'เบื่ออาหารมาก']]
const CHK = [['injection_technique', 'ทบทวนวิธีฉีดยา'], ['missed_dose_rule', 'ทบทวนกฎเมื่อลืมฉีด'], ['hydration_diet', 'แนะนำน้ำ/อาหาร/โปรตีน'], ['hypo_symptoms', 'สอนสังเกตอาการน้ำตาลต่ำ'], ['side_effect_review', 'ซักถามผลข้างเคียง']]

export default async function VisitPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const me = await requireDmglp('clinical.read')
  const { data: v } = await supabaseAdmin
    .from('dmglp_visits')
    .select('*, patient:dmglp_patients(id, first_name, last_name, hn, sex, birth_date), appointment:dmglp_appointments(id, template_code, type, lab_panel, status, scheduled_date), enrollment:dmglp_enrollments(id, drug, indication_icd10, phase, start_date), prescription:dmglp_prescriptions(id, sku, directions, dispense:dmglp_dispenses(id))')
    .eq('id', params.id).maybeSingle()
  if (!v) notFound()
  dmglpAudit(me, 'read', 'dmglp_visits', v.id)

  const p = one(v.patient) as { id: string; first_name: string; last_name: string; hn: string | null; sex: string | null; birth_date: string | null }
  const appt = one(v.appointment) as { id: string; template_code: string | null; type: string; lab_panel: LabPanel | null; status: string; scheduled_date: string } | null
  const enr = one(v.enrollment) as { id: string; drug: DrugKey; indication_icd10: string; phase: string; start_date: string } | null
  const rx = one(v.prescription) as { id: string; sku: string; directions: string; dispense: { id: string }[] | null } | null
  const write = can(me.role, 'clinical.write')
  const doctor = can(me.role, 'doctor.decide')
  const closed = appt?.status === 'completed'

  const [labsRes, dispRes, prevVisitRes] = await Promise.all([
    supabaseAdmin.from('dmglp_labs').select('test_code, value, unit, collected_at').eq('visit_id', v.id).order('test_code'),
    supabaseAdmin.from('dmglp_dispenses').select('dispensed_at, prescription:dmglp_prescriptions(sku)').eq('patient_id', p.id).order('dispensed_at', { ascending: false }).limit(10),
    supabaseAdmin.from('dmglp_visits').select('visit_date, weight_kg, dose_decision, dose_mg').eq('patient_id', p.id).neq('id', v.id).order('visit_date', { ascending: false }).limit(1).maybeSingle(),
  ])
  const today = todayBkk()
  const lastDispense = dispRes.data?.[0]
  const lastSku = lastDispense ? (one(lastDispense.prescription) as { sku: string } | null)?.sku : null
  const currentDose = lastSku ? lastSku.split('-')[1] : null
  const daysSinceDispense = lastDispense ? daysBetween(toBkkDate(lastDispense.dispensed_at), today) : null
  const panelCodes = appt?.lab_panel ? [...LAB_PANELS[appt.lab_panel]] : ['HBA1C', 'FBS']
  const age = ageOn(p.birth_date, today)
  if (appt?.lab_panel === 'baseline' && p.sex === 'F' && age != null && age <= REPRODUCTIVE_AGE_MAX) panelCodes.push(UPT_CODE)
  const gi = (v.gi_side_effects ?? {}) as Record<string, boolean>
  const chk = (v.checklist ?? {}) as Record<string, boolean>
  const prev = prevVisitRes.data

  return (
    <>
      <PageHeader
        title={`การตรวจ ${appt?.template_code || ''} — ${p.first_name} ${p.last_name}`}
        subtitle={`HN ${p.hn || '-'} · ${dateTh(v.visit_date)} · ${appt ? `นัด ${dateTh(appt.scheduled_date)}` : 'ไม่มีนัด'} · ${enr ? `${DRUGS[enr.drug]?.label} · ${enr.indication_icd10}` : 'ยังไม่ลงทะเบียนโปรแกรมยา'}`}
        actions={<><Link href={`/dmglp/staff/patients/${p.id}`} className={btnSecondary}>โปรไฟล์ผู้ป่วย</Link>{appt && <Badge value={appt.status} />}</>}
      />
      <Flash searchParams={searchParams} />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Vitals + side effects + checklist */}
        <Card title="สัญญาณชีพ / อาการ / เช็กลิสต์">
          <form action={saveVisitVitals} className="space-y-3">
            <input type="hidden" name="visit_id" value={v.id} />
            <div className="grid grid-cols-4 gap-2">
              <Field name="weight_kg" labelText="น้ำหนัก kg" type="number" step="0.1" defaultValue={v.weight_kg} hint={prev?.weight_kg ? `ครั้งก่อน ${prev.weight_kg}` : undefined} />
              <Field name="bp_sys" labelText="SBP" type="number" defaultValue={v.bp_sys} />
              <Field name="bp_dia" labelText="DBP" type="number" defaultValue={v.bp_dia} />
              <Field name="pulse" labelText="ชีพจร" type="number" defaultValue={v.pulse} />
            </div>
            <div>
              <p className={label}>ผลข้างเคียงทางเดินอาหาร</p>
              <div className="grid grid-cols-2 gap-1">{GI.map(([k, l]) => <Check key={k} name={`gi_${k}`} labelText={l} defaultChecked={!!gi[k]} />)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field name="hypoglycemia_events" labelText="ครั้งที่น้ำตาลต่ำ (ตั้งแต่ครั้งก่อน)" type="number" min={0} defaultValue={v.hypoglycemia_events} />
              <Select name="injection_adherence" labelText="การฉีดยา" defaultValue={v.injection_adherence} options={[{ value: 'all', label: 'ฉีดครบทุกครั้ง' }, { value: 'missed_1', label: 'ลืม 1 ครั้ง' }, { value: 'missed_2plus', label: 'ลืม 2 ครั้งขึ้นไป' }]} />
            </div>
            <div>
              <p className={label}>เช็กลิสต์ประจำครั้ง</p>
              <div className="grid grid-cols-1 gap-1">{CHK.map(([k, l]) => <Check key={k} name={`chk_${k}`} labelText={l} defaultChecked={!!chk[k]} />)}</div>
            </div>
            <div><label className={label}>บันทึก</label><textarea name="note" rows={2} className={input} defaultValue={v.note ?? ''} /></div>
            {write && !closed && <button className={btn}>บันทึก</button>}
          </form>
        </Card>

        {/* Labs */}
        <Card title={`ผลแล็บ${appt?.lab_panel ? ` — ชุด ${appt.lab_panel}` : ''}`}>
          {(labsRes.data ?? []).length > 0 && (
            <ul className="text-sm mb-3 space-y-0.5">{(labsRes.data ?? []).map((l, i) => <li key={i} className="flex justify-between"><span>{LAB_LABELS[l.test_code] || l.test_code}</span><span className="font-semibold">{l.value} {l.unit || ''}</span></li>)}</ul>
          )}
          {write && !closed && (
            <form action={saveLabs} className="space-y-2">
              <input type="hidden" name="visit_id" value={v.id} /><input type="hidden" name="patient_id" value={p.id} />
              <Field name="collected_at" labelText="วันที่เก็บตัวอย่าง" type="date" required defaultValue={v.visit_date} />
              <div className="grid grid-cols-2 gap-2">
                {panelCodes.map(code => (
                  <div key={code}>
                    <input type="hidden" name="lab_code" value={code} />
                    <Field name={`lab_${code}`} labelText={LAB_LABELS[code] || code} type="number" step="0.01" />
                  </div>
                ))}
              </div>
              <button className={btnSecondary}>บันทึกผลแล็บ</button>
            </form>
          )}
        </Card>

        {/* Dose decision (doctor) */}
        <Card title="การตัดสินใจเรื่องยา (แพทย์)">
          {v.dose_decision ? (
            <div className="text-sm mb-3">
              <p>ตัดสินใจ: <span className="font-semibold">{v.dose_decision}</span>{v.dose_mg ? ` ${v.dose_mg} mg` : ''}</p>
              {(v.flags as string[]).length > 0 && <p className="text-amber-700 text-xs mt-1">คำเตือนที่รับทราบ: {(v.flags as string[]).map(f => TITRATION_FLAG_LABELS_TH[f as keyof typeof TITRATION_FLAG_LABELS_TH] || f).join('; ')}</p>}
              {rx && <p className="text-xs text-gray-500 mt-1">ใบสั่งยา {rx.sku} · {rx.dispense?.length ? 'จ่ายแล้ว' : 'รอเภสัชกรจ่าย'}</p>}
            </div>
          ) : null}
          <div className="text-xs text-gray-500 mb-3 space-y-0.5">
            <p>ขนาดปัจจุบัน (จากการจ่ายครั้งล่าสุด): <b>{currentDose ? `${currentDose} mg` : 'ยังไม่เคยจ่าย'}</b>{daysSinceDispense != null ? ` · ${daysSinceDispense} วันที่แล้ว` : ''}</p>
            {enr && <p>ขั้นขนาดยาของ {DRUGS[enr.drug].label}: {DRUGS[enr.drug].steps_mg.join(' → ')} mg · อย่างน้อย {DRUGS[enr.drug].min_days_per_step} วันต่อขั้น</p>}
            <p className="text-gray-400">ระบบแสดงเฉพาะคำเตือน ไม่แนะนำขนาดยา</p>
          </div>
          {doctor && !v.dose_decision && !closed && (
            !enr ? <p className="text-sm text-red-600">ต้องลงทะเบียนโปรแกรมยา (ข้อบ่งใช้ + ICD-10) ที่หน้าโปรไฟล์ก่อน</p> : (
              <form action={saveDoseDecision} className="space-y-2">
                <input type="hidden" name="visit_id" value={v.id} />
                <Select name="dose_decision" labelText="การตัดสินใจ" required options={[{ value: 'start', label: 'เริ่มยา' }, { value: 'keep', label: 'คงขนาดเดิม' }, { value: 'increase', label: 'ปรับขึ้น' }, { value: 'decrease', label: 'ปรับลง' }, { value: 'hold', label: 'พักยา (ไม่สั่งครั้งนี้)' }, { value: 'stop', label: 'หยุดยา' }]} />
                <Select name="dose_mg" labelText="ขนาดยา (mg) — 1 ปากกา" options={DRUGS[enr.drug].steps_mg.map(s => ({ value: String(s), label: `${s} mg` }))} defaultValue={currentDose} />
                <Field name="directions" labelText="วิธีใช้" defaultValue="ฉีดใต้ผิวหนังสัปดาห์ละ 1 ครั้ง วันเดิมทุกสัปดาห์" />
                <Field name="stop_reason" labelText="เหตุผล (กรณีหยุดยา)" />
                <Check name="acknowledge_flags" labelText="แพทย์รับทราบคำเตือนการปรับยา (ถ้ามี) และยืนยันการตัดสินใจนี้" />
                <button className={btn}>บันทึกการตัดสินใจ / ออกใบสั่งยา</button>
              </form>
            )
          )}
          {!doctor && !v.dose_decision && <p className="text-sm text-gray-400">รอแพทย์</p>}
        </Card>

        {/* Close visit */}
        <Card title="ปิดการตรวจ">
          <p className="text-sm text-gray-600 mb-3">ปิดแล้วระบบจะหักสิทธิ์โปรแกรม (ค่าแพทย์/ติดตาม/แล็บของครั้งนี้) ถ้ามีแพ็กเกจ รายการที่เกินสิทธิ์จะระบุให้การเงินคิดเงินตามราคาปกติ ค่าบริการโรงพยาบาลคิดทุกครั้ง</p>
          {write && !closed ? (
            <form action={completeVisit} className="space-y-2">
              <input type="hidden" name="visit_id" value={v.id} />
              <p className={label}>บริการเพิ่มเติมครั้งนี้</p>
              <Check name="extra_item" value="SVC-TANITA" labelText="วัดองค์ประกอบร่างกาย (TANITA)" />
              <Check name="extra_item" value="SVC-NUTRI" labelText="ปรึกษานักกำหนดอาหาร" />
              <Check name="extra_item" value="SVC-CGM" labelText="ติด CGM 14 วัน" />
              <button className={btn}>ปิดการตรวจ</button>
            </form>
          ) : closed ? <Badge value="completed" /> : null}
        </Card>
      </div>
    </>
  )
}
