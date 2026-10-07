'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Row {
  id: string
  name: string
  match_names: string[]
  contact_name: string | null
  contact_phone: string | null
  active: boolean
  last_viewed_at: string | null
  workers: number
  due: number
}

function thDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'
}

export default function EmployerAdmin({ rows, knownNames, canManage }: { rows: Row[]; knownNames: string[]; canManage: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', match: '', contact_name: '', contact_phone: '' })
  const [link, setLink] = useState<{ name: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/employers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          match_names: form.match.split('\n'),
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'สร้างไม่สำเร็จ'); return }
      setLink({ name: form.name, url: data.link })
      setForm({ name: '', match: '', contact_name: '', contact_phone: '' })
      router.refresh()
    } finally { setBusy(false) }
  }

  async function patch(row: Row, body: Record<string, unknown>) {
    if (body.action === 'regenerate' && !confirm(`ออกลิงก์ใหม่ให้ ${row.name}? ลิงก์เดิมจะใช้ไม่ได้ทันที`)) return
    const res = await fetch(`/api/admin/employers?id=${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { alert(data.error || 'ไม่สำเร็จ'); return }
    if (data.link) setLink({ name: row.name, url: data.link })
    router.refresh()
  }

  const input = 'border border-gray-200 rounded-lg px-3 py-2 text-sm w-full'
  return (
    <div className="space-y-6">
      {link && (
        <div className="bg-mint/10 border border-mint rounded-xl p-4 text-sm">
          <div className="font-semibold text-forest">ลิงก์สำหรับ {link.name} — แสดงครั้งเดียว คัดลอกเก็บไว้ส่งให้ HR</div>
          <div className="flex gap-2 mt-2">
            <input readOnly value={link.url} className={input} onFocus={e => e.currentTarget.select()} />
            <button onClick={() => navigator.clipboard?.writeText(link.url)} className="bg-forest text-white rounded-lg px-3 text-sm">คัดลอก</button>
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left p-3">บริษัท</th>
              <th className="text-left p-3">ชื่อที่ใช้จับคู่ใบรับรอง</th>
              <th className="text-right p-3">แรงงาน</th>
              <th className="text-right p-3">ครบรอบใน 30 วัน</th>
              <th className="text-left p-3">HR เปิดดูล่าสุด</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={`border-t border-gray-100 ${r.active ? '' : 'opacity-50'}`}>
                <td className="p-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-400">{[r.contact_name, r.contact_phone].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="p-3 text-xs text-gray-600">{r.match_names.join(', ')}</td>
                <td className="p-3 text-right">{r.workers}</td>
                <td className={`p-3 text-right ${r.due ? 'text-amber-700 font-semibold' : ''}`}>{r.due}</td>
                <td className="p-3 text-xs">{thDate(r.last_viewed_at)}</td>
                <td className="p-3 text-right whitespace-nowrap space-x-2">
                  {canManage && (
                    <>
                      <button onClick={() => patch(r, { action: 'regenerate' })} className="text-xs text-forest hover:underline">ออกลิงก์ใหม่</button>
                      <button onClick={() => patch(r, { action: r.active ? 'deactivate' : 'activate' })} className="text-xs text-red-500 hover:underline">
                        {r.active ? 'ปิดการเข้าถึง' : 'เปิดใหม่'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400">ยังไม่มีบัญชีบริษัท</td></tr>}
          </tbody>
        </table>
      </section>

      {canManage ? (
        <form onSubmit={create} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 max-w-2xl">
          <h2 className="font-semibold text-forest">เพิ่มบริษัท</h2>
          <input className={input} placeholder="ชื่อบริษัท (แสดงบนหน้าพอร์ทัล)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div>
            <textarea
              className={`${input} h-24`}
              placeholder="ชื่อนายจ้างตามที่พิมพ์ในใบรับรอง — บรรทัดละ 1 ชื่อ (ต้องตรงทุกตัวอักษร)"
              value={form.match}
              onChange={e => setForm(f => ({ ...f, match: e.target.value }))}
              required
            />
            {knownNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {knownNames.slice(0, 40).map(n => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setForm(f => ({ ...f, match: f.match ? `${f.match}\n${n}` : n }))}
                    className="text-xs bg-gray-100 hover:bg-mint/20 rounded-full px-2 py-0.5"
                  >
                    + {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder="ชื่อผู้ติดต่อ HR" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            <input className={input} placeholder="เบอร์ HR" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="bg-forest text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">
            {busy ? 'กำลังสร้าง…' : 'สร้างบัญชี + ลิงก์'}
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-400">เฉพาะ manager เท่านั้นที่สร้าง/ออกลิงก์ใหม่ได้</p>
      )}
    </div>
  )
}
