'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Service } from '@/types'
import { getArticleQuiz, type ArticleQuizDefinition, type ArticleQuizTier } from '@/lib/quiz/article-quiz'
import { scoreArticleQuiz } from '@/lib/quiz/article-scoring'

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void
    fbq?: (command: 'track' | 'trackCustom', name: string, params?: Record<string, unknown>) => void
  }
}

function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', name, params) } catch {}
  try { window.fbq?.('trackCustom', name, params) } catch {}
}

interface Props {
  service: Service
  slug?: string
}

const TIER_STYLE: Record<ArticleQuizTier, { ring: string; chip: string; label: string }> = {
  high:   { ring: 'ring-rose-300 bg-rose-50',     chip: 'bg-rose-100 text-rose-700',     label: 'ความเสี่ยงสูง' },
  medium: { ring: 'ring-amber-300 bg-amber-50',   chip: 'bg-amber-100 text-amber-700',   label: 'ควรเฝ้าระวัง' },
  low:    { ring: 'ring-emerald-300 bg-emerald-50',chip: 'bg-emerald-100 text-emerald-700',label: 'ความเสี่ยงต่ำ' },
}

export default function ArticleQuiz({ service, slug }: Props) {
  const quiz = getArticleQuiz(service)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [done, setDone] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!quiz || startedRef.current) return
    startedRef.current = true
    track('article_quiz_view', { service, slug })
  }, [quiz, service, slug])

  if (!quiz) return null

  const total = quiz.questions.length
  const current = quiz.questions[step]
  const isLast = step === total - 1

  function selectRadio(qid: string, value: string) {
    const next = { ...answers, [qid]: value }
    setAnswers(next)
    track('article_quiz_progress', { service, slug, step: step + 1, total })
    if (isLast) finish(next)
    else setStep(step + 1)
  }

  function toggleMulti(qid: string, value: string) {
    const q = quiz!.questions.find(x => x.id === qid)
    if (!q) return
    const opt = q.options.find(o => o.value === value)
    const prev = (answers[qid] as string[]) || []
    let nextVal: string[]
    if (opt?.exclusive || value === 'none') {
      nextVal = prev.includes(value) ? [] : [value]
    } else {
      const filtered = prev.filter(v => {
        const o = q.options.find(x => x.value === v)
        return !(o?.exclusive || v === 'none')
      })
      nextVal = filtered.includes(value) ? filtered.filter(v => v !== value) : [...filtered, value]
    }
    setAnswers({ ...answers, [qid]: nextVal })
  }

  function nextMulti() {
    track('article_quiz_progress', { service, slug, step: step + 1, total })
    if (isLast) finish(answers)
    else setStep(step + 1)
  }

  function finish(finalAnswers: Record<string, string | string[]>) {
    const result = scoreArticleQuiz(quiz!, finalAnswers)
    track('article_quiz_complete', { service, slug, tier: result.tier, score: result.score })
    setDone(true)
  }

  function reset() {
    setStep(0)
    setAnswers({})
    setDone(false)
  }

  if (done) {
    const result = scoreArticleQuiz(quiz, answers)
    const msg = quiz.tierMessages[result.tier]
    const style = TIER_STYLE[result.tier]
    const fullCta = slug
      ? `${quiz.ctaHref}?utm_source=article&utm_medium=article_quiz&utm_campaign=${slug}`
      : `${quiz.ctaHref}?utm_source=article&utm_medium=article_quiz`
    return (
      <ResultCard
        ring={style.ring}
        chipClass={style.chip}
        chipLabel={style.label}
        headline={msg.headline}
        body={msg.body}
        ctaLabel={quiz.ctaLabel}
        ctaHref={fullCta}
        onReset={reset}
      />
    )
  }

  return (
    <section className="my-10 not-prose">
      <div className="bg-white border-2 border-mint/30 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-mint uppercase tracking-wide">แบบประเมินสั้น</span>
          <span className="text-xs text-muted">{step + 1} / {total}</span>
        </div>
        <p className="text-sm text-muted mb-4">{quiz.intro}</p>

        <div className="h-1.5 bg-mint/10 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-mint transition-all duration-300" style={{ width: `${((step) / total) * 100}%` }} />
        </div>

        <h3 className="font-display text-lg md:text-xl text-forest mb-4">{current.title}</h3>

        {current.type === 'radio' ? (
          <div className="grid gap-2">
            {current.options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => selectRadio(current.id, o.value)}
                className="text-left px-4 py-3 rounded-xl border border-mint/20 hover:border-mint hover:bg-mint/5 transition-all text-forest"
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              {current.options.map(o => {
                const selected = ((answers[current.id] as string[]) || []).includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleMulti(current.id, o.value)}
                    className={`text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                      selected
                        ? 'border-mint bg-mint/10 text-forest'
                        : 'border-mint/20 hover:border-mint/60 text-forest'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? 'border-mint bg-mint text-white' : 'border-mint/30'
                    }`}>
                      {selected && '✓'}
                    </span>
                    <span>{o.label}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={nextMulti}
              disabled={!((answers[current.id] as string[]) || []).length}
              className="mt-4 w-full bg-mint text-white font-semibold py-3 rounded-xl hover:bg-mint/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLast ? 'ดูผลประเมิน' : 'ถัดไป'}
            </button>
          </>
        )}

        <p className="text-[11px] text-muted/70 mt-4 text-center">
          ผลเป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์
        </p>
      </div>
    </section>
  )
}

function ResultCard(props: {
  ring: string
  chipClass: string
  chipLabel: string
  headline: string
  body: string
  ctaLabel: string
  ctaHref: string
  onReset: () => void
}) {
  return (
    <section className="my-10 not-prose">
      <div className={`rounded-2xl ring-2 ${props.ring} p-5 md:p-6`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${props.chipClass}`}>{props.chipLabel}</span>
          <span className="text-xs text-muted">ผลประเมินเบื้องต้น</span>
        </div>
        <h3 className="font-display text-xl md:text-2xl text-forest mb-2 leading-tight">{props.headline}</h3>
        <p className="text-forest/80 mb-5 leading-relaxed">{props.body}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href={props.ctaHref}
            className="flex-1 bg-mint text-white font-semibold py-3 px-5 rounded-xl text-center hover:bg-mint/90 transition-all"
          >
            {props.ctaLabel}
          </Link>
          <button
            type="button"
            onClick={props.onReset}
            className="px-5 py-3 rounded-xl border border-mint/30 text-forest hover:bg-mint/5 transition-all"
          >
            ทำใหม่
          </button>
        </div>
        <p className="text-[11px] text-muted/70 mt-4">
          ผลคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย หากมีข้อสงสัยควรปรึกษาแพทย์
        </p>
      </div>
    </section>
  )
}
