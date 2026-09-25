import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp, can } from '@/lib/dmglp/roles'
import { dmglpAudit } from '@/lib/dmglp/audit'
import { DRUGS, LAB_LABELS, SURVEY_ITEMS, type DrugKey } from '@/lib/dmglp/config'
import { ELIGIBILITY_FLAG_LABELS_TH, suggestedDrugForIndications } from '@/lib/dmglp/eligibility'
import { programBalance } from '@/lib/dmglp/refund'
import { todayBkk, ageOn } from '@/lib/dmglp/dates'
import { cancelAppointment, createAppointment, enrollPatient, recordConsent, recordSurveyByStaff, rescheduleAppointment, stopEnrollment, updatePatient } from '../../actions'
import { Badge, Card, Check, Field, Flash, PageHeader, Select, Table, btn, btnSecondary, btnSmall, btnSmallSecondary, dateTh, dateTimeTh, input, label, one, td, baht } from '../../ui'

export const dynamic = 'force-dynamic'

export default async function PatientPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const me = await requireDmglp('patients.read')
  const clinical = can(me.role, 'clinical.read')
  const { data: p } = await supabaseAdmin
    .from('dmglp_patients')
    .select('id, hn, first_name, last_name, sex, birth_date, phone, line_user_id, lead_id, partner_id, created_at, lead:dmglp_leads(display_name, attribution:dmglp_attribution(ref_code, channel)), partner:dmglp_partners(name)')
    .eq('id', params.id).maybeSingle()
  if (!p) notFound()

  const [consents, screenings, enrollments, appointments, visits, labs, programs, dispenses, alerts, surveys] = await Promise.all([
    supabaseAdmin.from('dmglp_consents').select('kind, version, signed_at').eq('patient_id', p.id).order('signed_at'),
    clinical ? supabaseAdmin.from('dmglp_screenings').select('id, bmi, weight_kg, height_cm, has_t2dm, eligibility_status, flags, created_at').eq('patient_id', p.id).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
    supabaseAdmin.from('dmglp_enrollments').select('id, drug, indication_icd10, indication_note, start_date, phase, stop_reason, created_at, doctor:admin_users!dmglp_enrollments_confirmed_by_fkey(name, email)').eq('patient_id', p.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('dmglp_appointments').select('id, template_code, type, scheduled_date, status, lab_panel, drug_linked, visit:dmglp_visits(id)').eq('patient_id', p.id).order('scheduled_date'),
    clinical ? supabaseAdmin.from('dmglp_visits').select('id, visit_date, weight_kg, bp_sys, bp_dia, dose_decision, dose_mg, flags').eq('patient_id', p.id).order('visit_date', { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
    clinical ? supabaseAdmin.from('dmglp_labs').select('test_code, value, unit, collected_at').eq('patient_id', p.id).in('test_code', ['HBA1C', 'FBS', 'EGFR']).order('collected_at') : Promise.resolve({ data: [] }),
    supabaseAdmin.from('dmglp_programs').select('id, tier, price, amount_paid, payment_mode, purchased_at, expires_at, status, entitlements:dmglp_program_entitlements(item_code, qty), usage:dmglp_program_usage(item_code, qty)').eq('patient_id', p.id).order('purchased_at', { ascending: false }),
    clinical ? supabaseAdmin.from('dmglp_dispenses').select('id, dispensed_at, prescription:dmglp_prescriptions(sku)').eq('patient_id', p.id).order('dispensed_at', { ascending: false }) : Promise.resolve({ data: [] }),
    can(me.role, 'alerts.read') ? supabaseAdmin.from('dmglp_alerts').select('id, source, severity, message, status, created_at').eq('patient_id', p.id).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
    clinical ? supabaseAdmin.from('dmglp_surveys').select('id, red_flag, submitted_at, answers').eq('patient_id', p.id).order('submitted_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
  ])
  dmglpAudit(me, 'read', 'dmglp_patients', p.id)

  const lead = one(p.lead) as { display_name: string | null; attribution: unknown } | null
  const attribution = lead ? one(lead.attribution as { ref_code: string; channel: string | null } | { ref_code: string; channel: string | null }[] | null) : null
  const partner = one(p.partner) as { name: string } | null
  const latestScreening = screenings.data?.[0] as { id: string; bmi: number | null; eligibility_status: string; flags: string[]; has_t2dm: boolean } | undefined
  const activeEnrollment = (enrollments.data ?? []).find(e => e.phase !== 'stopped')
  const today = todayBkk()
  const age = ageOn(p.birth_date, today)
  const consentKinds = new Set((consents.data ?? []).map(c => c.kind))
  const upcoming = (appointments.data ?? []).filter(a => ['scheduled', 'rescheduled', 'missed', 'checked_in'].includes(a.status))
  const activeProgram = (programs.data ?? []).find(pr => pr.status === 'active')

  // HbA1c / weight trend for the timeline card.
  const hba1c = (labs.data ?? []).filter(l => l.test_code === 'HBA1C')
  const weights = (visits.data ?? []).filter(v => v.weight_kg != null).slice().reverse()

  return (
    <>
      <PageHeader
        title={`${p.first_name} ${p.last_name}`}
        subtitle={`HN ${p.hn || 'ยังไม่มี'} · ${p.sex === 'M' ? 'ชาย' : p.sex === 'F' ? 'หญิง' : '-'} · อายุ ${age ?? '-'} ปี · ${p.phone || 'ไม่มีเบอร์'} · ${p.line_user_id ? 'เชื่อม LINE แล้ว' : 'ยังไม่เชื่อม LINE'}${partner ? ` · จาก ${partner.name}` : ''}${attribution ? ` · ${attribution.ref_code} (${attribution.channel || '-'})` : ''}`}
        actions={clinical && can(me.role, 'clinical.write') ? <Link href={`/dmglp/staff/patients/${p.id}/screening`} className={btn}>คัดกรอง / ประเมินคุณสมบัติ</Link> : undefined}
      />
      <Flash searchParams={searchParams} />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Status strip */}
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs text-gray-500">คัดกรองล่าสุด</div>
              <div className="mt-1">{clinical ? <Badge value={latestScreening?.eligibility_status} /> : <span className="text-xs text-gray-400">ไม่มีสิทธิ์ดู</span>}</div>
              {latestScreening?.bmi != null && <div className="text-xs text-gray-500 mt-1">BMI {latestScreening.bmi}</div>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs text-gray-500">โปรแกรมยา</div>
              <div className="mt-1">{activeEnrollment ? <Badge value={activeEnrollment.phase} /> : <span className="text-xs text-gray-400">ยังไม่ลงทะเบียน</span>}</div>
              {activeEnrollment && clinical && <div className="text-xs text-gray-500 mt-1">{DRUGS[activeEnrollment.drug as DrugKey]?.label} · {activeEnrollment.indication_icd10}</div>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs text-gray-500">แพ็กเกจ</div>
              <div className="mt-1">{activeProgram ? <><Badge value={activeProgram.status} /> <span className="text-xs">{activeProgram.tier}</span></> : <span className="text-xs text-gray-400">จ่ายรายครั้ง</span>}</div>
              {activeProgram && <div className="text-xs text-gray-500 mt-1">หมดอายุ {dateTh(activeProgram.expires_at)}</div>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs text-gray-500">ปากกาที่จ่ายแล้ว</div>
              <div className="text-xl font-semibold text-forest mt-1">{clinical ? (dispenses.data?.length ?? 0) : '—'}</div>
              {clinical && dispenses.data?.[0] && <div className="text-xs text-gray-500">ล่าสุด {dateTh(dispenses.data[0].dispensed_at.slice(0, 10))}</div>}
            </div>
          </div>

          {/* Timeline */}
          <Card title="ตารางนัด">
            <Table head={['รหัส', 'วันที่', 'ประเภท', 'แล็บ', 'สถานะ', '']} empty={(appointments.data ?? []).length === 0}>
              {(appointments.data ?? []).map(a => {
                const visit = a.visit?.[0]
                const open = ['scheduled', 'rescheduled', 'missed'].includes(a.status)
                return (
                  <tr key={a.id} className={a.scheduled_date === today ? 'bg-emerald-50/50' : ''}>
                    <td className={td}>{a.template_code || '—'}</td>
                    <td className={td}>{dateTh(a.scheduled_date)}</td>
                    <td className={td}><Badge value={a.type} /></td>
                    <td className={td}>{a.lab_panel || '—'}</td>
                    <td className={td}><Badge value={a.status} /></td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      {visit && clinical && <Link href={`/dmglp/staff/visits/${visit.id}`} className="text-xs text-forest underline mr-2">การตรวจ</Link>}
                      {open && can(me.role, 'appointments.write') && (
                        <details className="inline-block text-left">
                          <summary className="text-xs text-forest underline cursor-pointer">เลื่อน/ยกเลิก</summary>
                          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-xl p-3 shadow-lg w-64 space-y-2">
                            <form action={rescheduleAppointment} className="space-y-2">
                              <input type="hidden" name="id" value={a.id} /><input type="hidden" name="patient_id" value={p.id} />
                              <input type="date" name="scheduled_date" defaultValue={a.scheduled_date} className={input} required />
                              {me.role === 'doctor' && a.drug_linked && <Check name="shift_later" labelText="ขยับนัดถัดไปที่ผูกกับยาตามไปด้วย" />}
                              <button className={btnSmall}>เลื่อนนัด</button>
                            </form>
                            <form action={cancelAppointment}>
                              <input type="hidden" name="id" value={a.id} /><input type="hidden" name="patient_id" value={p.id} />
                              <button className="text-xs text-red-600 underline">ยกเลิกนัดนี้</button>
                            </form>
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                )
              })}
            </Table>
            {can(me.role, 'appointments.write') && (
              <details className="mt-3">
                <summary className="text-sm text-forest cursor-pointer">+ เพิ่มนัดเพิ่มเติม</summary>
                <form action={createAppointment} className="grid sm:grid-cols-4 gap-2 mt-2 items-end">
                  <input type="hidden" name="patient_id" value={p.id} />
                  <Select name="type" labelText="ประเภท" required options={[{ value: 'specialist_visit', label: 'พบแพทย์เฉพาะทาง' }, { value: 'followup_visit', label: 'ติดตามผล' }, { value: 'lab_only', label: 'เจาะเลือด' }, { value: 'line_followup', label: 'ติดตามทาง LINE' }]} />
                  <Field name="scheduled_date" labelText="วันที่" type="date" required defaultValue={today} />
                  <Field name="note" labelText="หมายเหตุ" />
                  <button className={btn}>เพิ่มนัด</button>
                </form>
              </details>
            )}
          </Card>

          {clinical && (
            <Card title="แนวโน้ม HbA1c / น้ำหนัก">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">HbA1c (%)</div>
                  {hba1c.length === 0 ? <p className="text-gray-400 text-xs">ยังไม่มีผล</p> : (
                    <ul className="space-y-0.5">{hba1c.map((l, i) => <li key={i} className="flex justify-between"><span>{dateTh(l.collected_at)}</span><span className="font-semibold">{l.value}</span></li>)}</ul>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">น้ำหนัก (kg)</div>
                  {weights.length === 0 ? <p className="text-gray-400 text-xs">ยังไม่มีข้อมูล</p> : (
                    <ul className="space-y-0.5">{weights.map(v => <li key={v.id} className="flex justify-between"><span>{dateTh(v.visit_date)}</span><span className="font-semibold">{v.weight_kg}{weights[0].weight_kg && v.weight_kg ? <span className="text-xs text-gray-400 ml-1">({(((Number(v.weight_kg) - Number(weights[0].weight_kg)) / Number(weights[0].weight_kg)) * 100).toFixed(1)}%)</span> : null}</span></li>)}</ul>
                  )}
                </div>
              </div>
            </Card>
          )}

          {clinical && (
            <Card title="ประวัติการตรวจ">
              <Table head={['วันที่', 'น้ำหนัก', 'ความดัน', 'การตัดสินใจ', 'คำเตือน', '']} empty={(visits.data ?? []).length === 0}>
                {(visits.data ?? []).map(v => (
                  <tr key={v.id}>
                    <td className={td}>{dateTh(v.visit_date)}</td>
                    <td className={td}>{v.weight_kg ?? '—'}</td>
                    <td className={td}>{v.bp_sys ? `${v.bp_sys}/${v.bp_dia}` : '—'}</td>
                    <td className={td}>{v.dose_decision ? `${v.dose_decision}${v.dose_mg ? ` ${v.dose_mg} mg` : ''}` : '—'}</td>
                    <td className={`${td} text-xs text-amber-700`}>{(v.flags ?? []).join(', ') || '—'}</td>
                    <td className={`${td} text-right`}><Link href={`/dmglp/staff/visits/${v.id}`} className="text-xs text-forest underline">เปิด</Link></td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}

          {clinical && (screenings.data ?? []).length > 0 && (
            <Card title="ประวัติคัดกรอง">
              <Table head={['วันที่', 'BMI', 'T2DM', 'ผล', 'ธง']}>
                {(screenings.data ?? []).map(s => (
                  <tr key={s.id}>
                    <td className={td}>{dateTimeTh(s.created_at)}</td>
                    <td className={td}>{s.bmi ?? '—'}</td>
                    <td className={td}>{s.has_t2dm ? 'ใช่' : '—'}</td>
                    <td className={td}><Badge value={s.eligibility_status} /></td>
                    <td className={`${td} text-xs`}>{(s.flags as string[]).map(f => ELIGIBILITY_FLAG_LABELS_TH[f] || f).join('; ') || '—'}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {/* Enrollment (doctor) */}
          {can(me.role, 'doctor.decide') && !activeEnrollment && (
            <Card title="ลงทะเบียนโปรแกรมยา (แพทย์ยืนยันข้อบ่งใช้)">
              {!latestScreening ? (
                <p className="text-sm text-gray-500">ต้องคัดกรองก่อน</p>
              ) : latestScreening.eligibility_status === 'ineligible' ? (
                <p className="text-sm text-red-600">ผลคัดกรองล่าสุดไม่เข้าเกณฑ์ — ลงทะเบียนไม่ได้</p>
              ) : (
                <form action={enrollPatient} className="space-y-3">
                  <input type="hidden" name="patient_id" value={p.id} />
                  {latestScreening.eligibility_status === 'needs_review' && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">มีข้อควรระวัง: {(latestScreening.flags as string[]).map(f => ELIGIBILITY_FLAG_LABELS_TH[f] || f).join('; ')}</p>
                  )}
                  <Select name="drug" labelText="ยา" required defaultValue={suggestedDrugForIndications(latestScreening.has_t2dm ? ['t2dm'] : ['obesity']) || ''} options={Object.entries(DRUGS).map(([k, v]) => ({ value: k, label: v.label }))} />
                  <Field name="indication_icd10" labelText="ข้อบ่งใช้ ICD-10" required placeholder="E11.9 / E66.0" hint="T2DM = E11.x, โรคอ้วน = E66.x" />
                  <Field name="indication_note" labelText="บันทึกข้อบ่งใช้" />
                  <Field name="start_date" labelText="วันเริ่ม (Day 0)" type="date" required defaultValue={today} />
                  <p className="text-xs text-gray-500">ระบบจะสร้างนัด D0, D3, D7, W4, W8, W12, W16, W20, W24 อัตโนมัติ ระบบไม่แนะนำขนาดยา — การตัดสินใจทุกครั้งบันทึกเป็นของแพทย์</p>
                  <button className={btn}>ยืนยันและสร้างตารางนัด</button>
                </form>
              )}
            </Card>
          )}
          {activeEnrollment && can(me.role, 'doctor.decide') && (
            <Card title="สถานะโปรแกรมยา">
              <p className="text-sm mb-2"><Badge value={activeEnrollment.phase} /> เริ่ม {dateTh(activeEnrollment.start_date)} · {activeEnrollment.indication_icd10}</p>
              <p className="text-xs text-gray-500 mb-3">ยืนยันโดย {(one(activeEnrollment.doctor) as { name: string | null; email: string } | null)?.name || (one(activeEnrollment.doctor) as { email: string } | null)?.email}</p>
              <form action={stopEnrollment} className="space-y-2">
                <input type="hidden" name="patient_id" value={p.id} /><input type="hidden" name="enrollment_id" value={activeEnrollment.id} />
                <Select name="phase" labelText="เปลี่ยนระยะ" required options={[{ value: 'maintenance', label: 'เข้าสู่ระยะคงที่ (สร้างนัดรายเดือน 12 เดือน)' }, { value: 'maintenance_program', label: 'โปรแกรมต่อเนื่อง' }, { value: 'stopped', label: 'หยุดยา' }]} />
                <Field name="stop_reason" labelText="เหตุผล (กรณีหยุดยา)" />
                <button className={btnSecondary}>บันทึก</button>
              </form>
            </Card>
          )}

          {/* Program balance */}
          {activeProgram && (
            <Card title={`สิทธิ์คงเหลือ — ${activeProgram.tier}`}>
              <ul className="text-sm space-y-1">
                {programBalance(activeProgram.entitlements ?? [], activeProgram.usage ?? []).map(b => (
                  <li key={b.item_code} className="flex justify-between"><span>{b.item_code}</span><span className={b.remaining === 0 ? 'text-gray-400' : 'font-semibold'}>{b.remaining}/{b.entitled}</span></li>
                ))}
              </ul>
              {can(me.role, 'finance.read') && <p className="text-xs text-gray-500 mt-2">ชำระแล้ว {baht(activeProgram.amount_paid)} / {baht(activeProgram.price)}</p>}
            </Card>
          )}

          {/* Alerts */}
          {can(me.role, 'alerts.read') && (alerts.data ?? []).length > 0 && (
            <Card title="แจ้งเตือนล่าสุด">
              <ul className="space-y-2 text-sm">
                {(alerts.data ?? []).map(a => (
                  <li key={a.id} className="border-b border-gray-100 pb-2"><Badge value={a.severity} /> <Badge value={a.status} /><div className="mt-1 text-gray-700">{a.message}</div><div className="text-xs text-gray-400">{dateTimeTh(a.created_at)}</div></li>
                ))}
              </ul>
            </Card>
          )}

          {/* Consents + identity */}
          <Card title="ความยินยอม">
            <ul className="text-sm space-y-1 mb-3">
              {['pdpa', 'treatment', 'program_terms'].map(k => (
                <li key={k} className="flex justify-between"><span>{k}</span>{consentKinds.has(k) ? <span className="text-emerald-700 text-xs">ลงนามแล้ว</span> : <span className="text-gray-400 text-xs">ยังไม่มี</span>}</li>
              ))}
            </ul>
            {can(me.role, 'patients.write') && (
              <form action={recordConsent} className="flex gap-2 items-end">
                <input type="hidden" name="patient_id" value={p.id} />
                <Select name="kind" labelText="บันทึกความยินยอม" required options={[{ value: 'pdpa', label: 'PDPA' }, { value: 'treatment', label: 'การรักษา' }, { value: 'program_terms', label: 'เงื่อนไขโปรแกรม' }]} />
                <button className={btnSmallSecondary}>บันทึก</button>
              </form>
            )}
          </Card>

          {can(me.role, 'patients.write') && (
            <Card title="แก้ไขข้อมูลผู้ป่วย">
              <form action={updatePatient} className="space-y-2">
                <input type="hidden" name="id" value={p.id} />
                <Field name="hn" labelText="HN" defaultValue={p.hn} />
                <Field name="phone" labelText="เบอร์โทร" defaultValue={p.phone} />
                <div className="grid grid-cols-2 gap-2">
                  <Select name="sex" labelText="เพศ" defaultValue={p.sex} options={[{ value: 'M', label: 'ชาย' }, { value: 'F', label: 'หญิง' }]} />
                  <Field name="birth_date" labelText="วันเกิด" type="date" defaultValue={p.birth_date} />
                </div>
                <Field name="line_user_id" labelText="LINE userId" defaultValue={p.line_user_id} hint="เติมอัตโนมัติเมื่อ lead ทัก LINE ด้วยรหัส DM-xxxx" />
                <button className={btnSmallSecondary}>บันทึก</button>
              </form>
            </Card>
          )}

          {clinical && can(me.role, 'clinical.write') && (
            <Card title="แบบสอบถามอาการ (บันทึกแทนผู้ป่วย)">
              <form action={recordSurveyByStaff} className="space-y-1">
                <input type="hidden" name="patient_id" value={p.id} />
                {SURVEY_ITEMS.map(i => <Check key={i.key} name={`s_${i.key}`} labelText={`${i.redFlag ? '🚩 ' : ''}${i.labelTh}`} />)}
                <div className="pt-1"><label className={label}>อื่น ๆ</label><textarea name="free_text" rows={2} className={input} /></div>
                <button className={btnSmallSecondary}>บันทึก</button>
              </form>
              {(surveys.data ?? []).length > 0 && (
                <ul className="text-xs text-gray-500 mt-3 space-y-1">{(surveys.data ?? []).map(s => <li key={s.id}>{dateTimeTh(s.submitted_at)} {s.red_flag ? <span className="text-red-600 font-semibold">พบอาการเตือน</span> : 'ปกติ'}</li>)}</ul>
              )}
            </Card>
          )}

          {clinical && (
            <Card title="ผลแล็บล่าสุด">
              <ul className="text-sm space-y-1">
                {['HBA1C', 'FBS', 'EGFR'].map(code => {
                  const last = (labs.data ?? []).filter(l => l.test_code === code).slice(-1)[0]
                  return <li key={code} className="flex justify-between"><span>{LAB_LABELS[code]}</span><span>{last ? `${last.value} (${dateTh(last.collected_at)})` : '—'}</span></li>
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
