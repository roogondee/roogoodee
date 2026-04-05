'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'สวัสดีค่ะ 🌿 รู้ก่อนดียินดีให้คำปรึกษาสุขภาพฟรี ไม่ตัดสิน\n\nมีเรื่องอะไรอยากปรึกษาคะ? (STD/PrEP, ลดน้ำหนัก GLP-1, โรคไต, ตรวจแรงงาน)',
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || 'ขออภัยค่ะ เกิดข้อผิดพลาด' }])
      if (data.leadCaptured) setLeadCaptured(true)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'ขออภัยค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-forest text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-sage transition-all hover:scale-110"
        aria-label="เปิด Chat"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-mint/20">
          {/* Header */}
          <div className="bg-gradient-to-r from-forest to-sage px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">🌿</div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">รู้ก่อนดี</p>
              <p className="text-white/70 text-xs">ปรึกษาฟรี ไม่ตัดสิน</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-leaf rounded-full animate-pulse"></div>
          </div>

          {/* Lead captured banner */}
          {leadCaptured && (
            <div className="bg-mint/10 border-b border-mint/20 px-4 py-2 text-xs text-forest text-center">
              ✅ รับข้อมูลแล้วค่ะ ทีมจะโทรกลับใน 30 นาที
              <a href="tel:0819023540" className="block font-bold mt-0.5 text-sage">📞 โทรหาเราเลย 081-902-3540</a>
            </div>
          )}

          {/* Messages */}
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
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-mint/20 px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-muted">
                  <span className="animate-pulse">กำลังตอบ...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-gray-400 px-3 pb-1">ข้อมูลนี้ไม่ใช่การวินิจฉัยโรค ฉุกเฉินโทร 1669</p>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="พิมพ์คำถามของคุณ..."
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-mint transition-colors"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-forest text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-sage transition-colors"
            >
              ส่ง
            </button>
          </div>
        </div>
      )}
    </>
  )
}
