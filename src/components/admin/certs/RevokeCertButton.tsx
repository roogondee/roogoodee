'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RevokeCertButton({ certId }: { certId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function revoke() {
    setBusy(true); setError('')
    const res = await fetch(`/api/admin/certs/${certId}/revoke`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setError(data.error || 'เพิกถอนไม่สำเร็จ'); return }
    router.refresh()
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-sm hover:bg-red-50">เพิกถอนใบรับรอง</button>
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-red-700">เพิกถอนใบรับรอง (ผู้จัดการเท่านั้น)</p>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เหตุผลการเพิกถอน" className="w-full border rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={revoke} disabled={busy || !reason} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{busy ? '...' : 'ยืนยันเพิกถอน'}</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500">ยกเลิก</button>
      </div>
    </div>
  )
}
