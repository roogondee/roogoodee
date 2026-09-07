'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import { track, readUtm, persistClickId } from '@/lib/analytics/track'
import { MOU_TOPICS, matchMouTopic, type MouAction, type MouTopic } from '@/lib/foreign/mou-chat'
import { trackCallClick } from '@/components/ui/MouLeadForm'

// Inline Q&A assistant for /foreign/mou. Unlike AdviceChat (LLM, symptom
// intake) this one answers from a fixed set of MOU / Work Permit facts — see
// src/lib/foreign/mou-chat.ts for why that is deliberate — and its whole job
// is to move the visitor into a call, a LINE chat or a callback request. The
// callback form is inline in the thread so an employer who just got a price
// answer never has to scroll back down to the page form.

const PHONE_TEL = 'tel:0819023540'
const PHONE_DISPLAY = '081-902-3540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'
// Chips shown before "see all questions" — the five highest-intent topics.
const VISIBLE_CHIPS = 5
// Answers given before the callback offer appears. Two means the visitor has
// shown real interest; asking on the first answer reads as a bait-and-switch.
const LEAD_OFFER_AFTER = 2

interface Msg {
  role: 'user' | 'bot'
  text: string
  actions?: MouAction[]
  topicId?: string
}

export default function MouChat() {
  const { t } = useTranslation()
  const m = t.foreignMou
  const searchParams = useSearchParams()

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [showAllChips, setShowAllChips] = useState(false)
  const [asked, setAsked] = useState<string[]>([])
  const [answerCount, setAnswerCount] = useState(0)
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadDismissed, setLeadDismissed] = useState(false)
  const [leadDone, setLeadDone] = useState(false)
  const [lead, setLead] = useState({ first_name: '', phone: '' })
  const [honeypot, setHoneypot] = useState('')
  const [consent, setConsent] = useState(false)
  const [leadLoading, setLeadLoading] = useState(false)
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    track('mou_chat_view', { service: 'foreign' })
    persistClickId('ttclid', searchParams?.get('ttclid'))
  }, [searchParams])

  // The greeting is rendered from i18n on every pass rather than being frozen
  // into state on mount, because the locale is resolved client-side one tick
  // later — a state-captured greeting would strand a Burmese visitor with a
  // Thai first line above an otherwise Burmese page.

  // Scroll the thread, never the page: this chat is inline in the landing
  // page, so scrollIntoView() would drag the whole page on every answer.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, leadOpen, leadDone])

  const answer = (topic: MouTopic, question: string, mode: 'chip' | 'text') => {
    setMessages(prev => [
      ...prev,
      { role: 'user', text: question },
      { role: 'bot', text: m[topic.a], actions: topic.actions, topicId: topic.id },
    ])
    setAsked(prev => (prev.includes(topic.id) ? prev : [...prev, topic.id]))
    setAnswerCount(n => n + 1)
    track('mou_chat_question', { service: 'foreign', topic: topic.id, mode })
  }

  const askChip = (topic: MouTopic) => answer(topic, m[topic.q], 'chip')

  const send = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    const topic = matchMouTopic(text)
    if (topic) {
      answer(topic, text, 'text')
      return
    }
    // No confident match — hand over to the team rather than guess. The typed
    // question is NOT sent to analytics: free text on this page routinely
    // carries names, passport numbers and phone numbers.
    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'bot', text: m.chatFallback, actions: ['call', 'line', 'form'] },
    ])
    setAnswerCount(n => n + 1)
    track('mou_chat_no_match', { service: 'foreign' })
  }

  const openLead = (position: string) => {
    setLeadOpen(true)
    track('mou_chat_lead_open', { service: 'foreign', position })
  }

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!lead.first_name.trim()) errs.first_name = m.errorName
    if (!/^0\d{8,9}$/.test(lead.phone.replace(/[-\s]/g, ''))) errs.phone = m.errorPhone
    if (!consent) errs.consent = m.errorConsent
    setLeadErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLeadLoading(true)
    try {
      const utm = readUtm(searchParams)
      // The topics asked are the sales team's opening line — someone who asked
      // about group pricing needs a quote, not a generic callback script.
      const askedLabels = asked
        .map(id => MOU_TOPICS.find(topic => topic.id === id))
        .filter((topic): topic is MouTopic => Boolean(topic))
        .map(topic => m[topic.q])
      const note = ['ถามผ่านแชท MOU', askedLabels.length > 0 && `คำถามที่ถาม: ${askedLabels.join(' / ')}`]
        .filter(Boolean)
        .join(' | ')
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'foreign',
          first_name: lead.first_name.trim(),
          phone: lead.phone.replace(/[-\s]/g, ''),
          note,
          source: 'mou-chat',
          consent_pdpa: true,
          consent_at: new Date().toISOString(),
          website: honeypot,
          ...utm,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setLeadErrors({ submit: data.error || m.errorGeneral })
        return
      }
      setLeadDone(true)
      setLeadOpen(false)
      const eventId = `mou-chat-${data.id ?? Date.now()}`
      track('mou_chat_lead_submit', { service: 'foreign', topics: asked.join(',') })
      try {
        window.fbq?.('track', 'Lead', { content_category: 'foreign_mou', content_name: 'MOU Chat' }, { eventID: eventId })
      } catch {}
      try {
        window.ttq?.track('SubmitForm', { content_id: eventId, content_name: 'MOU Chat Lead', content_type: 'lead' }, { event_id: eventId })
      } catch {}
    } catch {
      setLeadErrors({ submit: m.errorGeneral })
    } finally {
      setLeadLoading(false)
    }
  }

  const ActionRow = ({ actions, topicId }: { actions: MouAction[]; topicId?: string }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map(action => {
        if (action === 'call') {
          return (
            <a key={action} href={PHONE_TEL} onClick={() => trackCallClick(`chat_${topicId || 'fallback'}`)}
              className="inline-flex items-center gap-1.5 bg-amber-500 text-white px-3.5 py-2 rounded-full text-xs font-bold hover:bg-amber-600 transition-colors">
              📞 {m.chatActionCall}
            </a>
          )
        }
        if (action === 'line') {
          return (
            <a key={action} href={LINE_URL} target="_blank" rel="noopener noreferrer"
              onClick={() => track('mou_chat_line_click', { service: 'foreign', topic: topicId || 'fallback' })}
              className="inline-flex items-center gap-1.5 bg-[#06C755] text-white px-3.5 py-2 rounded-full text-xs font-bold hover:brightness-95 transition-all">
              💬 {m.chatActionLine}
            </a>
          )
        }
        return (
          <button key={action} type="button" onClick={() => openLead(topicId || 'fallback')}
            className="inline-flex items-center gap-1.5 border border-forest/30 text-forest px-3.5 py-2 rounded-full text-xs font-semibold hover:bg-forest hover:text-white transition-colors">
            {m.chatActionForm}
          </button>
        )
      })}
    </div>
  )

  const remainingChips = MOU_TOPICS.filter(topic => !asked.includes(topic.id))
  const chips = showAllChips ? remainingChips : remainingChips.slice(0, VISIBLE_CHIPS)
  const offerLead = !leadOpen && !leadDone && !leadDismissed && answerCount >= LEAD_OFFER_AFTER

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-amber-100 flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-base">💬</div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">{m.chatTitle}</p>
          <p className="text-white/80 text-xs mt-1">{m.chatSubtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white/80 text-xs">{t.chat.online}</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[340px] max-h-[520px]">
        <div className="flex justify-start">
          <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed whitespace-pre-wrap bg-amber-50 text-gray-800 border border-amber-100">
            {m.chatGreeting}
          </div>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-forest text-white rounded-br-sm'
                : 'bg-amber-50 text-gray-800 border border-amber-100 rounded-bl-sm'
            }`}>
              {msg.text}
              {msg.role === 'bot' && msg.actions && <ActionRow actions={msg.actions} topicId={msg.topicId} />}
            </div>
          </div>
        ))}

        {offerLead && (
          <div className="bg-forest/5 border border-forest/15 rounded-2xl p-3.5">
            <p className="text-xs text-forest font-semibold mb-2">{m.chatLeadPrompt}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openLead('offer')}
                className="bg-forest text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-sage transition-colors">
                {m.chatLeadYes}
              </button>
              <button type="button" onClick={() => setLeadDismissed(true)}
                className="border border-gray-200 text-muted px-4 py-2 rounded-full text-xs font-semibold hover:border-gray-300 transition-colors">
                {m.chatLeadLater}
              </button>
            </div>
          </div>
        )}

        {leadOpen && !leadDone && (
          <form onSubmit={submitLead} className="bg-white border border-amber-200 rounded-2xl p-4 space-y-3 shadow-sm">
            <p className="text-sm font-semibold text-forest">{m.chatLeadTitle}</p>
            <p className="text-xs text-muted leading-relaxed">{m.chatLeadDesc}</p>
            {/* Honeypot — hidden from humans, bots fill it in */}
            <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input type="text" value={lead.first_name} onChange={e => setLead({ ...lead, first_name: e.target.value })}
                  placeholder={`${m.fieldName} *`}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${leadErrors.first_name ? 'border-red-400' : 'border-gray-200 focus:border-amber-400'}`} />
                {leadErrors.first_name && <p className="text-red-500 text-xs mt-1">{leadErrors.first_name}</p>}
              </div>
              <div>
                <input type="tel" value={lead.phone} onChange={e => setLead({ ...lead, phone: e.target.value })}
                  placeholder={`${m.fieldPhone} *`}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${leadErrors.phone ? 'border-red-400' : 'border-gray-200 focus:border-amber-400'}`} />
                {leadErrors.phone && <p className="text-red-500 text-xs mt-1">{leadErrors.phone}</p>}
              </div>
            </div>
            <label className="flex items-start gap-2 text-[11px] text-rtext cursor-pointer leading-relaxed">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-forest shrink-0" />
              <span>
                🔒 {t.contact.pdpaConsent}{' '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-forest underline hover:text-sage">
                  {t.common.privacyPolicy}
                </Link>
              </span>
            </label>
            {leadErrors.consent && <p className="text-red-500 text-xs">{leadErrors.consent}</p>}
            {leadErrors.submit && <p className="text-red-500 text-xs text-center">{leadErrors.submit}</p>}
            <button type="submit" disabled={leadLoading}
              className="w-full bg-forest text-white py-3 rounded-full font-bold text-sm hover:bg-sage transition-colors disabled:opacity-70">
              {leadLoading ? m.submitting : m.chatLeadSubmit}
            </button>
          </form>
        )}

        {leadDone && (
          <div className="bg-mint/10 border border-mint/25 rounded-2xl p-3.5">
            <p className="text-sm text-forest font-semibold mb-2">✅ {m.chatLeadSuccess}</p>
            <div className="flex flex-wrap gap-2">
              <a href={PHONE_TEL} onClick={() => trackCallClick('chat_lead_success')}
                className="inline-flex items-center gap-1.5 bg-amber-500 text-white px-3.5 py-2 rounded-full text-xs font-bold hover:bg-amber-600 transition-colors">
                📞 {PHONE_DISPLAY}
              </a>
              <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
                onClick={() => track('mou_chat_line_click', { service: 'foreign', topic: 'lead_success' })}
                className="inline-flex items-center gap-1.5 bg-[#06C755] text-white px-3.5 py-2 rounded-full text-xs font-bold hover:brightness-95 transition-all">
                💬 LINE @roogondee
              </a>
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div className="pt-1">
            <p className="text-xs text-muted mb-2">{messages.length === 0 ? m.chatChipsLabel : m.chatAskAnother}</p>
            <div className="flex flex-wrap gap-2">
              {chips.map(topic => (
                <button key={topic.id} type="button" onClick={() => askChip(topic)}
                  className="px-3 py-1.5 bg-white border border-amber-200 rounded-full text-xs text-forest font-medium hover:bg-amber-50 hover:border-amber-400 transition-all text-left">
                  {m[topic.q]}
                </button>
              ))}
              {!showAllChips && remainingChips.length > VISIBLE_CHIPS && (
                <button type="button" onClick={() => setShowAllChips(true)}
                  className="px-3 py-1.5 border border-dashed border-gray-300 rounded-full text-xs text-muted hover:border-gray-400 transition-all">
                  {m.chatMore}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-gray-400 px-3 pb-1 flex-shrink-0">{m.chatDisclaimer}</p>

      <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t.chat.inputPlaceholder}
          className="flex-1 text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-amber-400 transition-colors"
        />
        <button type="button" onClick={send} disabled={!input.trim()}
          className="bg-forest text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-sage transition-colors">
          {t.chat.send}
        </button>
      </div>
    </div>
  )
}
