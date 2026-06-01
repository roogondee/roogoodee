'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PipelineLead {
  id: string
  name: string
  service: string | null
  status: string
  tier: string | null
  created_at: string
}

const COLUMNS: { key: string; label: string }[] = [
  { key: 'new', label: 'ใหม่' },
  { key: 'contacted', label: 'ติดต่อแล้ว' },
  { key: 'qualified', label: 'สนใจจริง' },
  { key: 'booked', label: 'นัดแล้ว' },
  { key: 'visited', label: 'มาตรวจแล้ว' },
  { key: 'customer', label: 'ปิดการขาย' },
  { key: 'lost', label: 'หลุด' },
]

const TIER_DOT: Record<string, string> = {
  urgent: 'bg-red-500', hot: 'bg-orange-500', warm: 'bg-amber-400', cold: 'bg-sky-400',
}

export default function PipelineBoard({ leads }: { leads: PipelineLead[] }) {
  const router = useRouter()
  const [items, setItems] = useState(leads)
  const [dragId, setDragId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function move(id: string, status: string) {
    const prev = items
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)))
    setSaving(true)
    const res = await fetch(`/api/admin/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSaving(false)
    if (!res.ok) { setItems(prev); return }
    router.refresh()
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const cards = items.filter((l) => l.status === col.key)
        return (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) { move(dragId, col.key); setDragId(null) } }}
            className="flex-shrink-0 w-56 bg-gray-50 rounded-xl p-2"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-sm font-medium text-forest">{col.label}</span>
              <span className="text-xs text-gray-400">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={() => setDragId(l.id)}
                  className="bg-white rounded-lg border border-gray-100 p-2.5 cursor-grab active:cursor-grabbing shadow-sm"
                >
                  <div className="flex items-center gap-1.5">
                    {l.tier && <span className={`w-2 h-2 rounded-full ${TIER_DOT[l.tier] ?? 'bg-gray-300'}`} />}
                    <span className="text-sm text-forest truncate">{l.name || '-'}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{l.service ?? '-'}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {saving && <span className="fixed bottom-4 right-4 text-xs text-gray-400">กำลังบันทึก…</span>}
    </div>
  )
}
