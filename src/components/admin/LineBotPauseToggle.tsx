'use client'
import { useState } from 'react'

interface Props {
  lineUserId: string
  initialPaused: boolean
}

export default function LineBotPauseToggle({ lineUserId, initialPaused }: Props) {
  const [paused, setPaused] = useState(initialPaused)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    setError(null); setSaving(true)
    const action = paused ? 'resume' : 'pause'
    try {
      const res = await fetch('/api/admin/line-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_user_id: lineUserId, action }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'ล้มเหลว')
      } else {
        setPaused(!paused)
      }
    } catch {
      setError('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={saving}
        className={
          paused
            ? 'inline-flex items-center gap-1.5 bg-forest text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-sage disabled:opacity-50'
            : 'inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-amber-200 disabled:opacity-50'
        }
      >
        {paused ? '▶️ เปิดบอทตอบกลับต่อ' : '🙋 พนักงานตอบแล้ว — หยุดบอทชั่วคราว'}
      </button>
      {paused && <span className="text-xs text-amber-700">บอทหยุดตอบสำหรับ LINE นี้อยู่</span>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
