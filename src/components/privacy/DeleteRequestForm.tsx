'use client'
import { useState } from 'react'
import Link from 'next/link'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!RECAPTCHA_SITE_KEY || typeof window === 'undefined' || !window.grecaptcha) return undefined
  return new Promise<string | undefined>(resolve => {
    window.grecaptcha!.ready(async () => {
      try {
        resolve(await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action }))
      } catch { resolve(undefined) }
    })
  })
}

export default function DeleteRequestForm() {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [ack, setAck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^0\d{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
      setError('เบอร์โทรไม่ถูกต้อง'); return
    }
    if (!ack) { setError('กรุณายืนยันว่าเข้าใจเงื่อนไข'); return }
    setLoading(true)
    try {
      const token = await getRecaptchaToken('privacy_delete')
      const res = await fetch('/api/privacy/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email: email || undefined, reason: reason || undefined, recaptcha_token: token }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'ส่งไม่สำเร็จ'); return }
      setDone(true)
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center p-5">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-lg text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="font-display text-2xl text-forest mb-2">รับคำขอแล้ว</h1>
          <p className="text-sm text-muted leading-relaxed mb-6">
            ทีมงานจะดำเนินการลบข้อมูลของคุณจากระบบภายใน <strong>30 วัน</strong>
            และแจ้งกลับทางช่องทางที่คุณให้ไว้
          </p>
          <Link href="/" className="inline-block bg-forest text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-sage">
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream py-12 px-5">
      <div className="max-w-lg mx-auto">
        <Link href="/privacy" className="text-sm text-muted hover:text-forest">← กลับหน้า Privacy Policy</Link>

        <div className="bg-white rounded-3xl p-7 md:p-10 shadow-lg mt-4">
          <h1 className="font-display text-2xl md:text-3xl text-forest mb-2">ขอลบข้อมูลส่วนตัว</h1>
          <p className="text-sm text-muted leading-relaxed mb-6">
            ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณมีสิทธิ์ขอให้ลบข้อมูลของคุณออกจากระบบได้
            กรุณากรอกข้อมูลด้านล่างเพื่อยืนยันตัวตน
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1">เบอร์โทรที่ลงทะเบียน *</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Email (ถ้ามี)</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">เหตุผล (ทางเลือก)</label>
              <textarea
                value={reason} onChange={e => setReason(e.target.value)}
                rows={3} maxLength={500}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-forest resize-none"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-rtext cursor-pointer leading-relaxed bg-amber-50 border border-amber-200 rounded-xl p-3">
              <input
                type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-forest shrink-0"
              />
              <span>
                ⚠️ ฉันเข้าใจว่าการลบข้อมูลจะทำให้ไม่สามารถใช้ voucher หรือบริการที่ค้างอยู่ได้
                และทีมงานจะดำเนินการให้แล้วเสร็จภายใน 30 วัน
              </span>
            </label>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit" disabled={loading || !ack}
              className="w-full bg-red-600 text-white py-3 rounded-full font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'กำลังส่ง…' : 'ส่งคำขอลบข้อมูล'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
