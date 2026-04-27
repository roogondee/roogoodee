'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  status: string
}

export default function AdDraftActions({ id, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  const act = async (action: 'approve' | 'reject') => {
    setLoading(action)
    try {
      await fetch(`/api/admin/ads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  if (status === 'approved') {
    return <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Approved</span>
  }
  if (status === 'rejected') {
    return <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">Rejected</span>
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => act('approve')}
        disabled={!!loading}
        className="text-xs px-3 py-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-semibold"
      >
        {loading === 'approve' ? '…' : 'Approve'}
      </button>
      <button
        onClick={() => act('reject')}
        disabled={!!loading}
        className="text-xs px-3 py-1.5 rounded-full border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-semibold"
      >
        {loading === 'reject' ? '…' : 'Reject'}
      </button>
    </div>
  )
}
