'use client'
import { useEffect, useState } from 'react'

interface Check {
  id: string
  label: string
  status: 'ok' | 'warn' | 'fail' | 'skip'
  detail: string
}

interface Response {
  ok?: boolean
  checked_at?: string
  summary?: { ok: number; warn: number; fail: number; skip: number }
  checks?: Check[]
  error?: string
}

const STATUS_STYLE: Record<Check['status'], { icon: string; bg: string; text: string }> = {
  ok:   { icon: '✓', bg: 'bg-green-50 border-green-200',  text: 'text-green-700' },
  warn: { icon: '⚠', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
  fail: { icon: '✗', bg: 'bg-red-50 border-red-200',      text: 'text-red-700' },
  skip: { icon: '–', bg: 'bg-gray-50 border-gray-200',    text: 'text-gray-600' },
}

export default function FbHealthDashboard() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/fb-health')
      const json = (await res.json()) as Response
      setData(json)
    } catch (err) {
      setData({ error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={load}
          disabled={loading}
          className="bg-mint hover:bg-mint/90 disabled:opacity-50 text-white font-medium px-4 py-2 rounded text-sm transition-colors"
        >
          {loading ? 'Checking…' : '🔄 Re-run checks'}
        </button>
        {data?.checked_at && (
          <span className="text-xs text-gray-500">
            Last checked: {new Date(data.checked_at).toLocaleString('th-TH')}
          </span>
        )}
      </div>

      {data?.summary && (
        <div className="flex gap-2 text-sm">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded">✓ {data.summary.ok} OK</span>
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded">⚠ {data.summary.warn} warn</span>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded">✗ {data.summary.fail} fail</span>
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded">– {data.summary.skip} skip</span>
        </div>
      )}

      {data?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-sm">
          ❌ {data.error}
        </div>
      )}

      {data?.checks?.map((c) => {
        const s = STATUS_STYLE[c.status]
        return (
          <div key={c.id} className={`border rounded-lg p-4 ${s.bg}`}>
            <div className="flex items-start gap-3">
              <div className={`text-lg font-bold ${s.text} flex-shrink-0`}>{s.icon}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{c.label}</div>
                <div className={`text-sm mt-0.5 ${s.text}`}>{c.detail}</div>
                <div className="text-xs text-gray-400 mt-1 font-mono">{c.id}</div>
              </div>
            </div>
          </div>
        )
      })}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900">
        <div className="font-medium mb-2">📚 Setup ที่ตรวจไม่ได้จากที่นี่ (ต้องเช็คใน Meta dashboard)</div>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>Domain verification — <a className="underline" href="https://business.facebook.com/settings/owned-domains" target="_blank" rel="noreferrer">Business Settings → Domains</a></li>
          <li>Aggregated Event Measurement priorities — <a className="underline" href="https://business.facebook.com/events_manager2/list/pixel" target="_blank" rel="noreferrer">Events Manager → AEM</a></li>
          <li>Event Match Quality score — Events Manager → Overview</li>
          <li>Test Events live verification — Events Manager → Test Events tab</li>
        </ul>
      </div>
    </div>
  )
}
