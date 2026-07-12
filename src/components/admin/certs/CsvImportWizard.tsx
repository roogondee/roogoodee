'use client'

import { useState } from 'react'
import { CERT_TYPE_LABEL, type CertType } from '@/lib/certs/types'

const CERT_TYPES: CertType[] = ['general', 'annual_checkup', 'risk_based', 'work_permit']

interface PreviewRow { row: number; name: string; national_id_masked: string; visit_date: string; labs: number }
interface RowError { row: number; field: string; message_th: string }

export default function CsvImportWizard() {
  const [file, setFile] = useState<File | null>(null)
  const [defaults, setDefaults] = useState({ cert_type: 'work_permit' as CertType, visit_date: '', doctor_name: '', doctor_license: '', employer_name: '' })
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [errors, setErrors] = useState<RowError[]>([])
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [committed, setCommitted] = useState<{ batch_id: string; success_count: number; error_count: number } | null>(null)

  async function run(mode: 'validate' | 'commit') {
    if (!file) { setMessage('กรุณาเลือกไฟล์ CSV'); return }
    setBusy(true); setMessage('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mode', mode)
    fd.append('defaults', JSON.stringify(defaults))
    const res = await fetch('/api/admin/certs/import', { method: 'POST', body: fd })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setMessage(data.error || 'เกิดข้อผิดพลาด'); if (data.errors) setErrors(data.errors); return }
    if (mode === 'validate') {
      setPreview(data.preview); setErrors(data.errors ?? []); setUnknownHeaders(data.unknownHeaders ?? [])
    } else {
      setCommitted({ batch_id: data.batch_id, success_count: data.success_count, error_count: data.error_count })
      setErrors(data.errors ?? [])
    }
  }

  const hasErrors = errors.length > 0

  if (committed) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h2 className="font-display text-xl text-forest">นำเข้าสำเร็จ</h2>
        <p className="text-sm text-gray-600">ออกใบรับรอง {committed.success_count} ฉบับ{committed.error_count > 0 ? ` · ล้มเหลว ${committed.error_count}` : ''}</p>
        <div className="flex gap-2 justify-center">
          <a href={`/api/admin/certs/import/${committed.batch_id}/pdf`} className="bg-forest text-white px-5 py-2.5 rounded-xl text-sm">ดาวน์โหลด PDF ทั้งชุด</a>
          <a href="/admin/certs?status=issued" className="border border-gray-200 px-5 py-2.5 rounded-xl text-sm text-gray-600">ดูรายการ</a>
        </div>
        {errors.length > 0 && (
          <ul className="text-left text-xs text-red-600 mt-3">{errors.map((e, i) => <li key={i}>แถว {e.row}: {e.message_th}</li>)}</ul>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Batch defaults */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <h2 className="font-semibold text-forest">ตั้งค่าทั้งชุด</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">ประเภทใบรับรอง</span>
            <select value={defaults.cert_type} onChange={(e) => setDefaults({ ...defaults, cert_type: e.target.value as CertType })} className="w-full border rounded-lg px-3 py-2 text-sm">
              {CERT_TYPES.map((t) => <option key={t} value={t}>{CERT_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">วันที่ตรวจ (ค่าเริ่มต้น หากไม่มีในไฟล์)</span>
            <input type="date" value={defaults.visit_date} onChange={(e) => setDefaults({ ...defaults, visit_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          <input placeholder="ชื่อแพทย์ผู้รับรอง" value={defaults.doctor_name} onChange={(e) => setDefaults({ ...defaults, doctor_name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="เลขใบอนุญาต (ว.)" value={defaults.doctor_license} onChange={(e) => setDefaults({ ...defaults, doctor_license: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="นายจ้าง (ถ้ามี)" value={defaults.employer_name} onChange={(e) => setDefaults({ ...defaults, employer_name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
        </div>
      </section>

      {/* File */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <h2 className="font-semibold text-forest">ไฟล์ CSV</h2>
        <p className="text-xs text-gray-500">ส่งออกจาก Excel เป็น &quot;CSV UTF-8&quot; · คอลัมน์: name, id_type, national_id/passport_no, visit_date, weight_kg, height_cm, bp_sys, bp_dia, pulse, fit_status, summary และ lab แบบ <code>lab:FBS</code>, <code>lab:HIV</code></p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setErrors([]) }} className="text-sm" />
        <div className="flex gap-2">
          <button onClick={() => run('validate')} disabled={busy || !file} className="bg-forest text-white px-5 py-2.5 rounded-xl text-sm disabled:opacity-50">{busy ? '...' : 'ตรวจสอบไฟล์'}</button>
          {preview && !hasErrors && <button onClick={() => run('commit')} disabled={busy} className="bg-mint text-white px-5 py-2.5 rounded-xl text-sm disabled:opacity-50">ออกใบรับรองทั้งชุด →</button>}
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
        {unknownHeaders.length > 0 && <p className="text-xs text-amber-600">คอลัมน์ที่ไม่รู้จัก (ข้าม): {unknownHeaders.join(', ')}</p>}
      </section>

      {/* Preview */}
      {preview && (
        <section className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-forest">ตัวอย่างข้อมูล ({preview.length} แถว)</h2>
            {hasErrors ? <span className="text-sm text-red-600">พบข้อผิดพลาด {errors.length} จุด — แก้ไขก่อน</span> : <span className="text-sm text-green-600">ผ่านการตรวจสอบ ✓</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 pr-3">แถว</th><th className="py-2 pr-3">ชื่อ</th><th className="py-2 pr-3">เลข (4 ท้าย)</th><th className="py-2 pr-3">วันตรวจ</th><th className="py-2">Lab</th></tr></thead>
              <tbody>
                {preview.map((r) => {
                  const rowErrs = errors.filter((e) => e.row === r.row)
                  return (
                    <tr key={r.row} className={`border-b border-gray-50 ${rowErrs.length ? 'bg-red-50' : ''}`}>
                      <td className="py-2 pr-3 text-gray-400">{r.row}</td>
                      <td className="py-2 pr-3 font-medium text-forest">{r.name || '—'}{rowErrs.length > 0 && <span className="block text-xs text-red-600">{rowErrs.map((e) => e.message_th).join(', ')}</span>}</td>
                      <td className="py-2 pr-3">…{r.national_id_masked}</td>
                      <td className="py-2 pr-3">{r.visit_date}</td>
                      <td className="py-2">{r.labs}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
