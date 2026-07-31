'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Fix a misspelled name on an already-issued certificate. The cert number,
// token, and verify code stay the same; only the printed name changes, and the
// change is written to the correction audit log server-side.
export default function CorrectNameButton({ certId, currentName }: { certId: string; currentName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentName)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/certs/${certId}/correct-name`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, reason }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error || 'แก้ชื่อไม่สำเร็จ'); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:border-forest">แก้ชื่อ</button>
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 w-full">
      <p className="text-sm font-medium text-amber-700">แก้ชื่อบนใบรับรอง (บันทึกประวัติการแก้ไข)</p>
      <div>
        <label className="text-xs text-gray-500 block mb-1">ชื่อที่ถูกต้อง</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">เหตุผล (ไม่บังคับ)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น สะกดผิดตอนกรอก" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !name.trim() || name.trim() === currentName} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{busy ? '...' : 'บันทึกการแก้ชื่อ'}</button>
        <button onClick={() => { setOpen(false); setName(currentName) }} className="px-4 py-2 rounded-lg text-sm text-gray-500">ยกเลิก</button>
      </div>
    </div>
  )
}
