'use client'

import type { CertType, CertDiseaseItem, CertExam } from '@/lib/certs/types'

const RESULTS: { value: CertDiseaseItem['result']; label: string }[] = [
  { value: 'normal', label: 'ปกติ/ไม่พบ' },
  { value: 'abnormal', label: 'ผิดปกติ/พบ' },
  { value: 'not_tested', label: 'ไม่ได้ตรวจ' },
]

export default function CertTypeFields({
  certType, exam, onExam, diseaseItems, onDiseaseItems,
}: {
  certType: CertType
  exam: CertExam
  onExam: (e: CertExam) => void
  diseaseItems: CertDiseaseItem[]
  onDiseaseItems: (items: CertDiseaseItem[]) => void
}) {
  function setExam(patch: Partial<CertExam>) { onExam({ ...exam, ...patch }) }
  function setItem(i: number, patch: Partial<CertDiseaseItem>) {
    onDiseaseItems(diseaseItems.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  const num = (v: string) => (v === '' ? undefined : Number(v))

  return (
    <div className="space-y-5">
      {/* Vitals — always shown */}
      <fieldset className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="น้ำหนัก (kg)"><input type="number" step="0.1" value={exam.weight_kg ?? ''} onChange={(e) => setExam({ weight_kg: num(e.target.value) })} className="input" /></Field>
        <Field label="ส่วนสูง (cm)"><input type="number" step="0.1" value={exam.height_cm ?? ''} onChange={(e) => setExam({ height_cm: num(e.target.value) })} className="input" /></Field>
        <Field label="BMI"><input type="number" step="0.1" value={exam.bmi ?? ''} onChange={(e) => setExam({ bmi: num(e.target.value) })} className="input" /></Field>
        <Field label="ความดัน SYS"><input type="number" value={exam.bp_sys ?? ''} onChange={(e) => setExam({ bp_sys: num(e.target.value) })} className="input" /></Field>
        <Field label="ความดัน DIA"><input type="number" value={exam.bp_dia ?? ''} onChange={(e) => setExam({ bp_dia: num(e.target.value) })} className="input" /></Field>
        <Field label="ชีพจร (/min)"><input type="number" value={exam.pulse ?? ''} onChange={(e) => setExam({ pulse: num(e.target.value) })} className="input" /></Field>
      </fieldset>

      {/* Work-permit-only: employer + work permit number */}
      {certType === 'work_permit' && (
        <fieldset className="grid grid-cols-2 gap-3">
          <Field label="นายจ้าง (Employer)"><input value={exam.employer_name ?? ''} onChange={(e) => setExam({ employer_name: e.target.value })} className="input" /></Field>
          <Field label="เลขใบอนุญาตทำงาน"><input value={exam.work_permit_no ?? ''} onChange={(e) => setExam({ work_permit_no: e.target.value })} className="input" /></Field>
        </fieldset>
      )}

      {/* Disease/screening checklist — general (5 diseases) or work_permit (9 items) */}
      {diseaseItems.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            {certType === 'work_permit' ? 'รายการตรวจคัดกรอง (Work Permit)' : 'คำประกาศโรค (แบบแพทยสภา)'}
          </p>
          <div className="space-y-2">
            {diseaseItems.map((it, i) => (
              <div key={it.key} className="flex items-center gap-3 flex-wrap">
                <span className="flex-1 min-w-[200px] text-sm text-forest">{it.label_th}</span>
                <select value={it.result} onChange={(e) => setItem(i, { result: e.target.value as CertDiseaseItem['result'] })} className="border rounded-lg px-2 py-1.5 text-sm">
                  {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {it.result === 'abnormal' && (
                  <input value={it.detail ?? ''} onChange={(e) => setItem(i, { detail: e.target.value })} placeholder="รายละเอียด" className="border rounded-lg px-2 py-1.5 text-sm w-40" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`.input{width:100%;border:1px solid #e5e7eb;border-radius:0.5rem;padding:0.375rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}
