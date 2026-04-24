'use client'
import { useState } from 'react'

export default function NoteEditor({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = value !== saved

  const save = async () => {
    setError(null); setSaving(true)
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: value }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
      setSaved(value)
    } catch {
      setError('เกิดข้อผิดพลาด')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={5}
        placeholder="จดบันทึกจากการโทร/แชท สำหรับทีม sale…"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-forest resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {dirty ? 'แก้ไขแล้ว (ยังไม่บันทึก)' : saved ? 'บันทึกล่าสุด' : ''}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="text-xs font-semibold bg-forest text-white px-4 py-1.5 rounded-md hover:bg-sage disabled:opacity-40"
        >
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
