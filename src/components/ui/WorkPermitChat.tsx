'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/context'
import { track, persistClickId } from '@/lib/analytics/track'

// Work Permit renewal Q&A bot, inline at the top of /foreign/workpermit.
// Deliberately its own component (not AdviceChat) — different audience
// (employers/workers asking about a government deadline, not someone sick),
// different backend (/api/workpermit-chat), different tool set (create_lead
// only, no recommend_service / submit_intake). See src/lib/workpermit/prompt.ts
// for what it can and can't say.
//
// The chat's own UI chrome (title, chips, placeholder, errors) is translated
// via t.foreignWorkpermit.chat* below. The AI's replies are separately
// language-matched server-side (WORKPERMIT_SYSTEM_PROMPT), so sending a
// translated chip's text as the outgoing message naturally gets a reply in
// that same language.

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type TriageLevel = 'routine' | 'urgent' | 'emergency'

const SESSION_KEY = 'roogondee_workpermit_session'

// `surface` tags workpermit_chat_start so homepage views (where the chat is
// open on every visit) don't inflate the landing page's chat-start count.
// Leads keep source 'workpermit-chat' on both — on-site vs paid is already
// told apart by the absence of gclid/utm_*, same as /advice.
export default function WorkPermitChat({ className = '', surface = 'workpermit' }: { className?: string; surface?: 'workpermit' | 'home' }) {
  const { t } = useTranslation()
  const w = t.foreignWorkpermit
  const searchParams = useSearchParams()

  const CHIPS = [w.chatChip1, w.chatChip2, w.chatChip3, w.chatChip4]

  // The greeting is rendered from i18n on every pass (below), not frozen into
  // state on mount — the locale resolves client-side one tick after mount, so
  // a state-captured greeting would strand a Burmese visitor with a Thai first
  // line even after the rest of the widget switches over.
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [triageLevel, setTriageLevel] = useState<TriageLevel>('routine')
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [showChips, setShowChips] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionIdRef.current = window.sessionStorage.getItem(SESSION_KEY)
    }
    if (!viewedRef.current) {
      viewedRef.current = true
      track('workpermit_chat_start', { surface })
      // gclid persisted so a lead created several messages in still carries
      // the click id back to Google Ads for offline conversion import.
      persistClickId('gclid', searchParams?.get('gclid'))
    }
  }, [searchParams, surface])

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

    try {
      const attribution = {
        utm_source: searchParams?.get('utm_source') || undefined,
        utm_medium: searchParams?.get('utm_medium') || undefined,
        utm_campaign: searchParams?.get('utm_campaign') || undefined,
        gclid: searchParams?.get('gclid') || undefined,
      }
      const res = await fetch('/api/workpermit-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          sessionId: sessionIdRef.current,
          attribution,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || w.chatErrorGeneral }])

      if (data.triage === 'emergency' || data.triage === 'urgent') {
        setTriageLevel(data.triage)
      }
      if (data.leadCaptured) {
        setLeadCaptured(true)
        track('workpermit_chat_lead')
      }
      if (data.sessionId && typeof window !== 'undefined') {
        sessionIdRef.current = data.sessionId
        window.sessionStorage.setItem(SESSION_KEY, data.sessionId)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: w.chatErrorConnection }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-3xl shadow-xl border border-mint/15 flex flex-col overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-forest to-sage px-5 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-base">💬</div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">{w.chatTitle}</p>
          <p className="text-white/70 text-xs mt-1">{w.chatSubtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-leaf rounded-full animate-pulse"></div>
          <span className="text-white/60 text-xs">{w.chatOnline}</span>
        </div>
      </div>

      {triageLevel === 'emergency' && (
        <a
          href="tel:1669"
          className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 flex-shrink-0 animate-pulse"
        >
          {w.chatEmergencyBanner}
        </a>
      )}
      {triageLevel === 'urgent' && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-xs text-center flex-shrink-0">
          {w.chatUrgentBanner}
        </div>
      )}

      {leadCaptured && (
        <div className="bg-mint/10 border-b border-mint/20 px-4 py-2 text-xs text-forest text-center flex-shrink-0">
          {w.chatLeadCaptured}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[260px] max-h-[400px]">
        <div className="flex justify-start">
          <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 text-gray-800 border border-mint/20 rounded-bl-sm">
            {w.chatGreeting}
          </div>
        </div>

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

        {showChips && messages.length === 0 && (
          <div>
            <p className="text-xs text-muted mb-2">{w.chatChipsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="px-3 py-1.5 bg-white border border-amber-300/60 rounded-full text-xs text-forest font-medium hover:bg-amber-50 hover:border-amber-400 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-mint/20 px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-muted">
              <span className="animate-pulse">{w.chatTyping}</span>
            </div>
          </div>
        )}
      </div>

      {messages.length >= 2 && (
        <div className="border-t border-gray-100 px-3 py-2 flex-shrink-0">
          <p className="text-[11px] text-muted text-center mb-1.5">{w.chatDirectPrompt}</p>
          <div className="flex gap-2">
            <a href="tel:0819023540" onClick={() => track('workpermit_call_click', { position: 'chat' })}
              className="flex-1 flex items-center justify-center gap-1 bg-amber-500 text-white px-3 py-2 rounded-full text-xs font-bold">
              📞 081-902-3540
            </a>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" onClick={() => track('workpermit_line_click', { position: 'chat' })}
              className="flex-1 flex items-center justify-center gap-1 bg-[#06C755] text-white px-3 py-2 rounded-full text-xs font-bold">
              💬 {w.chatLineLabel}
            </a>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-gray-400 px-3 pb-1 flex-shrink-0">
        {w.chatDisclaimer}
      </p>

      <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={w.chatInputPlaceholder}
          className="flex-1 text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-mint transition-colors"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="bg-forest text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-sage transition-colors"
        >
          {w.chatSend}
        </button>
      </div>
    </div>
  )
}
