'use client'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n/context'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [initialized, setInitialized] = useState(false)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!initialized) {
      setMessages([{ role: 'assistant', content: t.chat.initialMessage }])
      if (typeof window !== 'undefined') {
        sessionIdRef.current = window.sessionStorage.getItem('roogondee_chat_session')
      }
      setInitialized(true)
    }
  }, [t, initialized])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  const QUICK_REPLIES = [
    { label: t.chat.quickStd, text: t.chat.quickStdText },
    { label: t.chat.quickGlp1, text: t.chat.quickGlp1Text },
    { label: t.chat.quickCkd, text: t.chat.quickCkdText },
    { label: t.chat.quickForeign, text: t.chat.quickForeignText },
  ]

  const send = async (text: string = input.trim()) => {
    if (!text || loading) return
    setInput('')
    setShowQuickReplies(false)

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId: sessionIdRef.current }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || t.chat.errorMessage }])
      if (data.leadCaptured) setLeadCaptured(true)
      if (data.sessionId && typeof window !== 'undefined') {
        sessionIdRef.current = data.sessionId
        window.sessionStorage.setItem('roogondee_chat_session', data.sessionId)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t.chat.errorRetry }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-forest text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-sage transition-all hover:scale-110"
        aria-label={t.chat.openChat}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {!isOpen && (
        <span className="fixed bottom-[72px] right-5 z-50 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">!</span>
      )}

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-mint/20">
          <div className="bg-gradient-to-r from-forest to-sage px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">🌿</div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">{t.chat.brandName}</p>
              <p className="text-white/70 text-xs">{t.chat.brandDesc}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-leaf rounded-full animate-pulse"></div>
              <span className="text-white/60 text-xs">{t.chat.online}</span>
            </div>
          </div>

          {leadCaptured && (
            <div className="bg-mint/10 border-b border-mint/20 px-4 py-2 text-xs text-forest text-center flex-shrink-0">
              {t.chat.leadCaptured}
              <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="block font-bold mt-0.5 text-sage">💬 LINE @roogondee</a>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-forest text-white rounded-br-sm'
                    : 'bg-gray-50 text-gray-800 border border-mint/20 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {showQuickReplies && messages.length === 1 && (
              <div className="space-y-2">
                {QUICK_REPLIES.map(qr => (
                  <button
                    key={qr.label}
                    onClick={() => send(qr.text)}
                    className="w-full text-left px-3 py-2 bg-white border border-mint/25 rounded-xl text-xs text-forest font-medium hover:bg-mint/5 hover:border-mint/50 transition-all"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-mint/20 px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-muted">
                  <span className="animate-pulse">{t.chat.typing}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <p className="text-center text-[10px] text-gray-400 px-3 pb-1 flex-shrink-0">{t.chat.disclaimer}</p>

          <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={t.chat.inputPlaceholder}
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-mint transition-colors"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="bg-forest text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-sage transition-colors"
            >
              {t.chat.send}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
