'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClaimForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await fetch('/api/portal/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    setBusy(false)
    if (res.ok) {
      router.push('/portal/results')
      return
    }
    const data = await res.json().catch(() => ({}))
    setError(data.error || 'เกิดข้อผิดพลาด')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="กรอกรหัสยืนยัน เช่น 7K2P9XQ4"
        autoFocus
        className="w-full text-center tracking-widest font-mono text-lg border border-gray-200 rounded-xl py-3 px-4 focus:border-mint focus:outline-none uppercase"
      />
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="w-full bg-forest text-white font-semibold py-3 rounded-xl hover:bg-sage transition disabled:opacity-50"
      >
        {busy ? 'กำลังตรวจสอบ…' : 'ยืนยันตัวตน'}
      </button>
    </form>
  )
}
