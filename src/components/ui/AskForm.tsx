'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n/context'

const SERVICE_COLORS: Record<string, string> = {
  std: 'bg-rose-50 border-rose-200', glp1: 'bg-emerald-50 border-emerald-200',
  ckd: 'bg-blue-50 border-blue-200', foreign: 'bg-amber-50 border-amber-200', general: 'bg-gray-50 border-gray-200',
}

export default function AskForm() {
  const { t } = useTranslation()
  const ak = t.ask
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<{ text: string; service: string } | null>(null)
  const [error, setError] = useState('')
  const answerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('suggest-btn')) {
        const q = target.getAttribute('data-question')
        if (q) setQuestion(q)
        setAnswer(null); setError('')
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => { if (answer) answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [answer])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || q.length < 5) { setError(ak.minChars); return }
    setLoading(true); setAnswer(null); setError('')
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) })
      const data = await res.json()
      if (!res.ok || data.error) setError(data.error || ak.errorGeneral)
      else setAnswer({ text: data.answer, service: data.service })
    } catch { setError(ak.errorGeneral) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white border border-mint/20 rounded-2xl p-6">
        <label className="block text-sm font-semibold text-forest mb-3">{ak.askLabel}</label>
        <textarea value={question} onChange={e => { setQuestion(e.target.value); setError('') }}
          placeholder={ak.askPlaceholder} rows={4} maxLength={500}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-forest focus:outline-none focus:border-mint resize-none transition-colors" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{question.length}/500</span>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
        <button type="submit" disabled={loading || question.trim().length < 5}
          className="mt-4 w-full bg-forest text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-sage transition-colors flex items-center justify-center gap-2">
          {loading ? (<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>{ak.searching}</>) : ak.getAnswer}
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-2">{ak.askDisclaimer}</p>
      </form>

      {answer && (
        <div ref={answerRef} className={`border rounded-2xl p-6 ${SERVICE_COLORS[answer.service] || SERVICE_COLORS.general}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-forest/10 rounded-full flex items-center justify-center text-sm">🌿</div>
            <div><p className="font-semibold text-forest text-sm">{ak.expertName}</p><p className="text-xs text-muted">{ak.answeredJustNow}</p></div>
          </div>
          <div className="bg-white/80 rounded-xl p-4">
            <p className="text-xs text-muted font-semibold mb-2 italic">&ldquo;{question}&rdquo;</p>
            <p className="text-sm text-forest leading-relaxed whitespace-pre-wrap">{answer.text}</p>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a href="/contact" className="flex-1 text-center bg-forest text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-sage transition-colors">{ak.consultPrivate}</a>
            <button onClick={() => { setAnswer(null); setQuestion('') }} className="flex-1 text-center border border-gray-200 text-muted py-2.5 rounded-xl text-sm hover:border-mint transition-colors">{ak.askNew}</button>
          </div>
        </div>
      )}
    </div>
  )
}
