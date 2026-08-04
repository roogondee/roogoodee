'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Question, QuizDefinition } from '@/lib/quiz/questions'
import { scoreQuiz } from '@/lib/quiz/scoring'
import { generateInsight } from '@/lib/quiz/insight'
import { SERVICES, type LeadTier } from '@/types'
import { useTranslation } from '@/lib/i18n/context'
import thDict from '@/lib/i18n/locales/th'

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void
    fbq?: (command: 'track' | 'trackCustom', name: string, params?: Record<string, unknown>, options?: { eventID?: string }) => void
    ttq?: {
      track: (name: string, params?: Record<string, unknown>, options?: { event_id?: string }) => void
      page?: () => void
      identify?: (params: Record<string, unknown>) => void
    }
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!RECAPTCHA_SITE_KEY || typeof window === 'undefined' || !window.grecaptcha) return undefined
  // Race against a timeout — a blocked or half-loaded grecaptcha must never
  // leave the submit button spinning forever. The server treats a missing
  // token as advisory, not a rejection.
  const token = new Promise<string | undefined>(resolve => {
    try {
      window.grecaptcha!.ready(async () => {
        try {
          resolve(await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action }))
        } catch { resolve(undefined) }
      })
    } catch { resolve(undefined) }
  })
  const timeout = new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 3000))
  return Promise.race([token, timeout])
}

function normalizePhone(p: string): string {
  let s = p.replace(/[-\s().]/g, '')
  // Accept E.164-style Thai numbers pasted from LINE/contacts
  if (s.startsWith('+66')) s = '0' + s.slice(3)
  else if (s.startsWith('66') && s.length >= 10) s = '0' + s.slice(2)
  return s
}

// Spec §7.2 — fan out events to GA4, Meta Pixel, and TikTok Pixel when available
function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', name, params) } catch {}
  try { window.fbq?.('trackCustom', name, params) } catch {}
  try { window.ttq?.track(name, params) } catch {}
}

// Server-side funnel tracking — feeds /admin/quiz-funnel drop-off dashboard.
// Fire-and-forget; never blocks the UI and never throws.
function trackFunnel(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    fetch('/api/quiz/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface Props {
  definition: QuizDefinition
}

interface ContactForm {
  first_name: string
  phone: string
}

interface VoucherResult {
  code: string | null       // null = waitlisted, no voucher issued
  expires_at: string | null
  tier: LeadTier
  score: number
  insight?: {
    headline: string
    body: string
    recommendation: string
    disclaimer: string
    urgent?: boolean
  } | null
  claimed?: boolean         // true = zero-form LINE claim (no contact info yet)
}

const EMPTY_CONTACT: ContactForm = {
  first_name: '',
  phone: '',
}

const STORAGE_VERSION = 1

// Flatten the composite BMI/basic step into scoring-compatible answers
function flattenAnswers(answers: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...answers }
  const composite = (answers['bmi'] || answers['basic']) as Record<string, unknown> | undefined
  if (composite) {
    Object.assign(flat, composite)
    delete flat['bmi']
    delete flat['basic']
  }
  return flat
}

const PHONE_DISPLAY = '081-902-3540'
const PHONE_TEL = 'tel:0819023540'

export default function QuizRunner({ definition }: Props) {
  const { t } = useTranslation()
  // Fallback locales (my/lo/km/…) don't carry a quiz section — fall back to
  // Thai so the runner never crashes on a missing dictionary branch.
  const tq = t.quiz ?? thDict.quiz
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT)
  const [consent, setConsent] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VoucherResult | null>(null)
  const [resumed, setResumed] = useState(false)

  const startedRef = useRef(false)
  const lastProgressRef = useRef(-1)
  const completeFiredRef = useRef(false)
  const submitLatchRef = useRef(false)
  const claimLatchRef = useRef(false)
  const sessionIdRef = useRef<string>('')
  const storageKey = `rgd-quiz-${definition.service}-v${STORAGE_VERSION}`

  // Restore saved progress + session id on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { step: s, answers: a, session_id, contact: c, consent: agreed } = JSON.parse(saved) as {
          step: number; answers: Record<string, unknown>; session_id?: string
          contact?: Partial<ContactForm>; consent?: boolean
        }
        if (typeof s === 'number' && s > 0) {
          setStep(s)
          setAnswers(a || {})
          setResumed(true)
        }
        if (c && typeof c === 'object') setContact({ ...EMPTY_CONTACT, ...c })
        if (typeof agreed === 'boolean') setConsent(agreed)
        if (typeof session_id === 'string' && session_id) {
          sessionIdRef.current = session_id
        }
      }
    } catch {}
    if (!sessionIdRef.current) sessionIdRef.current = newSessionId()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist progress (incl. contact + consent, so a refresh on the contact
  // step doesn't force the user to re-type everything)
  useEffect(() => {
    const hasContact = Object.values(contact).some(v => v !== '')
    if (step === 0 && Object.keys(answers).length === 0 && !hasContact && !consent) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        step, answers, session_id: sessionIdRef.current, contact, consent,
      }))
    } catch {}
  }, [step, answers, contact, consent, storageKey])

  const utm = useMemo(() => ({
    utm_source:   searchParams?.get('utm_source')   || undefined,
    utm_medium:   searchParams?.get('utm_medium')   || undefined,
    utm_campaign: searchParams?.get('utm_campaign') || undefined,
  }), [searchParams])

  // Spec §7.2: fire quiz_start on mount + TikTok InitiateCheckout standard event
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    track('quiz_start', { service: definition.service })
    trackFunnel({
      session_id: sessionIdRef.current,
      service: definition.service,
      event: 'start',
      total_questions: definition.questions.length,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    })
    try {
      window.ttq?.track('InitiateCheckout', {
        content_id: `quiz-${definition.service}`,
        content_name: `${definition.service.toUpperCase()} Quiz Start`,
        content_type: 'product',
        currency: 'THB',
      })
    } catch {}
  }, [definition.service, definition.questions.length, utm])

  // Persist ttclid from URL into a 30-day cookie so it survives across the multi-step quiz
  useEffect(() => {
    const ttclid = searchParams?.get('ttclid')
    if (ttclid && typeof document !== 'undefined') {
      document.cookie = `ttclid=${encodeURIComponent(ttclid)}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`
    }
  }, [searchParams])

  const totalSteps = definition.questions.length + 1 // +1 for contact step
  // step+1 / totalSteps+1 so Q1 already shows visible progress instead of 0%
  const progress = Math.round(((step + 1) / (totalSteps + 1)) * 100)
  const dark = definition.darkMode

  const currentQuestion: Question | null = step < definition.questions.length
    ? definition.questions[step]
    : null
  const isContactStep = step === definition.questions.length

  // Client-side preview of tier + insight, shown the moment the questions are
  // done — no form gate. Same pure functions the API uses server-side.
  const preview = useMemo(() => {
    if (!isContactStep || definition.questions.length === 0) return null
    const flat = flattenAnswers(answers)
    const scoring = scoreQuiz(definition.service, flat)
    return { tier: scoring.tier, insight: generateInsight(definition.service, flat, scoring.tier) }
  }, [isContactStep, answers, definition.service, definition.questions.length])

  // LINE deep link with a prefilled message — Thai service name so the OA
  // bot's detectService() catches the vertical and captureBotLead fires.
  const linePrefillHref = useMemo(() => {
    const label = SERVICES[definition.service]?.name || definition.service
    const text = `สนใจปรึกษาเรื่อง ${label} (ทำแบบประเมินบนเว็บแล้ว)`
    return `https://line.me/R/oaMessage/%40roogondee/?${new URLSearchParams({ text }).toString()}`
  }, [definition.service])

  const trackContactClick = (kind: 'line' | 'call') => {
    track(`quiz_${kind}_click`, { service: definition.service, tier: preview?.tier })
    trackFunnel({
      session_id: sessionIdRef.current,
      service: definition.service,
      event: `${kind}_click`,
      total_questions: definition.questions.length,
    })
    try { window.fbq?.('track', 'Contact', { content_category: definition.service }) } catch {}
    try { window.ttq?.track('Contact', { content_id: `quiz-${definition.service}`, content_type: 'lead' }) } catch {}
  }

  const canProceed = useMemo(() => {
    if (!currentQuestion) return true
    const val = answers[currentQuestion.id]
    if (currentQuestion.type === 'multi') return Array.isArray(val) && val.length > 0
    if (currentQuestion.type === 'bmi') {
      const v = val as { weight_kg?: number; height_cm?: number; age?: number; gender?: string } | undefined
      return !!(v?.weight_kg && v?.height_cm && v?.age && v?.gender)
    }
    if (currentQuestion.type === 'basic') {
      const v = val as { age?: number; gender?: string } | undefined
      return !!(v?.age && v?.gender)
    }
    return val !== undefined && val !== '' && val !== null
  }, [currentQuestion, answers])

  const setAnswer = (id: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  const toggleMulti = (q: Question, value: string) => {
    const prev = (answers[q.id] as string[] | undefined) ?? []
    const exclusiveValues = (q.options ?? [])
      .filter(o => o.exclusive || o.value === 'none')
      .map(o => o.value)
    let next: string[]
    if (prev.includes(value)) {
      next = prev.filter(v => v !== value)
    } else if (exclusiveValues.includes(value)) {
      next = [value]
    } else {
      next = [...prev.filter(v => !exclusiveValues.includes(v)), value]
    }
    setAnswer(q.id, next)
  }

  // Shared conversion fan-out for both lead paths (form submit / LINE claim).
  // TikTok event_id = voucher code so the client fire dedupes against the
  // server-side Events API call.
  const fireConversionEvents = (
    data: { tier: LeadTier; score: number; voucher?: { code: string } | null },
    funnelEvent: 'submit_success' | 'line_claim_success' = 'submit_success',
  ) => {
    track('quiz_complete', { service: definition.service, tier: data.tier, score: data.score })
    if (data.voucher?.code) track('voucher_sent', { service: definition.service, code: data.voucher.code })
    trackFunnel({
      session_id: sessionIdRef.current,
      service: definition.service,
      event: funnelEvent,
      total_questions: definition.questions.length,
    })
    try {
      window.fbq?.('track', 'Lead', { content_category: definition.service, value: data.score, currency: 'THB' })
      window.fbq?.('track', 'CompleteRegistration', { content_category: definition.service })
    } catch {}
    if (data.voucher?.code) try {
      window.ttq?.track('SubmitForm', {
        content_id: data.voucher.code,
        content_name: `${definition.service.toUpperCase()} Voucher`,
        content_type: 'lead',
        value: data.score,
        currency: 'THB',
      }, { event_id: data.voucher.code })
      window.ttq?.track('CompleteRegistration', {
        content_id: data.voucher.code,
        content_name: `${definition.service.toUpperCase()} Lead`,
        content_type: 'lead',
      }, { event_id: data.voucher.code })
    } catch {}
  }

  // Zero-form path: issue the voucher against the quiz session only; the
  // user then sends the code in the LINE OA chat (prefilled deep link on the
  // success screen) and the line-webhook links their userId to this lead.
  const claimViaLine = async () => {
    if (claimLatchRef.current) return
    claimLatchRef.current = true
    setClaimError(null)
    setClaiming(true)
    track('quiz_line_claim_click', { service: definition.service, tier: preview?.tier })
    trackFunnel({
      session_id: sessionIdRef.current,
      service: definition.service,
      event: 'line_claim_click',
      total_questions: definition.questions.length,
    })

    const flat = flattenAnswers(answers)
    const composite = (answers['bmi'] || answers['basic']) as Record<string, unknown> | undefined

    try {
      const recaptchaToken = await getRecaptchaToken(`quiz_claim_${definition.service}`)
      const res = await fetch('/api/quiz/claim-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: definition.service,
          answers: flat,
          session_id: sessionIdRef.current,
          age:    (composite?.age as number | undefined)?.toString(),
          gender: composite?.gender as string | undefined,
          utm_source:   utm.utm_source,
          utm_medium:   utm.utm_medium,
          utm_campaign: utm.utm_campaign,
          recaptcha_token: recaptchaToken,
          ttclid: readCookie('ttclid'),
          ttp:    readCookie('_ttp'),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setClaimError(data.error || tq.errorClaim)
        return
      }
      // Keep localStorage (session_id included) so a re-tap after refresh
      // reuses the same lead/voucher server-side instead of minting another.
      setResult({
        code: data.voucher?.code ?? null,
        expires_at: data.voucher?.expires_at ?? null,
        tier: data.tier,
        score: data.score,
        insight: data.insight,
        claimed: true,
      })
      if (!data.waitlist) fireConversionEvents(data, 'line_claim_success')
    } catch {
      setClaimError(tq.errorClaim)
    } finally {
      claimLatchRef.current = false
      setClaiming(false)
    }
  }

  const handleSubmit = async () => {
    if (submitLatchRef.current) return // guard against fast double-taps
    setError(null)
    if (!contact.first_name.trim()) { setError(tq.errorName); return }
    const phone = normalizePhone(contact.phone)
    if (!/^0\d{8,9}$/.test(phone)) { setError(tq.errorPhone); return }
    if (!consent) { setError(tq.errorConsent); return }
    submitLatchRef.current = true

    const flat = flattenAnswers(answers)
    const composite = (answers['bmi'] || answers['basic']) as Record<string, unknown> | undefined

    setLoading(true)
    try {
      const recaptchaToken = await getRecaptchaToken(`quiz_${definition.service}`)
      const ttclid = readCookie('ttclid')
      const ttp = readCookie('_ttp')
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: definition.service,
          answers: flat,
          first_name: contact.first_name,
          phone,
          age:        (composite?.age as number | undefined)?.toString(),
          gender:     composite?.gender as string | undefined,
          consent_pdpa: true,
          consent_at: new Date().toISOString(),
          utm_source:   utm.utm_source,
          utm_medium:   utm.utm_medium,
          utm_campaign: utm.utm_campaign,
          recaptcha_token: recaptchaToken,
          ttclid,
          ttp,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || tq.errorSubmit)
        return
      }
      try { localStorage.removeItem(storageKey) } catch {}
      setResult({
        code: data.voucher?.code ?? null,
        expires_at: data.voucher?.expires_at ?? null,
        tier: data.tier,
        score: data.score,
        insight: data.insight,
      })
      fireConversionEvents(data)
    } catch {
      setError(tq.errorGeneral)
    } finally {
      submitLatchRef.current = false
      setLoading(false)
    }
  }

  // Spec §7.2: fire quiz_progress as user advances through questions
  useEffect(() => {
    if (step > lastProgressRef.current && step < definition.questions.length) {
      lastProgressRef.current = step
      track('quiz_progress', {
        service: definition.service,
        step: step + 1,
        total: definition.questions.length,
      })
      trackFunnel({
        session_id: sessionIdRef.current,
        service: definition.service,
        event: 'progress',
        question_id: definition.questions[step]?.id,
        question_index: step,
        total_questions: definition.questions.length,
      })
    }
    // Fire 'complete' once the user reaches the contact step (passed all questions)
    if (step === definition.questions.length && !completeFiredRef.current) {
      completeFiredRef.current = true
      trackFunnel({
        session_id: sessionIdRef.current,
        service: definition.service,
        event: 'complete',
        total_questions: definition.questions.length,
      })
    }
  }, [step, definition.questions, definition.service])

  // ── Success screen ────────────────────────────────────────────────
  if (result) {
    const waitlisted = !result.code
    const expires = result.expires_at
      ? new Date(result.expires_at).toLocaleDateString('th-TH', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : null
    // With a voucher in hand the LINE button prefills the code — one tap to
    // open the OA chat and send it, which links the lead via line-webhook.
    const lineHref = result.code
      ? `https://line.me/R/oaMessage/%40roogondee/?${new URLSearchParams({ text: result.code }).toString()}`
      : result.claimed
        ? linePrefillHref
        : 'https://line.me/ti/p/@roogondee'
    return (
      <main className={`min-h-screen flex items-center justify-center p-5 ${dark ? 'bg-neutral-900 text-white' : 'bg-gradient-to-br from-forest via-sage to-mint'}`}>
        <div className={`max-w-md w-full rounded-3xl p-8 shadow-2xl ${dark ? 'bg-neutral-800 border border-white/10' : 'bg-white'}`}>
          <div className="text-6xl text-center mb-4">{waitlisted ? '✅' : '🎟'}</div>
          <h1 className={`font-display text-3xl text-center mb-2 ${dark ? 'text-white' : 'text-forest'}`}>
            {waitlisted
              ? (result.claimed
                  ? (tq.claimWaitlistTitle || 'สิทธิ์ฟรีเดือนนี้เต็มแล้ว')
                  : (tq.waitlistTitle || 'บันทึกข้อมูลเรียบร้อย!'))
              : tq.successTitle}
          </h1>
          <p className={`text-center text-sm mb-6 ${dark ? 'text-white/70' : 'text-muted'}`}>
            {waitlisted
              ? (result.claimed
                  ? (tq.claimWaitlistDesc || 'ทัก LINE @roogondee เพื่อจองคิวรอบถัดไป ทีมงานจะรีบดูแลให้เร็วที่สุด')
                  : (tq.waitlistDesc || 'สิทธิ์ฟรีของเดือนนี้เต็มแล้ว — ทีมงานจะติดต่อกลับเพื่อจัดคิวให้คุณโดยเร็วที่สุด'))
              : tq.successDesc}
          </p>

          {result.code && (
            <div className={`rounded-2xl p-5 text-center mb-5 ${dark ? 'bg-neutral-900 border border-mint/30' : 'bg-mint/10 border border-mint/30'}`}>
              <div className={`text-xs mb-1 ${dark ? 'text-white/50' : 'text-muted'}`}>{tq.voucherCodeLabel}</div>
              <div className="font-mono text-2xl font-bold tracking-wider mb-2">{result.code}</div>
              <div className={`text-xs ${dark ? 'text-white/60' : 'text-muted'}`}>
                {tq.voucherExpires} {expires} {tq.voucherDays}
              </div>
            </div>
          )}

          {result.insight && (
            <div className={`rounded-2xl p-4 mb-5 border ${
              result.insight.urgent
                ? (dark ? 'bg-red-900/30 border-red-500/50' : 'bg-red-50 border-red-200')
                : (dark ? 'bg-neutral-900 border-white/10' : 'bg-amber-50 border-amber-200')
            }`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${
                result.insight.urgent
                  ? 'text-red-500'
                  : (dark ? 'text-mint' : 'text-amber-700')
              }`}>
                💡 {tq.insightLabel}
              </p>
              <h3 className={`font-display text-base md:text-lg mb-2 ${dark ? 'text-white' : 'text-forest'}`}>
                {result.insight.headline}
              </h3>
              <p className={`text-sm leading-relaxed mb-3 ${dark ? 'text-white/80' : 'text-rtext'}`}>
                {result.insight.body}
              </p>
              <p className={`text-sm leading-relaxed mb-3 ${dark ? 'text-white/70' : 'text-muted'}`}>
                <span className="font-semibold">{tq.insightRecommend} </span>{result.insight.recommendation}
              </p>
              <p className={`text-xs italic border-t pt-2 ${dark ? 'text-white/40 border-white/10' : 'text-muted border-amber-200'}`}>
                ⚕️ {result.insight.disclaimer}
              </p>
            </div>
          )}

          {result.code && (
            <div className={`rounded-xl p-4 mb-4 text-xs leading-relaxed ${dark ? 'bg-mint/10 border border-mint/20 text-white/80' : 'bg-mint/10 border border-mint/20 text-rtext'}`}>
              <p className="font-semibold mb-2">📱 {tq.linePrompt}</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>{tq.lineStep1}</li>
                <li>{tq.lineStep2}: <span className={`font-mono font-bold ${dark ? 'text-mint' : 'text-forest'}`}>{result.code}</span></li>
                <li>{tq.lineStep3}</li>
              </ol>
            </div>
          )}

          <a
            href={lineHref}
            target="_blank" rel="noopener noreferrer"
            className="block text-center bg-[#06C755] text-white py-3 rounded-full font-bold text-sm mb-3"
          >
            {result.code ? (tq.sendCodeCta || '💬 ส่งโค้ดยืนยันใน LINE (แตะเดียว)') : `💬 ${tq.addLine}`}
          </a>
          <a
            href="https://maps.google.com/?q=W+Medical+Hospital+Samut+Sakhon"
            target="_blank" rel="noopener noreferrer"
            className={`block text-center py-3 rounded-full font-bold text-sm border ${dark ? 'border-white/20 text-white' : 'border-forest text-forest'}`}
          >
            📍 {tq.directions}
          </a>

          <p className={`text-xs text-center mt-5 ${dark ? 'text-white/40' : 'text-muted'}`}>
            {result.claimed && result.code ? (tq.claimTeamContact || 'ส่งโค้ดในแชท LINE แล้วทีมงานจะดูแลต่อให้ทันที') : tq.teamContact}
          </p>
        </div>
      </main>
    )
  }

  const resumeBanner = resumed ? (
    <div className={`text-xs mb-4 px-3 py-2 rounded-xl flex items-center justify-between ${dark ? 'bg-mint/10 text-mint border border-mint/20' : 'bg-mint/10 text-forest border border-mint/20'}`}>
      <span>{tq.resumeBanner} {step + 1})</span>
      <button
        type="button"
        onClick={() => {
          setStep(0); setAnswers({}); setResumed(false)
          sessionIdRef.current = newSessionId()
          completeFiredRef.current = false
          lastProgressRef.current = -1
          try { localStorage.removeItem(storageKey) } catch {}
        }}
        className="underline opacity-60 hover:opacity-100"
      >
        {tq.restartLink}
      </button>
    </div>
  ) : null

  // ── Result step (insight + LINE/call first, form as opt-in) ──────
  if (isContactStep && !showForm) {
    const insight = preview?.insight
    return (
      <QuizShell dark={dark} progress={100} onBack={() => setStep(step - 1)} backLabel={tq.back} homeLabel={tq.backHome}>
        {resumeBanner}
        <h2 className={`font-display text-2xl mb-1 ${dark ? 'text-white' : 'text-forest'}`}>{tq.resultTitle}</h2>
        <p className={`text-sm mb-5 ${dark ? 'text-white/60' : 'text-muted'}`}>{tq.resultDesc}</p>

        {insight && (
          <div className={`rounded-2xl p-4 mb-5 border ${
            insight.urgent
              ? (dark ? 'bg-red-900/30 border-red-500/50' : 'bg-red-50 border-red-200')
              : (dark ? 'bg-neutral-900 border-white/10' : 'bg-amber-50 border-amber-200')
          }`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${
              insight.urgent ? 'text-red-500' : (dark ? 'text-mint' : 'text-amber-700')
            }`}>
              💡 {tq.insightLabel}
            </p>
            <h3 className={`font-display text-base md:text-lg mb-2 ${dark ? 'text-white' : 'text-forest'}`}>
              {insight.headline}
            </h3>
            <p className={`text-sm leading-relaxed mb-3 ${dark ? 'text-white/80' : 'text-rtext'}`}>
              {insight.body}
            </p>
            <p className={`text-sm leading-relaxed mb-3 ${dark ? 'text-white/70' : 'text-muted'}`}>
              <span className="font-semibold">{tq.insightRecommend} </span>{insight.recommendation}
            </p>
            <p className={`text-xs italic border-t pt-2 ${dark ? 'text-white/40 border-white/10' : 'text-muted border-amber-200'}`}>
              ⚕️ {insight.disclaimer}
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={claiming}
          onClick={claimViaLine}
          className="block w-full text-center bg-[#06C755] text-white py-3.5 rounded-full font-bold text-base hover:bg-[#00B04B] transition-all disabled:opacity-60"
        >
          {claiming ? (tq.claiming || 'กำลังออก voucher…') : (tq.claimLineCta || '🎟 รับ voucher ฟรีทาง LINE')}
        </button>
        <p className={`text-xs text-center mt-2 mb-3 ${dark ? 'text-white/40' : 'text-muted'}`}>
          {tq.claimLineHint || 'ไม่ต้องกรอกฟอร์ม — รับโค้ดทันที แล้วส่งโค้ดในแชทเพื่อยืนยันสิทธิ์'}{' '}
          {tq.claimConsentNote || 'การกดรับถือว่ายอมรับ'}{' '}
          <Link href="/privacy" target="_blank" className="underline">{tq.pdpaLink}</Link>
        </p>
        {claimError && <p className="text-red-500 text-sm text-center mb-3">{claimError}</p>}

        <a
          href={PHONE_TEL}
          onClick={() => trackContactClick('call')}
          className={`block text-center py-3.5 rounded-full font-bold text-base mb-3 border-2 transition-all ${dark ? 'border-mint text-mint hover:bg-mint/10' : 'border-forest text-forest hover:bg-mint/10'}`}
        >
          {tq.callCta}
        </a>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`w-full text-center py-3 rounded-full font-semibold text-sm border ${dark ? 'border-white/15 text-white/70 hover:text-white hover:border-white/30' : 'border-gray-200 text-muted hover:text-forest hover:border-mint'} transition-all`}
        >
          {tq.formCta}
        </button>
        <p className={`text-xs text-center mt-2 ${dark ? 'text-white/40' : 'text-muted'}`}>
          {tq.formCtaHint}
        </p>
        <a
          href={linePrefillHref}
          target="_blank" rel="noopener noreferrer"
          onClick={() => trackContactClick('line')}
          className={`block text-center mt-3 text-sm underline underline-offset-2 ${dark ? 'text-white/50 hover:text-white/80' : 'text-muted hover:text-forest'}`}
        >
          {tq.chatFirstCta || 'ยังไม่แน่ใจ? ทัก LINE คุยกับทีมงานก่อนได้'}
        </a>
      </QuizShell>
    )
  }

  // ── Contact step ──────────────────────────────────────────────────
  if (isContactStep) {
    return (
      <QuizShell dark={dark} progress={100} onBack={() => setShowForm(false)} backLabel={tq.back} homeLabel={tq.backHome}>
        {resumeBanner}
        <h2 className={`font-display text-2xl mb-1 ${dark ? 'text-white' : 'text-forest'}`}>{tq.contactTitle}</h2>
        <p className={`text-sm mb-5 ${dark ? 'text-white/60' : 'text-muted'}`}>
          {tq.contactDesc}
        </p>

        <div className="space-y-3">
          <Field dark={dark} label={tq.firstName}>
            <input
              type="text"
              value={contact.first_name}
              onChange={e => setContact({ ...contact, first_name: e.target.value })}
              className={inputCls(dark)}
              placeholder={tq.nicknamePlaceholder}
            />
          </Field>
          <Field dark={dark} label={tq.phone}>
            <input
              type="tel"
              value={contact.phone}
              onChange={e => setContact({ ...contact, phone: e.target.value })}
              className={inputCls(dark)}
              placeholder={tq.phonePlaceholder}
            />
          </Field>

          <label className={`flex items-start gap-2 text-xs cursor-pointer leading-relaxed rounded-xl p-3 border ${dark ? 'border-white/10 bg-white/5 text-white/80' : 'border-mint/20 bg-mint/5 text-rtext'}`}>
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-forest shrink-0"
            />
            <span>
              🔒 {tq.pdpaConsent}{' '}
              <Link href="/privacy" target="_blank" className={dark ? 'text-mint underline' : 'text-forest underline'}>
                {tq.pdpaLink}
              </Link>
            </span>
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className={`w-full py-3.5 rounded-full font-bold text-base transition-all ${dark ? 'bg-mint text-neutral-900 hover:bg-mint/90' : 'bg-forest text-white hover:bg-sage'} disabled:opacity-60`}
          >
            {loading ? tq.submitting : tq.submit}
          </button>
        </div>
      </QuizShell>
    )
  }

  // ── Question step ─────────────────────────────────────────────────
  if (!currentQuestion) return null
  const q = currentQuestion

  return (
    <QuizShell
      dark={dark}
      progress={progress}
      onBack={step > 0 ? () => setStep(step - 1) : undefined}
      backLabel={tq.back}
      homeLabel={tq.backHome}
    >
      {resumeBanner}
      <div className={`text-xs font-medium mb-1 ${dark ? 'text-white/50' : 'text-muted'}`}>
        {tq.question} {step + 1} {tq.of} {definition.questions.length}
      </div>
      <h2 className={`font-display text-xl md:text-2xl mb-1 ${dark ? 'text-white' : 'text-forest'}`}>
        {q.title}
      </h2>
      {q.subtitle && (
        <p className={`text-sm mb-4 ${dark ? 'text-white/60' : 'text-muted'}`}>{q.subtitle}</p>
      )}

      <div className="mt-4">
        {q.type === 'radio' && q.options && (
          <div className="space-y-2">
            {q.options.map(opt => {
              const selected = answers[q.id] === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnswer(q.id, opt.value)}
                  className={optionCls(dark, selected)}
                >
                  <span>{opt.label}</span>
                  {opt.badge && <span className="text-xs font-bold text-red-500 ml-2">{opt.badge}</span>}
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'multi' && q.options && (
          <div className="space-y-2">
            <p className={`text-xs mb-2 ${dark ? 'text-white/50' : 'text-muted'}`}>{tq.multiHint}</p>
            {q.options.map(opt => {
              const current = (answers[q.id] as string[] | undefined) ?? []
              const selected = current.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMulti(q, opt.value)}
                  className={optionCls(dark, selected)}
                >
                  <span>{selected ? '✓' : '○'} {opt.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'bmi' && <BmiStep dark={dark} value={answers[q.id] as BmiValue | undefined} onChange={v => setAnswer(q.id, v)} labels={t.quiz} />}
        {q.type === 'basic' && <BasicStep dark={dark} value={answers[q.id] as BasicValue | undefined} onChange={v => setAnswer(q.id, v)} labels={t.quiz} />}
      </div>

      <button
        type="button"
        disabled={!canProceed}
        onClick={() => setStep(step + 1)}
        className={`w-full mt-6 py-3.5 rounded-full font-bold text-base transition-all ${dark ? 'bg-mint text-neutral-900 hover:bg-mint/90' : 'bg-forest text-white hover:bg-sage'} disabled:opacity-40`}
      >
        {tq.next}
      </button>
      {!q.required && (
        <button
          type="button"
          onClick={() => setStep(step + 1)}
          className={`w-full mt-3 text-sm underline underline-offset-2 ${dark ? 'text-white/50 hover:text-white/80' : 'text-muted hover:text-forest'}`}
        >
          {tq.skip || 'ข้ามข้อนี้ →'}
        </button>
      )}
    </QuizShell>
  )
}

// ── Shell / helpers ───────────────────────────────────────────────────
function QuizShell({ dark, progress, onBack, children, backLabel, homeLabel }: {
  dark?: boolean
  progress: number
  onBack?: () => void
  children: React.ReactNode
  backLabel?: string
  homeLabel?: string
}) {
  return (
    <main className={`min-h-screen flex items-center justify-center p-4 md:p-6 ${dark ? 'bg-neutral-900' : 'bg-gradient-to-br from-forest via-sage to-mint'}`}>
      <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl ${dark ? 'bg-neutral-800 border border-white/10' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          {onBack ? (
            <button type="button" onClick={onBack} className={`text-sm ${dark ? 'text-white/60' : 'text-muted'}`}>
              {backLabel ?? '← ย้อน'}
            </button>
          ) : (
            <Link href="/" className={`text-sm ${dark ? 'text-white/60' : 'text-muted'}`}>
              {homeLabel ?? '← หน้าแรก'}
            </Link>
          )}
          <div className={`text-xs ${dark ? 'text-white/50' : 'text-muted'}`}>{progress}%</div>
        </div>
        <div className={`h-1 w-full rounded-full overflow-hidden mb-5 ${dark ? 'bg-white/10' : 'bg-mint/15'}`}>
          <div
            className={`h-full transition-all ${dark ? 'bg-mint' : 'bg-forest'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {children}
      </div>
    </main>
  )
}

interface BmiValue { weight_kg?: number; height_cm?: number; age?: number; gender?: string }
interface BasicValue { age?: number; gender?: string }
interface QuizLabels { weight: string; height: string; age: string; gender: string; genderF: string; genderM: string; genderX: string; yourBmi: string; [key: string]: string }

const DEFAULT_LABELS: QuizLabels = {
  weight: 'น้ำหนัก (กก.)', height: 'ส่วนสูง (ซม.)', age: 'อายุ (ปี)', gender: 'เพศ',
  genderF: 'หญิง', genderM: 'ชาย', genderX: 'ไม่สะดวกบอก', yourBmi: 'BMI ของคุณ:',
}

function BmiStep({ dark, value, onChange, labels = DEFAULT_LABELS }: { dark?: boolean; value?: BmiValue; onChange: (v: BmiValue) => void; labels?: QuizLabels }) {
  const v = value || {}
  const bmi = v.weight_kg && v.height_cm ? v.weight_kg / Math.pow(v.height_cm / 100, 2) : null
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field dark={dark} label={labels.weight}>
          <input
            type="number"
            className={inputCls(dark)}
            value={v.weight_kg ?? ''}
            onChange={e => onChange({ ...v, weight_kg: Number(e.target.value) || undefined })}
          />
        </Field>
        <Field dark={dark} label={labels.height}>
          <input
            type="number"
            className={inputCls(dark)}
            value={v.height_cm ?? ''}
            onChange={e => onChange({ ...v, height_cm: Number(e.target.value) || undefined })}
          />
        </Field>
      </div>
      {bmi && (
        <div className={`text-center text-sm font-semibold ${dark ? 'text-mint' : 'text-forest'}`}>
          {labels.yourBmi} {bmi.toFixed(1)}
        </div>
      )}
      <BasicStep dark={dark} value={v} onChange={(bv) => onChange({ ...v, ...bv })} labels={labels} />
    </div>
  )
}

function BasicStep({ dark, value, onChange, labels = DEFAULT_LABELS }: { dark?: boolean; value?: BasicValue; onChange: (v: BasicValue) => void; labels?: QuizLabels }) {
  const v = value || {}
  return (
    <div className="space-y-3">
      <Field dark={dark} label={labels.age}>
        <input
          type="number"
          className={inputCls(dark)}
          value={v.age ?? ''}
          onChange={e => onChange({ ...v, age: Number(e.target.value) || undefined })}
        />
      </Field>
      <Field dark={dark} label={labels.gender}>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'f', label: labels.genderF },
            { value: 'm', label: labels.genderM },
            { value: 'x', label: labels.genderX },
          ].map(o => {
            const selected = v.gender === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange({ ...v, gender: o.value })}
                className={optionCls(dark, selected, 'text-center text-sm py-2')}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </Field>
    </div>
  )
}

function Field({ dark, label, children }: { dark?: boolean; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`text-xs font-semibold block mb-1 ${dark ? 'text-white/70' : 'text-rtext'}`}>{label}</label>
      {children}
    </div>
  )
}

function inputCls(dark?: boolean) {
  return dark
    ? 'w-full px-3 py-2.5 bg-neutral-900 border border-white/20 rounded-xl text-sm text-white outline-none focus:border-mint'
    : 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-mint'
}

function optionCls(dark: boolean | undefined, selected: boolean, extra = '') {
  if (dark) {
    return `w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
      selected
        ? 'border-mint bg-mint/10 text-mint font-semibold'
        : 'border-white/10 text-white/80 hover:border-white/30'
    } ${extra}`
  }
  return `w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
    selected
      ? 'border-sage bg-mint/10 text-forest font-semibold'
      : 'border-gray-200 hover:border-mint'
  } ${extra}`
}
