import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification } from '@/lib/email'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a health consultation assistant for รู้ก่อนดี(รู้งี้) / RooGonDee (roogondee.com)
Operated by Jia Raksa Co., Ltd. with W Medical Hospital, Samut Sakhon, Thailand.

Services:
- STD & PrEP HIV testing (safe, non-judgmental)
- GLP-1 weight loss (Ozempic, Wegovy, Saxenda)
- CKD Clinic (chronic kidney disease)
- Foreign worker health checkup (Samut Sakhon)

CRITICAL LANGUAGE RULE:
- Detect the language the user writes in and ALWAYS reply in that SAME language.
- If user writes in Thai → reply in Thai
- If user writes in English → reply in English
- If user writes in Burmese/Myanmar → reply in Burmese
- If user writes in Lao → reply in Lao
- If user writes in Khmer → reply in Khmer
- If user writes in Chinese → reply in Chinese
- If user writes in Vietnamese → reply in Vietnamese
- If user writes in Hindi → reply in Hindi
- If user writes in Japanese → reply in Japanese
- If user writes in Korean → reply in Korean
- For any other language → reply in that language if possible, otherwise English

Rules:
- Keep answers concise, friendly, non-judgmental
- Do NOT diagnose diseases or prescribe medications — provide general info only
- After 2-3 exchanges, ask for name and phone number so team can follow up
- When you get name and phone, append this marker (always in this exact format):
  [LEAD:{"name":"name","phone":"phone","service":"std or glp1 or ckd or foreign or general"}]
- Phone must start with 0 and have 9-10 digits
- Team will contact back within 30 minutes`

function detectService(messages: Array<{ role: string; content: string }>): string {
  const text = messages.map(m => m.content).join(' ').toLowerCase()
  if (text.includes('std') || text.includes('hiv') || text.includes('prep') || text.includes('เพศ') || text.includes('hpv')) return 'std'
  if (text.includes('glp') || text.includes('ลดน้ำหนัก') || text.includes('อ้วน') || text.includes('ozempic')) return 'glp1'
  if (text.includes('ไต') || text.includes('ckd') || text.includes('ฟอกไต')) return 'ckd'
  if (text.includes('แรงงาน') || text.includes('ต่างด้าว') || text.includes('foreign')) return 'foreign'
  return 'general'
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract lead data if present
    const leadMatch = rawText.match(/\[LEAD:(\{[^}]+\})\]/)
    if (leadMatch) {
      try {
        const lead = JSON.parse(leadMatch[1])
        const service = lead.service || detectService(messages)
        const note = `Chat: ${messages.slice(-3).map((m: { role: string; content: string }) => m.content).join(' | ')}`.slice(0, 300)
        await supabaseAdmin.from('leads').insert({
          first_name: lead.name || '',
          phone: lead.phone || '',
          service,
          source: 'chat-widget',
          status: 'new',
          note,
        })
        sendLeadNotification({ name: lead.name || '', phone: lead.phone || '', service, source: 'chat-widget', note })
      } catch {}
    }

    // Strip the [LEAD:...] marker from displayed text
    const displayText = rawText.replace(/\[LEAD:\{[^}]+\}\]/g, '').trim()

    return NextResponse.json({
      text: displayText,
      leadCaptured: !!leadMatch,
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
