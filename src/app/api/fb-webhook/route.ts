import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || ''
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || ''
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `คุณคือผู้ช่วยสุขภาพของ "รู้ก่อนดี(รู้งี้)" (roogondee.com) บริการของบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

บริการของเรา:
- STD & PrEP HIV: ตรวจโรคติดต่อทางเพศสัมพันธ์ ยา PrEP/PEP ป้องกัน HIV
- GLP-1 ลดน้ำหนัก: ยา Semaglutide, Liraglutide สำหรับผู้ที่ BMI เกิน
- CKD Clinic: ดูแลโรคไตเรื้อรัง ชะลอการเสื่อมของไต
- ตรวจสุขภาพแรงงานต่างด้าว: ใบรับรองแพทย์ บริการ B2B สำหรับโรงงาน

กฎสำคัญ:
1. ตอบเป็นภาษาไทย กระชับ เป็นมิตร ไม่ตัดสิน
2. ตอบสั้นๆ ไม่เกิน 5 ประโยค เหมาะกับ Messenger chat
3. ถ้าคำถามเกี่ยวกับบริการ ให้แนะนำให้ปรึกษาผู้เชี่ยวชาญ และแนบลิงก์:
   - STD/PrEP → https://roogondee.com/contact?service=std
   - GLP-1 → https://roogondee.com/contact?service=glp1
   - CKD → https://roogondee.com/contact?service=ckd
   - แรงงาน → https://roogondee.com/contact?service=foreign
4. ห้ามวินิจฉัยโรคหรือสั่งยา ให้แนะนำพบแพทย์เสมอ
5. ลงท้ายด้วย "💚 ปรึกษาฟรี ไม่ตัดสิน" เสมอ`

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

async function sendFBMessage(recipientId: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('FB send error:', res.status, err)
  }
}

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Receive messages (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.object !== 'page') {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.message?.text) continue

        const senderId = event.sender.id
        const text = event.message.text
        const service = detectService(text)

        const aiReply = await askClaude(text)

        // Save as lead (non-blocking)
        void supabaseAdmin.from('leads').insert([{
          first_name: 'FB Messenger',
          phone: senderId,
          service,
          note: text.slice(0, 500),
          source: 'facebook-bot',
          status: 'new',
        }])

        // Reply
        if (aiReply) {
          await sendFBMessage(senderId, aiReply)
        }

        // Notify LINE group (non-blocking)
        void notifyLineGroup({
          service,
          source: 'Facebook Messenger',
          note: text,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('FB webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
