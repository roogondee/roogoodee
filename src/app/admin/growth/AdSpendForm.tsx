'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SpendRow {
  id: string
  spend_date: string
  platform: string
  service: string
  campaign: string
  spend: number | string
  source: string
}

const PLATFORMS = [
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'line', label: 'LINE Ads' },
  { value: 'meta', label: 'Meta (ถ้า sync ไม่ได้)' },
  { value: 'other', label: 'อื่น ๆ' },
]

const SERVICES = [
  { value: 'advice', label: '/advice (อาการทั่วไป)' },
  { value: 'glp1', label: 'GLP-1' },
  { value: 'ckd', label: 'CKD' },
  { value: 'std', label: 'STD/PrEP' },
  { value: 'foreign', label: 'แรงงานต่างด้าว' },
  { value: 'mens', label: 'ชาย 40+' },
  { value: 'women', label: 'สุขภาพหญิง' },
  { value: 'mind', label: 'สุขภาพจิต' },
  { value: 'dna', label: 'DNA' },
  { value: 'unknown', label: 'ไม่ระบุ' },
]

function today(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export default function AdSpendForm({ recent }: { recent: SpendRow[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ spend_date: today(), platform: 'google', service: 'advice', campaign: '', spend: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ad-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
      setForm(f => ({ ...f, spend: '', campaign: '' }))
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้?')) return
    const res = await fetch(`/api/admin/ad-spend?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  const input = 'border border-gray-200 rounded-lg px-3 py-2 text-sm'
  return (
    <div className="mt-3 space-y-4">
      <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-gray-500 flex flex-col gap-1">วันที่
          <input type="date" value={form.spend_date} onChange={set('spend_date')} className={input} required />
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">แพลตฟอร์ม
          <select value={form.platform} onChange={set('platform')} className={input}>
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">บริการ
          <select value={form.service} onChange={set('service')} className={input}>
            {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">แคมเปญ (ไม่บังคับ)
          <input value={form.campaign} onChange={set('campaign')} className={input} placeholder="advice-smart" />
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">ยอด (บาท)
          <input type="number" min="0" step="0.01" value={form.spend} onChange={set('spend')} className={`${input} w-32`} required />
        </label>
        <button disabled={saving} className="bg-forest text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {recent.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500">
            <tr>
              <th className="text-left py-1">วันที่</th><th className="text-left py-1">แพลตฟอร์ม</th>
              <th className="text-left py-1">บริการ</th><th className="text-left py-1">แคมเปญ</th>
              <th className="text-right py-1">ยอด</th><th />
            </tr>
          </thead>
          <tbody>
            {recent.map(r => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-1.5">{r.spend_date}</td>
                <td className="py-1.5">{r.platform}</td>
                <td className="py-1.5">{r.service}</td>
                <td className="py-1.5 text-gray-500">{r.campaign || '—'}</td>
                <td className="py-1.5 text-right">฿{Number(r.spend).toLocaleString('th-TH')}</td>
                <td className="py-1.5 text-right">
                  {r.source === 'manual'
                    ? <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:underline">ลบ</button>
                    : <span className="text-xs text-gray-400">sync</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
