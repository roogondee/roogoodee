'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Issues a draft cert: assigns cert_no + verify token, freezes patient
// snapshot, records doctor sign-off. Confirms doctor name/license first.
export default function IssueCertButton({ certId, defaultName, defaultLicense }: { certId: string; defaultName?: string | null; defaultLicense?: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName ?? '')
  const [license, setLicense] = useState(defaultLicense ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function issue() {
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/certs/${certId}/issue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_name: name, doctor_license: license }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error || 'ออกใบรับรองไม่สำเร็จ'); return }
    router.refresh()
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="bg-mint text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-sage">✓ ออกใบรับรอง (Issue)</button>
  }

  return (
    <div className="bg-mint/5 border border-mint/30 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-forest">รับรองโดยแพทย์</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อแพทย์ผู้ตรวจ" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="เลขใบอนุญาตประกอบวิชาชีพเวชกรรม (ว.)" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <p className="text-xs text-amber-600">เมื่อออกแล้วจะแก้ไขไม่ได้ ต้องเพิกถอนแล้วออกใหม่</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={issue} disabled={busy || !name} className="bg-forest text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{busy ? 'กำลังออก...' : 'ยืนยันออกใบรับรอง'}</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500">ยกเลิก</button>
      </div>
    </div>
  )
}
