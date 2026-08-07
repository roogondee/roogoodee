'use client'
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'
import { SERVICES, type Service } from '@/types'
import { LIFF_SDK_URL, type LiffIdentity } from '@/lib/liff-client'

// Full quiz inside LINE (LIFF). Opened from the OA rich menu / broadcast with
// ?service=<key>. After liff.init we hand the id_token to QuizRunner, whose
// claim call gets server-verified — the voucher is then pushed straight into
// the user's chat with zero typed fields. Opened outside LINE (or when init
// fails) the same page still works via the anonymous session-claim flow.

const SERVICE_KEYS = Object.keys(QUIZZES) as Service[]

type LiffStatus = 'init' | 'ready' | 'unavailable'

export default function LiffQuiz({ liffId }: { liffId: string }) {
  const searchParams = useSearchParams()
  const serviceParam = searchParams?.get('service') || ''
  const service: Service | null = (SERVICE_KEYS as string[]).includes(serviceParam)
    ? (serviceParam as Service)
    : null

  const [status, setStatus] = useState<LiffStatus>('init')
  const [identity, setIdentity] = useState<LiffIdentity | null>(null)
  const sdkLoadedRef = useRef(false)

  const initLiff = async () => {
    if (!window.liff || !liffId) {
      setStatus('unavailable')
      return
    }
    try {
      await window.liff.init({ liffId })
      const inClient = window.liff.isInClient()
      if (window.liff.isLoggedIn()) {
        // getProfile is display-sugar only — the server re-derives identity
        // from the verified id_token, never from client-sent fields.
        const profile = await window.liff.getProfile().catch(() => null)
        setIdentity({
          idToken: window.liff.getIDToken(),
          displayName: profile?.displayName ?? null,
          inClient,
          close: inClient ? () => window.liff?.closeWindow() : undefined,
        })
      } else {
        // Outside LINE and not logged in — don't force liff.login() (it
        // redirects and would lose quiz state); run anonymous instead.
        setIdentity(null)
      }
      setStatus('ready')
    } catch (e) {
      console.warn('LIFF init failed — running quiz without LINE identity', e)
      setStatus('unavailable')
    }
  }

  // Never let a hung SDK block the quiz: after 5s give up and run anonymous.
  useEffect(() => {
    const t = setTimeout(() => {
      setStatus(s => (s === 'init' ? 'unavailable' : s))
    }, 5000)
    return () => clearTimeout(t)
  }, [])

  const sdkScript = (
    <Script
      src={LIFF_SDK_URL}
      strategy="afterInteractive"
      onLoad={() => {
        if (sdkLoadedRef.current) return
        sdkLoadedRef.current = true
        initLiff()
      }}
      onError={() => setStatus('unavailable')}
    />
  )

  // No/invalid service param → vertical picker (single rich-menu button can
  // point at /liff/quiz with no params).
  if (!service) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center p-4">
        {sdkScript}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
          <h1 className="font-display text-2xl text-forest mb-1 text-center">เช็คสุขภาพฟรีใน 2 นาที</h1>
          <p className="text-sm text-muted text-center mb-5">เลือกเรื่องที่อยากประเมิน — รับ voucher ส่งเข้าแชทนี้เลย</p>
          <div className="space-y-2">
            {SERVICE_KEYS.map(key => (
              <a
                key={key}
                href={`/liff/quiz?service=${key}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-mint transition-all text-sm"
              >
                <span className="text-xl">{SERVICES[key].emoji}</span>
                <span className="text-forest font-medium">{SERVICES[key].name}</span>
              </a>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (status === 'init') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center">
        {sdkScript}
        <div className="text-white text-center">
          <div className="text-4xl mb-4">🌿</div>
          <p>กำลังเชื่อมต่อ LINE…</p>
        </div>
      </main>
    )
  }

  return (
    <>
      {sdkScript}
      <QuizRunner definition={QUIZZES[service]} liff={identity} />
    </>
  )
}
