'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Upload one or more lab files; each is interpreted into a pending_review
// report. Supports multi-year backfill (select several files at once).
export default function LabUploader({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true); setError('')
    const list = Array.from(files)
    let lastReportId = ''
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i]
        setStatus(`กำลังอ่านไฟล์ ${i + 1}/${list.length}: ${file.name}`)
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch('/api/admin/lab/upload', { method: 'POST', body: fd })
        const upData = await up.json()
        if (!up.ok) throw new Error(upData.error || 'อัปโหลดไม่สำเร็จ')

        const res = await fetch('/api/admin/lab/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, path: upData.path, contentType: upData.contentType }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'แปลผลไม่สำเร็จ')
        lastReportId = data.report.id
      }
      setStatus('เสร็จแล้ว')
      if (list.length === 1 && lastReportId) {
        router.push(`/admin/lab/${patientId}/${lastReportId}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <label className="block">
        <span className="text-sm font-medium text-forest">อัปโหลดผลแลป (รูป หรือ PDF — เลือกหลายไฟล์ได้)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          disabled={busy}
          onChange={(e) => handleFiles(e.target.files)}
          className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-forest file:text-white file:px-4 file:py-2 file:text-sm"
        />
      </label>
      {busy && <p className="text-sm text-sage mt-3 animate-pulse">{status}</p>}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}
