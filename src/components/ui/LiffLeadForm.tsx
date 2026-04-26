'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const SERVICE_LABELS: Record<string, { label: string; emoji: string; pitch: string }> = {
  std: {
    label: 'STD & PrEP HIV',
    emoji: '🔴',
    pitch: 'ตรวจปลอดภัย เป็นความลับ ไม่ตัดสิน — ทีมแพทย์โทรกลับใน 30 นาที',
  },
  glp1: {
    label: 'GLP-1 ลดน้ำหนัก',
    emoji: '💉',
    pitch: 'ลดน้ำหนักด้วยยา GLP-1 ภายใต้แพทย์ — ปรึกษาฟรี ทีมโทรกลับใน 30 นาที',
  },
  ckd: {
    label: 'CKD โรคไต',
    emoji: '🫘',
    pitch: 'ดูแลโรคไตเรื้อรัง โดยทีมแพทย์เฉพาะทาง — ทีมโทรกลับใน 30 นาที',
  },
  foreign: {
    label: 'ตรวจสุขภาพแรงงาน',
    emoji: '🧪',
    pitch: 'ตรวจสุขภาพต่อใบอนุญาตทำงาน ใบรับรองแพทย์ 2 ภาษา — ทีมโทรกลับใน 30 นาที',
  },
  general: {
    label: 'ปรึกษาทั่วไป',
    emoji: '💬',
    pitch: 'ปรึกษาผู้เชี่ยวชาญฟรี ทีมโทรกลับใน 30 นาที',
  },
}

const VALID_SERVICES = ['std', 'glp1', 'ckd', 'foreign', 'general'] as const

// LIFF SDK type declarations (we load it via <Script> from CDN to avoid an
// extra npm dep just for this one page).
interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

interface LiffSDK {
  init: (config: { liffId: string }) => Promise<void>
  isLoggedIn: () => boolean
  isInClient: () => boolean
  getProfile: () => Promise<LiffProfile>
  closeWindow: () => void
}

declare global {
  interface Window {
    liff?: LiffSDK
  }
}

export default function LiffLeadForm({ liffId }: { liffId: string }) {
  const searchParams = useSearchParams()
  const initialService = searchParams.get('service') || 'general'
  const service = (VALID_SERVICES as readonly string[]).includes(initialService)
    ? initialService
    : 'general'

  const ctx = SERVICE_LABELS[service]

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [liffStatus, setLiffStatus] = useState<'init' | 'ready' | 'unavailable'>('init')
  const sdkLoadedRef = useRef(false)

  // Initialise LIFF when the SDK script has loaded.
  // Falls back to plain-form mode if liffId is missing, init throws, or the
  // user isn't logged in inside the LINE app — we don't force liff.login()
  // because that redirects and we'd lose the form state.
  const initLiff = async () => {
    if (!window.liff || !liffId) {
      setLiffStatus('unavailable')
      return
    }
    try {
      await window.liff.init({ liffId })
      if (window.liff.isLoggedIn()) {
        const p = await window.liff.getProfile()
        setProfile(p)
        if (!name && p.displayName) setName(p.displayName)
      }
      setLiffStatus('ready')
    } catch (e) {
      console.warn('LIFF init failed — falling back to plain form', e)
      setLiffStatus('unavailable')
    }
  }

  // Capture UTM params once at mount
  const [utm, setUtm] = useState<Record<string, string>>({})
  useEffect(() => {
    const u: Record<string, string> = {}
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const v = searchParams.get(k)
      if (v) u[k] = v
    }
    setUtm(u)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('กรุณากรอกชื่อ')
      return
    }
    if (!/^0\d{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
      setError('เบอร์ต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก')
      return
    }
    if (!consent) {
      setError('กรุณายอมรับนโยบายความเป็นส่วนตัว (PDPA)')
      return
    }

    setLoading(true)
    try {
      const noteParts = Object.entries(utm).map(([k, v]) => `${k}=${v}`)
      if (profile) noteParts.push(`liff_display=${profile.displayName}`)
      const note = noteParts.join(' ')

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: name.trim(),
          phone: phone.replace(/[-\s]/g, ''),
          service,
          source: 'line-broadcast',
          line_id: profile?.userId,
          note,
          consent_pdpa: true,
          consent_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      }
      setSuccess(true)

      // Auto-close LIFF window after 2.5 seconds when launched inside LINE,
      // so the user lands back in the chat.
      if (window.liff && window.liff.isInClient && window.liff.isInClient()) {
        setTimeout(() => window.liff?.closeWindow(), 2500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center px-4">
        <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" />
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-2xl font-bold text-forest mb-2">ขอบคุณค่ะ!</h1>
          <p className="text-gray-600 leading-relaxed">
            ทีมเราได้รับข้อมูลแล้ว
            <br />
            จะโทรกลับภายใน <strong className="text-forest">30 นาที</strong>
          </p>
          {profile && (
            <p className="mt-4 text-xs text-gray-400">
              เชื่อมต่อ LINE สำเร็จ — ทีมจะส่งข้อมูลเพิ่มเติมในแชต
            </p>
          )}
          <Link
            href="/"
            className="inline-block mt-6 text-mint hover:text-forest text-sm"
          >
            ← กลับหน้าแรก
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center px-4 py-8">
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (sdkLoadedRef.current) return
          sdkLoadedRef.current = true
          initLiff()
        }}
      />
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{ctx.emoji}</div>
          <h1 className="text-2xl font-bold text-forest">{ctx.label}</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{ctx.pitch}</p>
        </div>

        {profile && (
          <div className="bg-mint/10 border border-mint/30 rounded-xl px-3 py-2 mb-4 flex items-center gap-3">
            {profile.pictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.pictureUrl}
                alt=""
                className="w-9 h-9 rounded-full"
              />
            )}
            <div className="text-sm">
              <div className="text-forest font-medium">เชื่อมต่อ LINE: {profile.displayName}</div>
              <div className="text-xs text-gray-500">ทีมจะส่งข้อมูลเพิ่มในแชตของคุณ</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ชื่อจริง / ชื่อเล่น"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-mint transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0XX-XXX-XXXX"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-mint transition-colors"
              required
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 accent-forest"
            />
            <span>
              ยอมรับ{' '}
              <Link href="/privacy" target="_blank" className="text-forest underline">
                นโยบายความเป็นส่วนตัว (PDPA)
              </Link>{' '}
              ให้ทีมติดต่อกลับได้
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || liffStatus === 'init'}
            className="w-full bg-forest hover:bg-sage text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'กำลังส่ง…' : liffStatus === 'init' ? 'กำลังเชื่อมต่อ LINE…' : 'รับการติดต่อกลับ'}
          </button>

          <p className="text-center text-[11px] text-gray-400">
            ฟรี ไม่มีค่าใช้จ่าย • ปลอดภัย • ทีมโทรกลับใน 30 นาที
          </p>
        </form>
      </div>
    </main>
  )
}
