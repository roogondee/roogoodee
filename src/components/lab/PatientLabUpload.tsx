'use client'

import { useState } from 'react'

// Public patient-facing lab upload. Collects name/phone/consent + one file,
// posts to /api/lab/submit (which runs AI extraction and queues a pending
// report for staff review). Patients get the confirmed result via LINE later.
export default function PatientLabUpload() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!file) { setError('กรุณาเลือกไฟล์ผลตรวจ'); return }
    if (!consent) { setError('กรุณายินยอมให้จัดเก็บข้อมูล (PDPA)'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('phone', phone)
      fd.append('consent', String(consent))
      fd.append('file', file)
      const res = await fetch('/api/lab/submit', { method: 'POST', body: fd })
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) } catch { /* non-JSON (timeout/error page) */ }
      if (!res.ok) throw new Error((data.error as string) || `ส่งไม่สำเร็จ (${res.status})`)
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="font-display text-xl text-forest mb-2">ได้รับผลตรวจของคุณแล้ว</h2>
        <p className="text-sm text-gray-600">
          ทีมงานกำลังตรวจสอบและจะส่งผลพร้อมคำแนะนำกลับให้คุณทาง LINE ภายใน 1-2 วันทำการ
        </p>
        <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="inline-block mt-5 bg-forest text-white px-5 py-2 rounded-xl text-sm">
          แอด LINE เพื่อรับผล
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-forest">ชื่อ-นามสกุล</span>
        <input
          type="text" required value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          placeholder="ชื่อ นามสกุล"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-forest">เบอร์โทร</span>
        <input
          type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          placeholder="08X-XXX-XXXX"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-forest">ไฟล์ผลตรวจ (รูป หรือ PDF)</span>
        <input
          type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-forest file:text-white file:px-4 file:py-2 file:text-sm"
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>
          ข้าพเจ้ายินยอมให้ รู้ก่อนดี / W Medical จัดเก็บและประมวลผลข้อมูลสุขภาพนี้
          เพื่ออ่านผลและให้คำแนะนำ ตาม <a href="/privacy" className="underline">นโยบายความเป็นส่วนตัว</a>
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit" disabled={busy}
        className="w-full rounded-xl bg-forest text-white py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'กำลังส่งและอ่านผล… (อาจใช้เวลาสักครู่)' : 'ส่งผลตรวจ'}
      </button>
      <p className="text-[11px] text-gray-400 text-center">
        ข้อมูลของคุณถูกเก็บเป็นความลับ ใช้เพื่ออ่านผลและติดต่อกลับเท่านั้น
      </p>
    </form>
  )
}
