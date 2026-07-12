'use client'

import { useState } from 'react'

export default function PhotoUpload({ value, onChange }: { value: string | null; onChange: (path: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File) {
    setBusy(true); setError('')
    setPreview(URL.createObjectURL(file))
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/certs/photo', { method: 'POST', body: fd })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error || 'อัปโหลดไม่สำเร็จ'); return }
    onChange(data.path)
  }

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">รูปถ่ายคนไข้</label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : value ? <span className="text-xs text-green-600">✓ อัปโหลดแล้ว</span> : <span className="text-2xl text-gray-300">👤</span>}
        </div>
        <div>
          <input type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            className="text-sm" />
          {busy && <p className="text-xs text-gray-400 mt-1">กำลังอัปโหลด...</p>}
          {value && <button type="button" onClick={() => { onChange(null); setPreview(null) }} className="text-xs text-red-500 mt-1 block">ลบรูป</button>}
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  )
}
