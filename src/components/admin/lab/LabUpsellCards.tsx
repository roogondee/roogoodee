'use client'

import { useState } from 'react'
import { SERVICES } from '@/types'
import type { LabUpsell } from '@/lib/lab/types'

type Acted = { voucher?: { code?: string } | null; leadId?: string }

export default function LabUpsellCards({ upsell, reportId }: { upsell: LabUpsell[]; reportId: string }) {
  // Per-card state: which index is in-flight, and the result/error once acted.
  const [busy, setBusy] = useState<number | null>(null)
  const [acted, setActed] = useState<Record<number, Acted>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})

  if (!upsell?.length) return null

  async function act(i: number) {
    setBusy(i)
    setErrors((e) => ({ ...e, [i]: '' }))
    try {
      const res = await fetch(`/api/admin/lab/${reportId}/upsell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsellIndex: i }),
      })
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) } catch { /* non-JSON error page */ }
      if (!res.ok) throw new Error((data.error as string) || `เกิดข้อผิดพลาด (${res.status})`)
      setActed((a) => ({ ...a, [i]: { voucher: data.voucher as Acted['voucher'], leadId: data.leadId as string } }))
    } catch (e) {
      setErrors((er) => ({ ...er, [i]: (e as Error).message }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {upsell.map((u, i) => {
        const done = acted[i]
        const cardBusy = busy === i
        const label = u.kind === 'pillar' ? 'สร้างลีด + ออก voucher' : 'บันทึกเป็นลีดติดตาม'
        return u.kind === 'clinical_followup' ? (
          <div key={i} className="rounded-xl border border-mint/30 bg-mint/5 p-4 flex flex-col">
            <div className="text-xs font-semibold text-sage mb-1">ตรวจเพิ่มเติม (มาตรฐาน)</div>
            <div className="font-semibold text-forest">{u.title}</div>
            <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
              {u.recommended_tests.map((t, j) => <li key={j}>{t}</li>)}
            </ul>
            <p className="text-xs text-gray-600 mt-2">{u.reason}</p>
            <p className="text-xs text-gray-400 mt-1">📍 {u.location}</p>
            <UpsellAction i={i} label={label} busy={cardBusy} done={done} error={errors[i]} onAct={act} />
          </div>
        ) : (
          <div key={i} className="rounded-xl border border-forest/15 bg-white p-4 flex flex-col">
            <div className="text-xs font-semibold text-sage mb-1">บริการแนะนำ</div>
            <div className="font-semibold text-forest">{SERVICES[u.service]?.name ?? u.service}</div>
            <p className="text-xs text-gray-600 mt-1">{u.reason}</p>
            {u.voucher_hint && <p className="text-xs text-mint font-medium mt-2">🎟 {u.voucher_hint}</p>}
            <UpsellAction i={i} label={label} busy={cardBusy} done={done} error={errors[i]} onAct={act} />
          </div>
        )
      })}
    </div>
  )
}

function UpsellAction({
  i, label, busy, done, error, onAct,
}: {
  i: number
  label: string
  busy: boolean
  done?: Acted
  error?: string
  onAct: (i: number) => void
}) {
  if (done) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
        <span className="text-mint font-medium">✓ ดำเนินการแล้ว</span>
        {done.voucher?.code && <span className="ml-2 font-mono text-forest">{done.voucher.code}</span>}
      </div>
    )
  }
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        type="button"
        disabled={busy}
        onClick={() => onAct(i)}
        className="rounded-lg bg-forest text-white text-sm px-3 py-1.5 disabled:opacity-50"
      >
        {busy ? 'กำลังดำเนินการ…' : label}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
