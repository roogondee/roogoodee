'use client'

import { useState } from 'react'
import { SERVICES } from '@/types'
import type { LabUpsell } from '@/lib/lab/types'

type Acted = {
  code?: string
  leadId?: string
  lineSent?: boolean
  lineReason?: string
}

export default function LabUpsellCards({ upsell, reportId }: { upsell: LabUpsell[]; reportId: string }) {
  const [busy, setBusy] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [sendLine, setSendLine] = useState(true)
  const [acted, setActed] = useState<Record<number, Acted>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})

  if (!upsell?.length) return null

  function setError(i: number, msg: string) {
    setErrors((e) => ({ ...e, [i]: msg }))
  }

  // Issue the upsell (lead + voucher), then optionally push it via LINE.
  async function runUpsell(i: number, withLine: boolean) {
    setConfirming(null)
    setBusy(i)
    setError(i, '')
    try {
      const res = await fetch(`/api/admin/lab/${reportId}/upsell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsellIndex: i }),
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error((data.error as string) || `เกิดข้อผิดพลาด (${res.status})`)
      const voucher = data.voucher as { code?: string } | null
      const code = voucher?.code
      const result: Acted = { code, leadId: data.leadId as string }

      if (withLine && code) {
        const line = await sendVoucherLine(reportId, code)
        result.lineSent = line.lineSent
        result.lineReason = line.reason
      }
      setActed((a) => ({ ...a, [i]: result }))
    } catch (e) {
      setError(i, (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  // Retry just the LINE push for an already-issued voucher.
  async function retryLine(i: number, code: string) {
    setBusy(i)
    setError(i, '')
    try {
      const line = await sendVoucherLine(reportId, code)
      setActed((a) => ({ ...a, [i]: { ...a[i], lineSent: line.lineSent, lineReason: line.reason } }))
    } catch (e) {
      setError(i, (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {upsell.map((u, i) => {
        const done = acted[i]
        const cardBusy = busy === i
        return u.kind === 'clinical_followup' ? (
          <div key={i} className="rounded-xl border border-mint/30 bg-mint/5 p-4 flex flex-col">
            <div className="text-xs font-semibold text-sage mb-1">ตรวจเพิ่มเติม (มาตรฐาน)</div>
            <div className="font-semibold text-forest">{u.title}</div>
            <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
              {u.recommended_tests.map((t, j) => <li key={j}>{t}</li>)}
            </ul>
            <p className="text-xs text-gray-600 mt-2">{u.reason}</p>
            <p className="text-xs text-gray-400 mt-1">📍 {u.location}</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              {done ? (
                <span className="text-sm text-mint font-medium">✓ บันทึกเป็นลีดติดตามแล้ว</span>
              ) : (
                <button
                  type="button" disabled={cardBusy} onClick={() => runUpsell(i, false)}
                  className="rounded-lg bg-forest text-white text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  {cardBusy ? 'กำลังดำเนินการ…' : 'บันทึกเป็นลีดติดตาม'}
                </button>
              )}
              {errors[i] && <p className="text-xs text-red-600 mt-2">{errors[i]}</p>}
            </div>
          </div>
        ) : (
          <div key={i} className="rounded-xl border border-forest/15 bg-white p-4 flex flex-col">
            <div className="text-xs font-semibold text-sage mb-1">บริการแนะนำ</div>
            <div className="font-semibold text-forest">{SERVICES[u.service]?.name ?? u.service}</div>
            <p className="text-xs text-gray-600 mt-1">{u.reason}</p>
            {u.voucher_hint && <p className="text-xs text-mint font-medium mt-2">🎟 {u.voucher_hint}</p>}

            <div className="mt-3 pt-3 border-t border-gray-100">
              {done ? (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-mint font-medium">✓ ออก voucher แล้ว</span>
                    {done.code && <span className="ml-2 font-mono text-forest">{done.code}</span>}
                  </div>
                  {done.lineSent === true && <div className="text-xs text-mint">📲 ส่งให้คนไข้ทาง LINE แล้ว</div>}
                  {done.lineSent === false && (
                    <div className="text-xs text-amber-600">
                      {done.lineReason || 'ยังไม่ได้ส่ง LINE'}
                      {done.code && (
                        <button
                          type="button" disabled={cardBusy} onClick={() => retryLine(i, done.code!)}
                          className="ml-2 underline disabled:opacity-50"
                        >
                          {cardBusy ? 'กำลังส่ง…' : 'ลองส่งอีกครั้ง'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : confirming === i ? (
                <div className="space-y-2">
                  <p className="text-sm text-forest">
                    ยืนยันออก voucher <b>{SERVICES[u.service]?.name ?? u.service}</b> ให้คนไข้?
                  </p>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" checked={sendLine} onChange={(e) => setSendLine(e.target.checked)} />
                    ส่งให้คนไข้ทาง LINE ทันที
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button" disabled={cardBusy} onClick={() => runUpsell(i, sendLine)}
                      className="rounded-lg bg-forest text-white text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      {cardBusy ? 'กำลังดำเนินการ…' : 'ยืนยัน'}
                    </button>
                    <button
                      type="button" disabled={cardBusy} onClick={() => setConfirming(null)}
                      className="rounded-lg border border-gray-200 text-gray-600 text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button" disabled={cardBusy}
                  onClick={() => { setSendLine(true); setConfirming(i) }}
                  className="rounded-lg bg-forest text-white text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  สร้างลีด + ออก voucher
                </button>
              )}
              {errors[i] && <p className="text-xs text-red-600 mt-2">{errors[i]}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return {} }
}

async function sendVoucherLine(reportId: string, voucherCode: string): Promise<{ lineSent: boolean; reason?: string }> {
  const res = await fetch(`/api/admin/lab/${reportId}/send-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voucherCode }),
  })
  const data = await readJson(res)
  if (!res.ok) throw new Error((data.error as string) || 'ส่ง LINE ไม่สำเร็จ')
  return { lineSent: Boolean(data.lineSent), reason: data.reason as string | undefined }
}
