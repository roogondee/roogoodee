'use client'

import { useState } from 'react'

export default function ClaimCodeButton({ patientId, linked }: { patientId: string; linked: boolean }) {
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function issue() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/lab/${patientId}/claim-code`, { method: 'POST' })
    setBusy(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error || 'เกิดข้อผิดพลาด'); return }
    setCode(data.code)
  }

  if (linked) {
    return <span className="text-xs text-green-700">✓ เชื่อม LINE สำหรับดูผลออนไลน์แล้ว</span>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {code ? (
        <div className="text-sm">
          <span className="text-gray-500">รหัสให้คนไข้ดูผลออนไลน์: </span>
          <span className="font-mono font-bold text-forest tracking-widest text-base">{code}</span>
          <p className="text-[11px] text-gray-400 mt-0.5">ให้คนไข้เข้า roogondee.com/portal → เข้าสู่ระบบ LINE → กรอกรหัสนี้ (ใช้ได้ครั้งเดียว, หมดอายุ 14 วัน)</p>
        </div>
      ) : (
        <button
          onClick={issue}
          disabled={busy}
          className="self-start text-sm bg-white border border-forest/20 text-forest px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? 'กำลังสร้าง…' : '🔑 ออกรหัสให้คนไข้ดูผลออนไลน์'}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
