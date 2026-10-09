'use client'

// The HN input on the DMGLP patient forms, with "ค้นหา HN จากระบบห้องยา":
// the phone on the same form (or the stored one) goes to the W Medical
// pharmacy via the lookupPharmacyHn server action, staff pick a match, and the
// HN lands in the input. Nothing is saved until they submit the form.

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { HnLookupFailure, HnLookupResult } from '@/lib/integrations/pharmacy'
import { lookupPharmacyHn } from './actions'
import { btnSmallSecondary, input, label } from './ui'

const FAILURE_TH: Record<HnLookupFailure | 'request_failed', string> = {
  not_configured: 'ยังไม่ได้เชื่อมระบบห้องยา (ตั้ง PHARMACY_API_URL และ PHARMACY_API_KEY)',
  no_phone: 'กรอกเบอร์โทรในฟอร์มก่อน แล้วกดค้นหาอีกครั้ง',
  forbidden: 'บทบาทนี้ค้นหา HN ไม่ได้',
  unauthorized: 'ระบบห้องยาไม่รับคีย์ที่ตั้งไว้ (ตรวจ PHARMACY_API_KEY และสิทธิ์ patients:lookup) — กรอก HN เอง',
  rate_limited: 'ค้นหาถี่เกินไป รอสักครู่แล้วลองใหม่ หรือกรอก HN เอง',
  unavailable: 'ติดต่อระบบห้องยาไม่ได้ตอนนี้ — ลองใหม่ภายหลัง หรือกรอก HN เอง',
  bad_response: 'ระบบห้องยาตอบกลับไม่ถูกต้อง — กรอก HN เอง',
  request_failed: 'ค้นหาไม่สำเร็จ — ลองใหม่ หรือกรอก HN เอง',
}

const note = 'mt-2 rounded-lg border px-3 py-2 text-xs'

export function HnField({ labelText, hint, defaultValue, patientId, storedPhone, submitLabel }: {
  labelText: string
  hint?: string
  defaultValue?: string | null
  /** Edit screen: the patient being edited (audit context only). */
  patientId?: string
  /** Edit screen: used when the form's phone field is empty. */
  storedPhone?: string | null
  /** The form's submit button, named in the "not saved yet" reminder. */
  submitLabel: string
}) {
  const hnRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<HnLookupResult | { ok: false; reason: 'request_failed' } | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  // The edit card's action redirects back to the same page, which keeps this
  // component mounted — clear the matches on submit so "ยังไม่บันทึก" doesn't
  // outlive the save.
  useEffect(() => {
    const form = hnRef.current?.form
    if (!form) return
    const clear = () => { setResult(null); setPicked(null) }
    form.addEventListener('submit', clear)
    return () => form.removeEventListener('submit', clear)
  }, [])

  async function lookup(e: MouseEvent<HTMLButtonElement>) {
    const field = e.currentTarget.form?.elements.namedItem('phone')
    const typed = field instanceof HTMLInputElement ? field.value.trim() : ''
    setBusy(true)
    setPicked(null)
    setResult(null)
    try {
      setResult(await lookupPharmacyHn({ phone: typed || storedPhone || '', patientId }))
    } catch {
      // Network drop or an expired admin session — the form still works.
      setResult({ ok: false, reason: 'request_failed' })
    } finally {
      setBusy(false)
    }
  }

  function pick(value: string) {
    const el = hnRef.current
    if (!el) return
    el.value = value
    el.focus()
    setPicked(value)
  }

  const matches = result?.ok ? result.patients : []
  const showPhone = new Set(matches.map(p => p.phone)).size > 1

  return (
    <div>
      <label className={label} htmlFor="hn">{labelText}</label>
      <div className="flex items-center gap-2">
        <input ref={hnRef} id="hn" name="hn" defaultValue={defaultValue ?? undefined} autoComplete="off"
          onChange={() => setPicked(null)} className={`${input} min-w-0`} />
        <button type="button" onClick={lookup} disabled={busy} className={`${btnSmallSecondary} shrink-0 whitespace-nowrap disabled:opacity-50`}>
          {busy ? 'กำลังค้นหา…' : 'ค้นหา HN จากระบบห้องยา'}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}

      <div aria-live="polite">
        {result && !result.ok && (
          <p className={`${note} ${result.reason === 'not_configured' ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            {FAILURE_TH[result.reason]}
          </p>
        )}
        {result?.ok && matches.length === 0 && (
          <p className={`${note} bg-amber-50 border-amber-200 text-amber-800`}>ไม่พบเบอร์นี้ในระบบห้องยา — กรอก HN เอง</p>
        )}
        {matches.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">พบในระบบห้องยา {matches.length} รายการ — เลือกเพื่อเติม HN</p>
            <ul className="space-y-1">
              {matches.map(p => (
                <li key={p.hn}>
                  <button type="button" onClick={() => pick(p.fill)} aria-pressed={picked === p.fill}
                    className={`w-full text-left rounded-lg border px-3 py-2 ${picked === p.fill ? 'border-mint bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <span className="block text-sm font-semibold text-forest">{p.name}</span>
                    <span className="block text-xs text-gray-600">HN โรงพยาบาล: {p.original_hn ?? '—'} · รหัสห้องยา: {p.hn}</span>
                    {showPhone && <span className="block text-xs text-gray-400">เบอร์ {p.phone}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {picked && (
              <p className="text-xs text-emerald-700 mt-1">เติม HN {picked} แล้ว — ยังไม่บันทึก กด “{submitLabel}” เพื่อยืนยัน</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
