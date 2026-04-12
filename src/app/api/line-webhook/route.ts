import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

export const maxDuration = 60

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return true // skip if not configured
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64')
  return hash === signature
}

const SYSTEM_PROMPT = `คุณคือผู้ช่วยสุขภาพของ "รู้ก่อนดี(รู้งี้)" (roogondee.com) บริการของบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

บริการของเรา:
- STD & PrEP HIV: ตรวจโรคติดต่อทางเพศสัมพันธ์ ยา PrEP/PEP ป้องกัน HIV
- GLP-1 ลดน้ำหนัก: ยา Semaglutide, Liraglutide สำหรับผู้ที่ BMI เกิน
- CKD Clinic: ดูแลโรคไตเรื้อรัง ชะลอการเสื่อมของไต
- ตรวจสุขภาพแรงงานต่างด้าว: ใบรับรองแพทย์ บริการ B2B สำหรับโรงงาน

CRITICAL LANGUAGE RULE:
- Detect the language the user writes in and ALWAYS reply in that SAME language.
- Thai → Thai, English → English, Burmese → Burmese, Lao → Lao, Khmer → Khmer,
  Chinese → Chinese, Vietnamese → Vietnamese, Hindi → Hindi, Japanese → Japanese, Korean → Korean

Important rules:
1. Reply in the SAME language as the user. Be concise, friendly, non-judgmental.
2. Keep answers short — max 5 sentences, suitable for LINE chat.
3. For service inquiries, recommend consulting specialists with links:
   - STD/PrEP → https://roogondee.com/contact?service=std
   - GLP-1 → https://roogondee.com/contact?service=glp1
   - CKD → https://roogondee.com/contact?service=ckd
   - Workers → https://roogondee.com/contact?service=foreign
4. Never diagnose or prescribe — always recommend seeing a doctor.
5. End with "💚 Free consultation, no judgment" (in the user's language).`

const SERVICE_KEYWORDS: Record<string, string[]> = {
  std:     ['std', 'hiv', 'prep', 'pep', 'ซิฟิลิส', 'หนองใน', 'เริม', 'ตรวจเลือด', 'ตรวจโรค', 'เพศสัมพันธ์'],
  glp1:    ['glp', 'ozempic', 'saxenda', 'ลดน้ำหนัก', 'อ้วน', 'bmi', 'ยาฉีด', 'เบาหวาน'],
  ckd:     ['ไต', 'ckd', 'ครีเอตินิน', 'creatinine', 'egfr', 'ล้างไต', 'โรคไต'],
  foreign: ['แรงงาน', 'ต่างด้าว', 'myanmar', 'เมียนมา', 'กัมพูชา', 'ลาว', 'เวียดนาม', 'ใบรับรองแพทย์', 'work permit'],
}

function detectService(text: string): string {
  const lower = text.toLowerCase()
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return service
  }
  return 'general'
}

async function askClaude(question: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text : ''
}

async function replyToLine(replyToken: string, message: string) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text: message }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('LINE reply error:', res.status, err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-line-signature') || ''

    if (!verifySignature(rawBody, signature)) {
      console.error('Invalid LINE signature')
      return NextResponse.json({ error: 'invalid signature' }, { status: 403 })
    }

    const body = JSON.parse(rawBody)
    const events = body.events || []

    for (const event of events) {
      // Log group ID when bot is added to a group or receives group message
      if (event.source?.type === 'group') {
        console.log('GROUP_ID:', event.source.groupId)
      }

      if (event.type !== 'message' || event.message?.type !== 'text') continue

      // Only reply to 1:1 chat (not group messages)
      if (event.source?.type !== 'user') continue

      const text: string = event.message.text || ''
      const replyToken: string = event.replyToken
      const userId: string = event.source?.userId || ''
      const service = detectService(text)

      const aiReply = await askClaude(text)

      // Save as lead (non-blocking)
      void supabaseAdmin.from('leads').insert([{
        first_name: 'LINE Bot',
        phone: userId,
        service,
        note: text.slice(0, 500),
        source: 'line-bot',
        status: 'new',
      }])

      // Reply with AI answer
      if (replyToken && aiReply) {
        await replyToLine(replyToken, aiReply)
      }

      // Notify staff group (non-blocking)
      void notifyLineGroup({
        service,
        source: 'LINE Bot',
        note: text,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('LINE webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
