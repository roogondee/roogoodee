'use client'
import { useState } from 'react'

// Spec §6.1: full pipeline new → contacted → qualified → booked → visited → customer → lost
const STATUS_OPTIONS = [
  { value: 'new',        label: 'ใหม่',         color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted',  label: 'ติดต่อแล้ว',   color: 'bg-amber-100 text-amber-700' },
  { value: 'qualified',  label: 'Qualified',    color: 'bg-indigo-100 text-indigo-700' },
  { value: 'booked',     label: 'นัดหมาย',      color: 'bg-purple-100 text-purple-700' },
  { value: 'visited',    label: 'มาตรวจแล้ว',   color: 'bg-teal-100 text-teal-700' },
  { value: 'customer',   label: 'ปิดการขาย',    color: 'bg-green-100 text-green-700' },
  { value: 'lost',       label: 'Lost',          color: 'bg-gray-100 text-gray-500' },
  // legacy value — still renderable if older rows have it
  { value: 'converted',  label: 'นัดหมาย (เก่า)', color: 'bg-purple-100 text-purple-700' },
]

export default function LeadStatusSelect({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const current = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]

  const handleChange = async (newStatus: string) => {
    const prev = status
    setLoading(true)
    setStatus(newStatus)
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) setStatus(prev)
    } catch {
      setStatus(prev)
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
      {STATUS_OPTIONS.filter(o => o.value !== 'converted' || status === 'converted').map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
