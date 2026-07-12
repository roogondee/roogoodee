'use client'

import { useState } from 'react'

export default function CertLinkCopy({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/verify/cert/${token}` : `/verify/cert/${token}`

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }

  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className="flex-1 border rounded-lg px-3 py-2 text-xs text-gray-600 bg-gray-50" onFocus={(e) => e.target.select()} />
      <button onClick={copy} className="bg-forest text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap">{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}</button>
    </div>
  )
}
