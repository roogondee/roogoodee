'use client'
import { useState, useRef, useEffect, type FormEvent } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  crisis?: boolean
}

interface Props {
  voucherCode: string
  firstName: string
}

const GREETING = (firstName: string) => `สวัสดีค่ะคุณ ${firstName} 🌱

ขอบคุณที่ใช้เวลามาคุยกับฉันก่อน session นะคะ — ฉันเป็น AI ผู้ช่วยของ Roogondee ทำหน้าที่ช่วยเก็บข้อมูลเบื้องต้นเพื่อให้นักจิตวิทยา/จิตแพทย์ของคุณเข้าใจคุณได้เร็วขึ้นใน session จริง

**สิ่งที่ฉันทำได้และไม่ทำ**
• ✅ รับฟัง ถามคำถาม ส่งสรุปให้คุณหมอ
• ❌ ไม่วินิจฉัย ไม่ให้คำแนะนำการรักษา ไม่แนะนำยา
• 🆘 ถ้ารู้สึกหนักมาก โทร 1323 ฟรี 24 ชม. ได้เสมอ

เริ่มจากตรงไหนก็ได้นะคะ — อยากเล่าเรื่องที่กวนใจตอนนี้ก่อนไหม?`

export default function MindIntakeClient({ voucherCode, firstName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING(firstName) },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [ended, setEnded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending || ended) return

    setMessages(m => [...m, { role: 'user', content: text }])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/mind-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucher: voucherCode, message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${data.error || 'เกิดข้อผิดพลาด'}` }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.reply, crisis: Boolean(data.crisis_flag) }])
        if (data.ended) setEnded(true)
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ เชื่อมต่อไม่สำเร็จ ลองส่งใหม่' }])
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(e as unknown as FormEvent)
    }
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      {/* Top bar with crisis hotline always visible */}
      <header className="px-4 md:px-8 py-3 bg-white border-b border-violet-100 flex items-center justify-between gap-2">
        <Link href="/mind" className="text-sm text-muted hover:text-forest">
          ← Mind
        </Link>
        <div className="text-xs text-muted text-center">
          <span className="font-bold text-violet-700">Pre-session intake</span> · {voucherCode}
        </div>
        <a href="tel:1323" className="bg-rose-600 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-rose-700 transition-all whitespace-nowrap">
          🆘 1323
        </a>
      </header>

      {/* Notice strip */}
      <div className="px-4 md:px-8 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
        <strong>โปรดทราบ:</strong> ฉันเป็น AI ผู้ช่วย ไม่ใช่นักจิตวิทยา · ข้อมูลของคุณจะส่งให้ผู้เชี่ยวชาญที่จะดูแลคุณก่อน session
      </div>

      {/* Chat scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-forest text-white rounded-br-sm'
                  : m.crisis
                    ? 'bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-bl-sm'
                    : 'bg-white border border-violet-100 text-forest rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-violet-100 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-muted">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
          {ended && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 text-center text-sm text-violet-900">
              ขอบคุณค่ะ — สรุปจะถูกส่งให้คุณหมอก่อน session 🌱<br/>
              <Link href="/mind" className="inline-block mt-3 text-violet-700 underline">กลับหน้า Mind</Link>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={send} className="border-t border-violet-100 bg-white px-4 md:px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending || ended}
            placeholder={ended ? 'session จบแล้ว' : 'พิมพ์ข้อความ... (Enter เพื่อส่ง · Shift+Enter ขึ้นบรรทัดใหม่)'}
            rows={2}
            maxLength={2000}
            className="flex-1 resize-none border border-violet-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:bg-gray-50 disabled:text-muted"
          />
          <button
            type="submit"
            disabled={sending || ended || !input.trim()}
            className="bg-forest text-white px-5 py-3 rounded-full text-sm font-bold hover:bg-sage transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            ส่ง
          </button>
        </div>
        <p className="text-[10px] text-muted/60 text-center mt-2">
          ข้อมูลของคุณเป็นความลับตาม PDPA · ลบอัตโนมัติหลัง 90 วัน
        </p>
      </form>
    </main>
  )
}
