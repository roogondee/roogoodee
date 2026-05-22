'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Assignee { id: string; label: string }

export default function QueueBulkToolbar({
  bucketId,
  assignees,
  canReassign,
}: {
  bucketId: string
  assignees: Assignee[]
  canReassign: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snoozeDays, setSnoozeDays] = useState(3)
  const [reassignTo, setReassignTo] = useState('')

  useEffect(() => {
    const container = document.querySelector(`[data-bucket="${bucketId}"]`)
    if (!container) return

    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[data-lead-id]')
    const handler = (e: Event) => {
      const cb = e.target as HTMLInputElement
      const id = cb.dataset.leadId
      if (!id) return
      setSelected(prev => {
        const next = new Set(prev)
        if (cb.checked) next.add(id); else next.delete(id)
        return next
      })
    }
    checkboxes.forEach(cb => cb.addEventListener('change', handler))
    return () => { checkboxes.forEach(cb => cb.removeEventListener('change', handler)) }
  }, [bucketId])

  const count = selected.size

  const submit = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'bulk failed')
      setSelected(new Set())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'bulk failed')
    } finally {
      setBusy(false)
    }
  }

  const assigneeOptions = useMemo(() => assignees, [assignees])

  if (count === 0) return null

  return (
    <div className="sticky top-2 z-10 bg-white border-2 border-forest rounded-lg shadow-lg px-4 py-2 flex flex-wrap items-center gap-3 text-xs">
      <span className="font-semibold text-forest">เลือก {count} รายการ</span>
      <button type="button" onClick={() => setSelected(new Set())} disabled={busy}
        className="text-gray-500 hover:text-gray-800">ล้าง</button>

      <span className="text-gray-300">|</span>

      <button type="button" onClick={() => submit('mark_contacted')} disabled={busy}
        className="px-2 py-1 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40">
        ✓ ติดต่อแล้ว
      </button>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => submit('snooze', { snooze_days: snoozeDays })} disabled={busy}
          className="px-2 py-1 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 disabled:opacity-40">
          😴 Snooze
        </button>
        <input type="number" min={1} max={60} value={snoozeDays}
          onChange={e => setSnoozeDays(Math.max(1, Math.min(60, parseInt(e.target.value) || 3)))}
          className="w-14 px-1 py-1 border border-gray-200 rounded" />
        <span className="text-gray-500">วัน</span>
      </div>

      <button type="button" onClick={() => submit('mark_lost')} disabled={busy}
        className="px-2 py-1 rounded border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40">
        ✗ ปิด lost
      </button>

      {canReassign && (
        <div className="flex items-center gap-1">
          <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded">
            <option value="">โอนให้…</option>
            {assigneeOptions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <button type="button" disabled={!reassignTo || busy}
            onClick={() => submit('reassign', { assignee_id: reassignTo })}
            className="px-2 py-1 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40">
            โอน
          </button>
        </div>
      )}

      {error && <span className="text-red-600 ml-2">{error}</span>}
    </div>
  )
}
