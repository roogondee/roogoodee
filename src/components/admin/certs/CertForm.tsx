'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CERT_TYPE_LABEL, seedDiseaseItems, type CertType, type CertExam, type CertDiseaseItem, type FitStatus } from '@/lib/certs/types'
import CertTypeFields from './CertTypeFields'
import PhotoUpload from './PhotoUpload'
import LabValuesEditor, { toAnalytes, type LabRow } from './LabValuesEditor'

interface Patient { id: string; name: string; phone?: string | null; consent_pdpa?: boolean }

const CERT_TYPES: CertType[] = ['general', 'annual_checkup', 'risk_based', 'work_permit']
const FIT_OPTIONS: { value: FitStatus; label: string }[] = [
  { value: 'normal', label: 'สุขภาพปกติ' },
  { value: 'fit', label: 'เหมาะสมกับงาน (Fit)' },
  { value: 'fit_with_condition', label: 'ทำงานได้โดยมีเงื่อนไข' },
  { value: 'unfit', label: 'ไม่เหมาะสม (Unfit)' },
]

export default function CertForm({ doctorDefault }: { doctorDefault?: { name?: string | null; license?: string | null } }) {
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [creating, setCreating] = useState(false)
  const [newP, setNewP] = useState({ name: '', id_type: 'thai_id', national_id: '', nationality: '', phone: '', dob: '', gender: '', consent_pdpa: false })

  const [certType, setCertType] = useState<CertType>('general')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10))
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [exam, setExam] = useState<CertExam>({})
  const [diseaseItems, setDiseaseItems] = useState<CertDiseaseItem[]>(seedDiseaseItems('general'))
  const [labRows, setLabRows] = useState<LabRow[]>([])
  const [fitStatus, setFitStatus] = useState<FitStatus | ''>('')
  const [summary, setSummary] = useState('')
  const [doctorName, setDoctorName] = useState(doctorDefault?.name ?? '')
  const [doctorLicense, setDoctorLicense] = useState(doctorDefault?.license ?? '')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function changeType(t: CertType) {
    setCertType(t)
    setDiseaseItems(seedDiseaseItems(t))
  }

  async function search() {
    const res = await fetch(`/api/admin/lab/patients?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.patients ?? [])
  }

  async function createPatient() {
    setError('')
    const res = await fetch('/api/admin/lab/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newP),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'สร้างคนไข้ไม่สำเร็จ'); return }
    setPatient({ ...data.patient, consent_pdpa: data.patient.consent_pdpa ?? newP.consent_pdpa })
    setCreating(false)
  }

  async function saveDraft() {
    if (!patient) { setError('กรุณาเลือกหรือเพิ่มคนไข้ก่อน'); return }
    setBusy(true); setError('')
    const res = await fetch('/api/admin/certs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patient.id, cert_type: certType, visit_date: visitDate,
        photo_path: photoPath, exam, disease_items: diseaseItems,
        lab_analytes: toAnalytes(labRows), fit_status: fitStatus || null,
        summary: summary || null, doctor_name: doctorName || null, doctor_license: doctorLicense || null,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
    router.push(`/admin/certs/${data.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="font-display text-2xl text-forest">ออกใบรับรองแพทย์</h1>

      {/* 1. Patient */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-forest mb-3">1. เลือกคนไข้</h2>
        {patient ? (
          <div className="flex items-center justify-between bg-mint/5 border border-mint/30 rounded-xl px-4 py-3">
            <div>
              <p className="font-medium text-forest">{patient.name}</p>
              {!patient.consent_pdpa && <p className="text-xs text-amber-600">⚠️ ยังไม่ได้ยินยอม PDPA — ต้องยินยอมก่อนออกใบรับรอง</p>}
            </div>
            <button onClick={() => setPatient(null)} className="text-sm text-gray-400 hover:text-gray-600">เปลี่ยน</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="ค้นหาชื่อ หรือเบอร์โทร" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={search} className="bg-forest text-white px-4 py-2 rounded-lg text-sm">ค้นหา</button>
            </div>
            {results.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-100">
                {results.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setPatient(p)} className="w-full text-left py-2 px-2 hover:bg-gray-50 rounded flex justify-between">
                      <span className="text-forest font-medium">{p.name}</span><span className="text-sm text-gray-400">{p.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setCreating(!creating)} className="mt-3 text-sm font-medium text-forest">{creating ? '− ปิด' : '+ เพิ่มคนไข้ใหม่'}</button>
            {creating && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input placeholder="ชื่อ-นามสกุล" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={newP.id_type} onChange={(e) => setNewP({ ...newP, id_type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="thai_id">บัตรประชาชน (ไทย)</option>
                  <option value="passport">Passport (ต่างด้าว)</option>
                  <option value="other">อื่นๆ</option>
                </select>
                <input placeholder={newP.id_type === 'thai_id' ? 'เลขบัตร 13 หลัก' : 'เลขพาสปอร์ต'} value={newP.national_id} onChange={(e) => setNewP({ ...newP, national_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="สัญชาติ เช่น TH, MM, KH" value={newP.nationality} onChange={(e) => setNewP({ ...newP, nationality: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="เบอร์โทร" value={newP.phone} onChange={(e) => setNewP({ ...newP, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={newP.dob} onChange={(e) => setNewP({ ...newP, dob: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={newP.gender} onChange={(e) => setNewP({ ...newP, gender: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">เพศ</option><option value="male">ชาย</option><option value="female">หญิง</option><option value="other">อื่นๆ</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={newP.consent_pdpa} onChange={(e) => setNewP({ ...newP, consent_pdpa: e.target.checked })} />
                  คนไข้ยินยอม PDPA
                </label>
                <button onClick={createPatient} className="bg-mint text-white px-4 py-2 rounded-lg text-sm sm:col-span-2">บันทึกคนไข้</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 2. Cert type + visit */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-forest mb-3">2. ประเภทและวันที่ตรวจ</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">ประเภทใบรับรอง</span>
            <select value={certType} onChange={(e) => changeType(e.target.value as CertType)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {CERT_TYPES.map((t) => <option key={t} value={t}>{CERT_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">วันที่ตรวจ</span>
            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-4"><PhotoUpload value={photoPath} onChange={setPhotoPath} /></div>
      </section>

      {/* 3. Exam + disease items */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-forest mb-3">3. ผลการตรวจ</h2>
        <CertTypeFields certType={certType} exam={exam} onExam={setExam} diseaseItems={diseaseItems} onDiseaseItems={setDiseaseItems} />
      </section>

      {/* 4. Lab */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-forest mb-3">4. ผล Lab</h2>
        <LabValuesEditor rows={labRows} onChange={setLabRows} />
      </section>

      {/* 5. Conclusion + doctor */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <h2 className="font-semibold text-forest">5. สรุปผลและแพทย์ผู้รับรอง</h2>
        <label className="block">
          <span className="block text-xs text-gray-500 mb-1">สรุปผล (Fit status)</span>
          <select value={fitStatus} onChange={(e) => setFitStatus(e.target.value as FitStatus | '')} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">— ไม่ระบุ —</option>
            {FIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="ความเห็นแพทย์ / สรุปผลเพิ่มเติม" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="ชื่อแพทย์ผู้ตรวจ" className="border rounded-lg px-3 py-2 text-sm" />
          <input value={doctorLicense} onChange={(e) => setDoctorLicense(e.target.value)} placeholder="เลขใบอนุญาตประกอบวิชาชีพเวชกรรม (ว.)" className="border rounded-lg px-3 py-2 text-sm" />
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={saveDraft} disabled={busy || !patient} className="bg-forest text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
          {busy ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง →'}
        </button>
        <span className="text-xs text-gray-400 self-center">บันทึกร่างก่อน แล้วออกใบรับรอง (issue) ในหน้าถัดไป</span>
      </div>
    </div>
  )
}
