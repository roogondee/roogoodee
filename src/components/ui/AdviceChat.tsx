'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/context'
import { track, persistClickId } from '@/lib/analytics/track'
import { serviceRoute } from '@/lib/advice/routes'

// General-illness advice chat for the /advice Google Ads landing page.
// Kept as its own component (not a variant of ChatWidget) because the two
// have different jobs: ChatWidget is a floating sales assistant scoped to
// five services; this is an inline, symptom-first chat with a hard safety
// layer (see src/lib/advice/triage.ts) that must run before every reply.
//
// Written to be embeddable — no fixed/floating positioning, no assumption
// about page chrome — so a pillar page could render it inline later. Not
// wired into any pillar page yet (see CLAUDE.md decision log): we want to
// see how /advice performs against paid search before touching funnels that
// already convert.

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type TriageLevel = 'routine' | 'urgent' | 'emergency'

const SESSION_KEY = 'roogondee_advice_session'

export default function AdviceChat({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const a = t.advice
  const searchParams = useSearchParams()

  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: a.initialMessage }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [triageLevel, setTriageLevel] = useState<TriageLevel>('routine')
  const [suggested, setSuggested] = useState<{ label: string; url: string } | null>(null)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [showChips, setShowChips] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const viewedRef = useRef(false)
  const assessmentTrackedRef = useRef(false)

  const CHIPS = [
    a.chip1, a.chip2, a.chip3, a.chip4, a.chip5, a.chip6, a.chip7, a.chip8,
  ]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionIdRef.current = window.sessionStorage.getItem(SESSION_KEY)
    }
    if (!viewedRef.current) {
      viewedRef.current = true
      track('advice_start')
      // gclid persisted so a lead created several messages into the chat —
      // possibly after the visitor closed and reopened the tab — still
      // carries the click id back to Google Ads for offline conversion import.
      persistClickId('advice_gclid', searchParams?.get('gclid'))
    }
  }, [searchParams])

  // The greeting is captured into state on the first render, but i18n resolves
  // the locale client-side after that — so a visitor could be left with a
  // greeting in the wrong language above an otherwise-Thai page. Re-sync it
  // while the conversation hasn't started yet.
  useEffect(() => {
    setMessages(prev =>
      prev.length === 1 && prev[0].role === 'assistant' && prev[0].content !== a.initialMessage
        ? [{ role: 'assistant', content: a.initialMessage }]
        : prev
    )
  }, [a.initialMessage])

  // Scroll the message list itself — never the page. scrollIntoView() walks up
  // and scrolls every scrollable ancestor, and because this chat is inline on
  // the landing page (not a fixed floating widget like ChatWidget) that yanked
  // the whole page down on every reply, which read as the page jumping around
  // while you were trying to read or type.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const send = async (text: string = input.trim()) => {
    if (!text || loading) return
    setInput('')
    setShowChips(false)

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    track('advice_message')

    try {
      const attribution = {
        utm_source: searchParams?.get('utm_source') || undefined,
        utm_medium: searchParams?.get('utm_medium') || undefined,
        utm_campaign: searchParams?.get('utm_campaign') || undefined,
        gclid: searchParams?.get('gclid') || undefined,
      }
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          sessionId: sessionIdRef.current,
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          attribution,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || a.errorMessage }])

      if (data.triage === 'emergency' || data.triage === 'urgent') {
        setTriageLevel(data.triage)
        track(data.triage === 'emergency' ? 'advice_emergency' : 'advice_urgent')
      }
      if (data.suggestedService) {
        setSuggested(serviceRoute(data.suggestedService))
        track('advice_service_suggested', { service: data.suggestedService })
      }
      // Fires once, on the turn the intake hands off to the assessment. This is
      // the middle of the funnel: advice_start → advice_assessment → advice_lead
      // tells us whether we lose people during history-taking or at the ask.
      if (data.phase === 'assessment_done' && !assessmentTrackedRef.current) {
        assessmentTrackedRef.current = true
        track('advice_assessment')
      }
      if (data.leadCaptured) {
        setLeadCaptured(true)
        track('advice_lead')
      }
      if (data.sessionId && typeof window !== 'undefined') {
        sessionIdRef.current = data.sessionId
        window.sessionStorage.setItem(SESSION_KEY, data.sessionId)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: a.errorRetry }])
    } finally {
      setLoading(false)
    }
  }

  // The "common symptoms" section further down /advice links here as
  // /advice?symptom=...#advice-chat so a click there behaves exactly like
  // typing the symptom in — same prompt, same triage, same tools. Guarded by
  // a ref (not just messages.length) so React 18 Strict Mode's double-invoke
  // in dev can't fire it twice.
  const consumedSymptomRef = useRef(false)
  useEffect(() => {
    const symptom = searchParams?.get('symptom')
    if (!symptom || consumedSymptomRef.current) return
    consumedSymptomRef.current = true
    send(symptom)
    // One-shot: drop the param so a refresh doesn't resend it.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('symptom')
      window.history.replaceState(window.history.state, '', url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className={`bg-white rounded-3xl shadow-xl border border-mint/15 flex flex-col overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-forest to-sage px-5 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-base">🩺</div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">{a.chatTitle}</p>
          <p className="text-white/70 text-xs mt-1">{a.chatSubtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-leaf rounded-full animate-pulse"></div>
          <span className="text-white/60 text-xs">{t.chat.online}</span>
        </div>
      </div>

      {triageLevel === 'emergency' && (
        <a
          href="tel:1669"
          onClick={() => track('advice_1669_call_click')}
          className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 flex-shrink-0 animate-pulse"
        >
          🚑 {a.emergencyBannerText} — 📞 {a.emergencyBannerCta}
        </a>
      )}
      {triageLevel === 'urgent' && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-xs text-center flex-shrink-0">
          ⚠️ {a.urgentBannerText}
        </div>
      )}

      {leadCaptured && (
        <div className="bg-mint/10 border-b border-mint/20 px-4 py-2 text-xs text-forest text-center flex-shrink-0">
          {a.leadCaptured}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[320px] max-h-[480px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-forest text-white rounded-br-sm'
                : 'bg-gray-50 text-gray-800 border border-mint/20 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {showChips && messages.length === 1 && (
          <div>
            <p className="text-xs text-muted mb-2">{a.chipsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="px-3 py-1.5 bg-white border border-mint/25 rounded-full text-xs text-forest font-medium hover:bg-mint/5 hover:border-mint/50 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {suggested && (
          <div className="bg-mint/5 border border-mint/25 rounded-2xl p-3.5 space-y-2">
            <p className="text-xs text-forest font-semibold">{a.ctaSuggestedLabel} {suggested.label}</p>
            <a
              href={suggested.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('advice_cta_click', { service: suggested.label })}
              className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-4 py-2.5 rounded-full text-sm font-bold hover:brightness-95 transition-all"
            >
              💬 {a.ctaLineButton}
            </a>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-mint/20 px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-muted">
              <span className="animate-pulse">{a.typing}</span>
            </div>
          </div>
        )}
      </div>

      {/* Follow-up rail — the endgame for every conversation, service match or
          not: add LINE and message us (or call) if questions come up or the
          symptoms don't improve, so the team can follow up and hand the lead
          to the partner hospital when self-care isn't enough. Shown once the
          AI has answered at least once; hidden while the service CTA card is
          up so the two green buttons don't stack. */}
      {messages.length >= 3 && !suggested && (
        <div className="border-t border-gray-100 px-3 py-2 flex-shrink-0">
          <p className="text-[11px] text-muted text-center mb-1.5">{a.followUpText}</p>
          <div className="flex gap-2">
            <a
              href="https://line.me/ti/p/@roogondee"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('advice_followup_line_click')}
              className="flex-1 flex items-center justify-center gap-1 bg-[#06C755] text-white px-3 py-2 rounded-full text-xs font-bold hover:brightness-95 transition-all"
            >
              {a.followUpLineBtn}
            </a>
            <a
              href="tel:0819023540"
              onClick={() => track('advice_followup_call_click')}
              className="flex-1 flex items-center justify-center gap-1 border border-forest/30 text-forest px-3 py-2 rounded-full text-xs font-bold hover:bg-mint/10 transition-all"
            >
              {a.followUpCallBtn}
            </a>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-gray-400 px-3 pb-1 flex-shrink-0">{a.disclaimer}</p>

      <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={a.inputPlaceholder}
          className="flex-1 text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-mint transition-colors"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="bg-forest text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-sage transition-colors"
        >
          {t.chat.send}
        </button>
      </div>
    </div>
  )
}
