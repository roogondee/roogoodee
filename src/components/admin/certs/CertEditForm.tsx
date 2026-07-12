'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CertType, CertExam, CertDiseaseItem, FitStatus, MedicalCertificate } from '@/lib/certs/types'
import type { LabAnalyte } from '@/lib/lab/types'
import CertTypeFields from './CertTypeFields'
import PhotoUpload from './PhotoUpload'
import LabValuesEditor, { toAnalytes, type LabRow } from './LabValuesEditor'

const FIT_OPTIONS: { value: FitStatus; label: string }[] = [
  { value: 'normal', label: 'สุขภาพปกติ' },
  { value: 'fit', label: 'เหมาะสมกับงาน (Fit)' },
  { value: 'fit_with_condition', label: 'ทำงานได้โดยมีเงื่อนไข' },
  { value: 'unfit', label: 'ไม่เหมาะสม (Unfit)' },
]

function analytesToRows(analytes: LabAnalyte[]): LabRow[] {
  return analytes.map((a) => ({ test_name: a.test_name, value: a.value, unit: a.unit, reference_range: a.reference_range, flag: a.flag }))
}

export default function CertEditForm({ cert }: { cert: MedicalCertificate }) {
  const router = useRouter()
  const certType = cert.cert_type as CertType
  const [photoPath, setPhotoPath] = useState<string | null>(cert.photo_path ?? null)
  const [visitDate, setVisitDate] = useState(cert.visit_date)
  const [exam, setExam] = useState<CertExam>(cert.exam ?? {})
  const [diseaseItems, setDiseaseItems] = useState<CertDiseaseItem[]>(cert.disease_items ?? [])
  const [labRows, setLabRows] = useState<LabRow[]>(analytesToRows(cert.lab_analytes ?? []))
  const [fitStatus, setFitStatus] = useState<FitStatus | ''>(cert.fit_status ?? '')
  const [summary, setSummary] = useState(cert.summary ?? '')
  const [doctorName, setDoctorName] = useState(cert.doctor_name ?? '')
  const [doctorLicense, setDoctorLicense] = useState(cert.doctor_license ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/certs/${cert.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visit_date: visitDate, photo_path: photoPath, exam, disease_items: diseaseItems,
        lab_analytes: toAnalytes(labRows), fit_status: fitStatus || null, summary: summary || null,
        doctor_name: doctorName || null, doctor_license: doctorLicense || null,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
    router.push(`/admin/certs/${cert.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="font-display text-2xl text-forest">แก้ไขใบรับรอง (ฉบับร่าง)</h1>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <label className="block max-w-xs">
          <span className="block text-xs text-gray-500 mb-1">วันที่ตรวจ</span>
          <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </label>
        <PhotoUpload value={photoPath} onChange={setPhotoPath} />
      </section>

      <section className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-forest mb-3">ผลการตรวจ</h2>
        <CertTypeFields certType={certType} exam={exam} onExam={setExam} diseaseItems={diseaseItems} onDiseaseItems={setDiseaseItems} />
      </section>

      <section className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="font-semibold text-forest mb-3">ผล Lab</h2>
        <LabValuesEditor rows={labRows} onChange={setLabRows} />
      </section>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <label className="block">
          <span className="block text-xs text-gray-500 mb-1">สรุปผล (Fit status)</span>
          <select value={fitStatus} onChange={(e) => setFitStatus(e.target.value as FitStatus | '')} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">— ไม่ระบุ —</option>
            {FIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="ความเห็นแพทย์" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="ชื่อแพทย์ผู้ตรวจ" className="border rounded-lg px-3 py-2 text-sm" />
          <input value={doctorLicense} onChange={(e) => setDoctorLicense(e.target.value)} placeholder="เลขใบอนุญาต (ว.)" className="border rounded-lg px-3 py-2 text-sm" />
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="bg-forest text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        <button onClick={() => router.push(`/admin/certs/${cert.id}`)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500">ยกเลิก</button>
      </div>
    </div>
  )
}
