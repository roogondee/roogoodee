'use client'
import { useState } from 'react'

interface Props {
  id: string
  phone: string
  email?: string | null
  reason?: string | null
  requestedAt: string
}

export default function DeletionRequestRow({ id, phone, email, reason, requestedAt }: Props) {
  const [loading, setLoading] = useState<'process' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'process' | 'reject' | null>(null)

  const confirmAndRun = async (action: 'process' | 'reject') => {
    const prompt = action === 'process'
      ? `ยืนยันลบข้อมูลของเบอร์ ${phone} ถาวร (รวม voucher ที่ออกไปแล้ว)? — ดำเนินการย้อนกลับไม่ได้`
      : `ปฏิเสธคำขอนี้?`
    if (!window.confirm(prompt)) return
    setError(null)
    setLoading(action)
    try {
      const res = await fetch(`/api/admin/deletion-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'ล้มเหลว'); return }
      setDone(action)
    } catch {
      setError('เกิดข้อผิดพลาด')
    } finally {
      setLoading(null)
    }
  }

  if (done) {
    return (
      <div className="p-4 bg-green-50 text-sm text-green-700">
        ✓ {done === 'process' ? 'ลบข้อมูลแล้ว' : 'ปฏิเสธแล้ว'} — รีเฟรชหน้าเพื่ออัพเดต
      </div>
    )
  }

  return (
    <div className="p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono font-semibold">{phone}</span>
          {email && <span className="text-gray-500 text-xs">• {email}</span>}
        </div>
        {reason && <p className="text-xs text-gray-600 italic">"{reason}"</p>}
        <p className="text-xs text-gray-400">{requestedAt}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button
          type="button"
          onClick={() => confirmAndRun('process')}
          disabled={loading !== null}
          className="text-xs font-semibold bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {loading === 'process' ? 'กำลังลบ…' : 'ลบข้อมูล'}
        </button>
        <button
          type="button"
          onClick={() => confirmAndRun('reject')}
          disabled={loading !== null}
          className="text-xs text-gray-500 px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50"
        >
          ปฏิเสธ
        </button>
      </div>
    </div>
  )
}
