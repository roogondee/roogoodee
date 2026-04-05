'use client'
import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'new', label: 'ใหม่', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'ติดต่อแล้ว', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'converted', label: 'นัดหมาย', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'ปิด', color: 'bg-gray-100 text-gray-500' },
]

export default function LeadStatusSelect({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const current = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]

  const handleChange = async (newStatus: string) => {
    setLoading(true)
    setStatus(newStatus)
    try {
      await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      setStatus(status) // revert on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={status}
      onChange={e => handleChange(e.target.value)}
      disabled={loading}
      className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer outline-none appearance-none ${current.color} ${loading ? 'opacity-50' : ''}`}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
