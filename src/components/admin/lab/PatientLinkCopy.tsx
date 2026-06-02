'use client'

import { useState } from 'react'

// Shows the patient's secret read link for a confirmed report so staff can
// copy it into a LINE chat. The link itself is the capability — keep it private.
export default function PatientLinkCopy({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://www.roogondee.com/lab/r/${token}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">ลิงก์ผลตรวจสำหรับคนไข้:</span>
      <code className="text-xs bg-gray-100 rounded px-2 py-1 max-w-[18rem] truncate">{url}</code>
      <button
        type="button" onClick={copy}
        className="rounded-lg border border-forest/20 text-forest px-3 py-1 text-xs hover:bg-gray-50"
      >
        {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
      </button>
    </div>
  )
}
