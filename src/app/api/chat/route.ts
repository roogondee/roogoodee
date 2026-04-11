import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification } from '@/lib/email'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `คุณคือผู้ช่วยให้คำปรึกษาสุขภาพเบื้องต้นของ รู้ก่อนดี(รู้งี้) (roogondee.com)
บริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

บริการที่มี:
- ตรวจ STD & PrEP HIV (ปลอดภัย ไม่ตัดสิน)
- GLP-1 ลดน้ำหนัก (Ozempic, Wegovy, Saxenda)
- CKD Clinic โรคไตเรื้อรัง
- ตรวจสุขภาพแรงงานต่างด้าว (สมุทรสาคร)

กฎ:
- ตอบภาษาไทย อ่านง่าย กระชับ ไม่ตัดสิน
- ไม่วินิจฉัยโรค ไม่สั่งยา ให้ข้อมูลเบื้องต้นเท่านั้น
- หลังตอบ 2-3 ครั้ง ให้ถามชื่อและเบอร์โทรเพื่อให้ทีมติดต่อกลับ
- เมื่อได้ชื่อและเบอร์โทรแล้ว ให้ตอบในรูปแบบนี้เสมอ (แนบท้ายข้อความปกติ):
  [LEAD:{"name":"ชื่อ","phone":"เบอร์","service":"std หรือ glp1 หรือ ckd หรือ foreign หรือ general"}]
- เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก
- ทีมจะติดต่อกลับภายใน 30 นาที`

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
