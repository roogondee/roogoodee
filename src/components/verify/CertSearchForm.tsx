'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'cert_no' | 'name'

export default function CertSearchForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('cert_no')
  const [certNo, setCertNo] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code.trim())) {
      setError('กรุณากรอกรหัสตรวจสอบส่วนบุคคล 6 หลัก')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/verify/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          by: mode,
          cert_no: certNo.trim(),
          name: name.trim(),
          code: code.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.token) {
        setError(data.error ?? 'ไม่พบใบรับรองที่ตรงกัน')
        return
      }
      router.push(`/verify/cert/${data.token}`)
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => { setMode(m); setError(null) }}
      className={`flex-1 py-2 text-sm rounded-lg transition ${
        mode === m ? 'bg-mint text-white font-semibold' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {label}
    </button>
  )

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
      <div className="flex gap-2">
        {tab('cert_no', 'ค้นด้วยเลขที่ใบ')}
        {tab('name', 'ค้นด้วยชื่อ')}
      </div>

      {mode === 'cert_no' ? (
        <div>
          <label className="text-xs text-gray-500 block mb-1">เลขที่ใบรับรอง</label>
          <input
            value={certNo}
            onChange={(e) => setCertNo(e.target.value)}
            placeholder="WMC-2569-000123"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-mint outline-none"
          />
        </div>
      ) : (
        <div>
          <label className="text-xs text-gray-500 block mb-1">ชื่อ-นามสกุล (ตามที่ปรากฏบนใบ)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อ นามสกุล"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-mint outline-none"
          />
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 block mb-1">รหัสตรวจสอบส่วนบุคคล (6 หลัก)</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="••••••"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm tracking-[0.3em] focus:border-mint outline-none"
        />
        <p className="text-[11px] text-gray-400 mt-1">รหัสนี้พิมพ์อยู่บนใบรับรองแพทย์ของท่าน</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-forest text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? 'กำลังตรวจสอบ…' : 'ตรวจสอบ'}
      </button>
    </form>
  )
}
