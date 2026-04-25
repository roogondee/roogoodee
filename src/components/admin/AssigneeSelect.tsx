'use client'
import { useEffect, useState } from 'react'

interface SaleUser { id: string; email: string; name: string | null; role: string }

interface Props {
  leadId: string
  currentAssignee: string | null
  canEdit: boolean
}

export default function AssigneeSelect({ leadId, currentAssignee, canEdit }: Props) {
  const [value, setValue] = useState<string | ''>(currentAssignee || '')
  const [users, setUsers] = useState<SaleUser[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canEdit) return
    fetch('/api/admin/users').then(r => r.json()).then(d => {
      if (d.users) setUsers(d.users.filter((u: SaleUser & { disabled_at?: string | null }) => !u.disabled_at))
    }).catch(() => {})
  }, [canEdit])

  const onChange = async (newValue: string) => {
    setError(null); setSaving(true); setValue(newValue)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: newValue || null }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'ล้มเหลว')
        setValue(currentAssignee || '')
      }
    } catch {
      setError('เกิดข้อผิดพลาด')
      setValue(currentAssignee || '')
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    const current = users.find(u => u.id === currentAssignee)
    return (
      <span className="text-sm text-gray-700">
        {current?.name || current?.email || (currentAssignee ? '(user อื่น)' : '— ไม่มอบหมาย')}
      </span>
    )
  }

  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={saving}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-forest disabled:opacity-50"
      >
        <option value="">— ไม่มอบหมาย</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name ? `${u.name} (${u.email})` : u.email} {u.role === 'manager' ? '· mgr' : ''}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
