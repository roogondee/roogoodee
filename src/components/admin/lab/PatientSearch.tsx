'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Patient { id: string; name: string; phone?: string | null }

export default function PatientSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', national_id: '', phone: '', dob: '', gender: '', consent_pdpa: false })
  const [error, setError] = useState('')

  async function search() {
    setLoading(true)
    const res = await fetch(`/api/admin/lab/patients?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.patients ?? [])
    setLoading(false)
  }

  async function create() {
    setError('')
    const res = await fetch('/api/admin/lab/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'เกิดข้อผิดพลาด'); return }
    router.push(`/admin/lab/${data.patient.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="ค้นหาด้วยชื่อ หรือเบอร์โทร"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={search} className="bg-forest text-white px-4 py-2 rounded-lg text-sm hover:bg-sage">
            {loading ? '...' : 'ค้นหา'}
          </button>
        </div>
        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100">
            {results.map((p) => (
              <li key={p.id}>
                <button onClick={() => router.push(`/admin/lab/${p.id}`)} className="w-full text-left py-2 hover:bg-gray-50 px-2 rounded flex justify-between">
                  <span className="font-medium text-forest">{p.name}</span>
                  <span className="text-sm text-gray-400">{p.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <button onClick={() => setCreating(!creating)} className="text-sm font-medium text-forest">
          {creating ? '− ปิด' : '+ เพิ่มคนไข้ใหม่'}
        </button>
        {creating && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input placeholder="ชื่อ-นามสกุล" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="เลขบัตรประชาชน 13 หลัก" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="เบอร์โทร" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">เพศ</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
              <option value="other">อื่นๆ</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.consent_pdpa} onChange={(e) => setForm({ ...form, consent_pdpa: e.target.checked })} />
              ยินยอม PDPA
            </label>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button onClick={create} className="bg-mint text-white px-4 py-2 rounded-lg text-sm hover:bg-sage sm:col-span-2">บันทึกคนไข้</button>
          </div>
        )}
      </div>
    </div>
  )
}
