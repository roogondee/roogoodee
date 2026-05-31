'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Medical sign-off: captures reviewer name + license, flips report to confirmed.
export default function ConfirmReportButton({ reportId, defaultName }: { reportId: string; defaultName?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName ?? '')
  const [license, setLicense] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/lab/${reportId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerName: name, reviewerLicense: license }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error || 'ยืนยันไม่สำเร็จ'); return }
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="bg-mint text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-sage">
        ✓ ตรวจสอบและรับรองผล
      </button>
    )
  }

  return (
    <div className="bg-mint/5 border border-mint/30 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-forest">รับรองโดยบุคลากรการแพทย์</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อผู้รับรอง" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="เลขใบประกอบวิชาชีพ" className="w-full border rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={confirm} disabled={busy || !name} className="bg-forest text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          {busy ? 'กำลังบันทึก...' : 'ยืนยันรับรอง'}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500">ยกเลิก</button>
      </div>
    </div>
  )
}
