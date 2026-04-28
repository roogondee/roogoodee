'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Question, QuizDefinition } from '@/lib/quiz/questions'
import type { LeadTier } from '@/types'

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void
    fbq?: (command: 'track' | 'trackCustom', name: string, params?: Record<string, unknown>) => void
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
        const token = await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action })
        resolve(token)
      } catch { resolve(undefined) }
    })
  })
}

// Spec §7.2 — fire both GA4 and Meta Pixel when available
function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', name, params) } catch {}
  try { window.fbq?.('trackCustom', name, params) } catch {}
}

interface Props {
  definition: QuizDefinition
}

interface ContactForm {
  first_name: string
  last_name: string
  phone: string
  line_id: string
  email: string
}

interface VoucherResult {
  code: string
  expires_at: string
  tier: LeadTier
  score: number
  insight?: {
    headline: string
    body: string
    recommendation: string
    disclaimer: string
    urgent?: boolean
  } | null
}

const EMPTY_CONTACT: ContactForm = {
  first_name: '',
  last_name: '',
  phone: '',
  line_id: '',
  email: '',
}

export default function QuizRunner({ definition }: Props) {
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VoucherResult | null>(null)

  const startedRef = useRef(false)
  const lastProgressRef = useRef(-1)

  const utm = useMemo(() => ({
    utm_source:   searchParams?.get('utm_source')   || undefined,
    utm_medium:   searchParams?.get('utm_medium')   || undefined,
    utm_campaign: searchParams?.get('utm_campaign') || undefined,
  }), [searchParams])

  // Spec §7.2: fire quiz_start on mount
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    track('quiz_start', { service: definition.service })
  }, [definition.service])

  const totalSteps = definition.questions.length + 1 // +1 for contact step
  const progress = Math.round((step / totalSteps) * 100)
  const dark = definition.darkMode

  const currentQuestion: Question | null = step < definition.questions.length
    ? definition.questions[step]
    : null
  const isContactStep = step === definition.questions.length

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

  const handleSubmit = async () => {
    setError(null)
    if (!contact.first_name.trim()) { setError('กรุณากรอกชื่อ'); return }
    const phone = contact.phone.replace(/[-\s]/g, '')
    if (!/^0\d{8,9}$/.test(phone)) { setError('เบอร์โทรไม่ถูกต้อง'); return }
    if (!consent) { setError('กรุณายอมรับเงื่อนไข PDPA'); return }

    // Flatten BMI/basic step into scoring-compatible answers
    const flat: Record<string, unknown> = { ...answers }
    const bmi = answers['bmi'] as Record<string, unknown> | undefined
    const basic = answers['basic'] as Record<string, unknown> | undefined
    const composite = bmi || basic
    if (composite) {
      Object.assign(flat, composite)
      delete flat['bmi']
      delete flat['basic']
    }

    setLoading(true)
    try {
      const recaptchaToken = await getRecaptchaToken(`quiz_${definition.service}`)
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: definition.service,
          answers: flat,
          first_name: contact.first_name,
          last_name:  contact.last_name || undefined,
          phone,
          line_id:    contact.line_id || undefined,
          email:      contact.email || undefined,
          age:        (composite?.age as number | undefined)?.toString(),
          gender:     composite?.gender as string | undefined,
          consent_pdpa: true,
          consent_at: new Date().toISOString(),
          utm_source:   utm.utm_source,
          utm_medium:   utm.utm_medium,
          utm_campaign: utm.utm_campaign,
          recaptcha_token: recaptchaToken,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'ส่งไม่สำเร็จ')
        return
      }
      setResult({
        code: data.voucher.code,
        expires_at: data.voucher.expires_at,
        tier: data.tier,
        score: data.score,
        insight: data.insight,
      })
      track('quiz_complete', { service: definition.service, tier: data.tier, score: data.score })
      track('voucher_sent', { service: definition.service, code: data.voucher.code })
      try {
        window.fbq?.('track', 'Lead', { content_category: definition.service, value: data.score, currency: 'THB' })
        window.fbq?.('track', 'CompleteRegistration', { content_category: definition.service })
      } catch {}
    } catch {
      setError('ขออภัย มีปัญหา ลองอีกครั้ง')
    } finally {
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
    }
  }, [step, definition.questions.length, definition.service])

  // ── Success screen ────────────────────────────────────────────────
  if (result) {
    const expires = new Date(result.expires_at).toLocaleDateString('th-TH', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    return (
      <main className={`min-h-screen flex items-center justify-center p-5 ${dark ? 'bg-neutral-900 text-white' : 'bg-gradient-to-br from-forest via-sage to-mint'}`}>
        <div className={`max-w-md w-full rounded-3xl p-8 shadow-2xl ${dark ? 'bg-neutral-800 border border-white/10' : 'bg-white'}`}>
          <div className="text-6xl text-center mb-4">🎟</div>
          <h1 className={`font-display text-3xl text-center mb-2 ${dark ? 'text-white' : 'text-forest'}`}>
            รับ Voucher เรียบร้อย!
          </h1>
          <p className={`text-center text-sm mb-6 ${dark ? 'text-white/70' : 'text-muted'}`}>
            แสดงโค้ดนี้ที่ W Medical Hospital เพื่อใช้สิทธิ์
          </p>

          <div className={`rounded-2xl p-5 text-center mb-5 ${dark ? 'bg-neutral-900 border border-mint/30' : 'bg-mint/10 border border-mint/30'}`}>
            <div className={`text-xs mb-1 ${dark ? 'text-white/50' : 'text-muted'}`}>Voucher Code</div>
            <div className="font-mono text-2xl font-bold tracking-wider mb-2">{result.code}</div>
            <div className={`text-xs ${dark ? 'text-white/60' : 'text-muted'}`}>
              หมดอายุ {expires} (14 วัน)
            </div>
          </div>

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
                💡 ประเมินจากคำตอบของคุณ
              </p>
              <h3 className={`font-display text-base md:text-lg mb-2 ${dark ? 'text-white' : 'text-forest'}`}>
                {result.insight.headline}
              </h3>
              <p className={`text-sm leading-relaxed mb-3 ${dark ? 'text-white/80' : 'text-rtext'}`}>
                {result.insight.body}
              </p>
              <p className={`text-sm leading-relaxed mb-3 ${dark ? 'text-white/70' : 'text-muted'}`}>
                <span className="font-semibold">แนะนำ: </span>{result.insight.recommendation}
              </p>
              <p className={`text-xs italic border-t pt-2 ${dark ? 'text-white/40 border-white/10' : 'text-muted border-amber-200'}`}>
                ⚕️ {result.insight.disclaimer}
              </p>
            </div>
          )}

          <div className={`rounded-xl p-4 mb-4 text-xs leading-relaxed ${dark ? 'bg-mint/10 border border-mint/20 text-white/80' : 'bg-mint/10 border border-mint/20 text-rtext'}`}>
            <p className="font-semibold mb-2">📱 เชื่อมบัญชี LINE เพื่อรับการแจ้งเตือน:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>กดปุ่ม Add LINE ด้านล่าง</li>
              <li>ส่งรหัส <span className={`font-mono font-bold ${dark ? 'text-mint' : 'text-forest'}`}>{result.code}</span> ในแชท</li>
              <li>ระบบจะยืนยันและแจ้งเตือนก่อน voucher หมดอายุ</li>
            </ol>
          </div>

          <a
            href="https://line.me/ti/p/@roogondee"
            target="_blank" rel="noopener noreferrer"
            className="block text-center bg-[#06C755] text-white py-3 rounded-full font-bold text-sm mb-3"
          >
            💬 Add LINE @roogondee
          </a>
          <a
            href="https://maps.google.com/?q=W+Medical+Hospital+Samut+Sakhon"
            target="_blank" rel="noopener noreferrer"
            className={`block text-center py-3 rounded-full font-bold text-sm border ${dark ? 'border-white/20 text-white' : 'border-forest text-forest'}`}
          >
            📍 ดูเส้นทางไปโรงพยาบาล
          </a>

          <p className={`text-xs text-center mt-5 ${dark ? 'text-white/40' : 'text-muted'}`}>
            ทีมเราจะติดต่อกลับภายใน 24 ชั่วโมง
          </p>
        </div>
      </main>
    )
  }

  // ── Contact step ──────────────────────────────────────────────────
  if (isContactStep) {
    return (
      <QuizShell dark={dark} progress={100} onBack={() => setStep(step - 1)}>
        <h2 className={`font-display text-2xl mb-1 ${dark ? 'text-white' : 'text-forest'}`}>ใกล้เสร็จแล้ว — กรอกเพื่อรับ voucher</h2>
        <p className={`text-sm mb-5 ${dark ? 'text-white/60' : 'text-muted'}`}>
          ข้อมูลนี้ใช้เพื่อส่ง voucher และนัดหมายเท่านั้น
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field dark={dark} label="ชื่อ *">
              <input
                type="text"
                value={contact.first_name}
                onChange={e => setContact({ ...contact, first_name: e.target.value })}
                className={inputCls(dark)}
                placeholder={definition.allowAnonymous ? 'ชื่อ / nickname' : 'ชื่อจริง'}
              />
            </Field>
            <Field dark={dark} label="นามสกุล">
              <input
                type="text"
                value={contact.last_name}
                onChange={e => setContact({ ...contact, last_name: e.target.value })}
                className={inputCls(dark)}
              />
            </Field>
          </div>
          <Field dark={dark} label="เบอร์โทร *">
            <input
              type="tel"
              value={contact.phone}
              onChange={e => setContact({ ...contact, phone: e.target.value })}
              className={inputCls(dark)}
              placeholder="08X-XXX-XXXX"
            />
          </Field>
          <Field dark={dark} label="LINE ID (แนะนำ)">
            <input
              type="text"
              value={contact.line_id}
              onChange={e => setContact({ ...contact, line_id: e.target.value })}
              className={inputCls(dark)}
              placeholder="@your_line_id"
            />
          </Field>
          <Field dark={dark} label="Email (ทางเลือก)">
            <input
              type="email"
              value={contact.email}
              onChange={e => setContact({ ...contact, email: e.target.value })}
              className={inputCls(dark)}
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
              🔒 ยินยอมให้ รู้ก่อนดี(รู้งี้) และ W Medical Hospital เก็บและใช้ข้อมูลนี้
              ตาม{' '}
              <Link href="/privacy" target="_blank" className={dark ? 'text-mint underline' : 'text-forest underline'}>
                นโยบาย PDPA
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
            {loading ? 'กำลังส่ง…' : 'รับ Voucher ฟรี'}
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
    >
      <div className={`text-xs font-medium mb-1 ${dark ? 'text-white/50' : 'text-muted'}`}>
        คำถาม {step + 1} / {definition.questions.length}
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
            <p className={`text-xs mb-2 ${dark ? 'text-white/50' : 'text-muted'}`}>เลือกได้มากกว่า 1 ข้อ</p>
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

        {q.type === 'bmi' && <BmiStep dark={dark} value={answers[q.id] as BmiValue | undefined} onChange={v => setAnswer(q.id, v)} />}
        {q.type === 'basic' && <BasicStep dark={dark} value={answers[q.id] as BasicValue | undefined} onChange={v => setAnswer(q.id, v)} />}
      </div>

      <button
        type="button"
        disabled={!canProceed}
        onClick={() => setStep(step + 1)}
        className={`w-full mt-6 py-3.5 rounded-full font-bold text-base transition-all ${dark ? 'bg-mint text-neutral-900 hover:bg-mint/90' : 'bg-forest text-white hover:bg-sage'} disabled:opacity-40`}
      >
        ถัดไป →
      </button>
    </QuizShell>
  )
}

// ── Shell / helpers ───────────────────────────────────────────────────
function QuizShell({ dark, progress, onBack, children }: {
  dark?: boolean
  progress: number
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <main className={`min-h-screen flex items-center justify-center p-4 md:p-6 ${dark ? 'bg-neutral-900' : 'bg-gradient-to-br from-forest via-sage to-mint'}`}>
      <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl ${dark ? 'bg-neutral-800 border border-white/10' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          {onBack ? (
            <button type="button" onClick={onBack} className={`text-sm ${dark ? 'text-white/60' : 'text-muted'}`}>
              ← ย้อน
            </button>
          ) : (
            <Link href="/" className={`text-sm ${dark ? 'text-white/60' : 'text-muted'}`}>
              ← หน้าแรก
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

function BmiStep({ dark, value, onChange }: { dark?: boolean; value?: BmiValue; onChange: (v: BmiValue) => void }) {
  const v = value || {}
  const bmi = v.weight_kg && v.height_cm ? v.weight_kg / Math.pow(v.height_cm / 100, 2) : null
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field dark={dark} label="น้ำหนัก (กก.)">
          <input
            type="number"
            className={inputCls(dark)}
            value={v.weight_kg ?? ''}
            onChange={e => onChange({ ...v, weight_kg: Number(e.target.value) || undefined })}
          />
        </Field>
        <Field dark={dark} label="ส่วนสูง (ซม.)">
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
          BMI ของคุณ: {bmi.toFixed(1)}
        </div>
      )}
      <BasicStep dark={dark} value={v} onChange={(bv) => onChange({ ...v, ...bv })} />
    </div>
  )
}

function BasicStep({ dark, value, onChange }: { dark?: boolean; value?: BasicValue; onChange: (v: BasicValue) => void }) {
  const v = value || {}
  return (
    <div className="space-y-3">
      <Field dark={dark} label="อายุ (ปี)">
        <input
          type="number"
          className={inputCls(dark)}
          value={v.age ?? ''}
          onChange={e => onChange({ ...v, age: Number(e.target.value) || undefined })}
        />
      </Field>
      <Field dark={dark} label="เพศ">
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'f', label: 'หญิง' },
            { value: 'm', label: 'ชาย' },
            { value: 'x', label: 'ไม่สะดวกบอก' },
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
