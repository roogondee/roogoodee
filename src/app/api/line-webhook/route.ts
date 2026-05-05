import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

export const maxDuration = 60

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const LINE_BOT_USER_ID = process.env.LINE_BOT_USER_ID || ''
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
- ตรวจสุขภาพประจำปี: แพ็กเกจตรวจสุขภาพประจำปีที่ W Medical Hospital สมุทรสาคร (ครอบคลุมเลือด ปัสสาวะ เอ็กซเรย์ และอื่นๆ ตามแพ็กเกจที่เลือก)

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
   - ตรวจสุขภาพประจำปี → https://roogondee.com/contact
4. Never diagnose or prescribe — always recommend seeing a doctor.
5. End with "💚 Free consultation, no judgment" (in the user's language).`

const SERVICE_KEYWORDS: Record<string, string[]> = {
  std:     ['std', 'hiv', 'prep', 'pep', 'ซิฟิลิส', 'หนองใน', 'เริม', 'ตรวจเลือด', 'ตรวจโรค', 'เพศสัมพันธ์'],
  glp1:    ['glp', 'ozempic', 'saxenda', 'ลดน้ำหนัก', 'อ้วน', 'bmi', 'ยาฉีด', 'เบาหวาน'],
  ckd:     ['ไต', 'ckd', 'ครีเอตินิน', 'creatinine', 'egfr', 'ล้างไต', 'โรคไต'],
  foreign: ['แรงงาน', 'ต่างด้าว', 'myanmar', 'เมียนมา', 'กัมพูชา', 'ลาว', 'เวียดนาม', 'ใบรับรองแพทย์', 'work permit'],
  annual:  ['ประจำปี', 'ตรวจประจำปี', 'แพ็กเกจตรวจ', 'ตรวจร่างกาย', 'health check', 'checkup', 'check up', 'ตรวจสุขภาพประจำ'],
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
      // Idempotency: LINE retries webhooks that don't 200 within 3s, resending
      // the same webhookEventId. Atomically claim the event_id; if the insert
      // hits the PK, another delivery already processed (or is processing) it.
      const eventId: string | undefined = event.webhookEventId
      if (eventId) {
        const { error: claimErr } = await supabaseAdmin
          .from('processed_webhook_events')
          .insert({ event_id: eventId, source: 'line' })
        if (claimErr) {
          // 23505 = unique_violation → duplicate delivery, skip silently.
          if ((claimErr as { code?: string }).code === '23505') continue
          console.error('webhook dedup insert error:', claimErr)
        }
      }

      try {
        await handleEvent(event)
      } catch (err) {
        // Per-event isolation: a single failure must not 500 the whole batch
        // and trigger LINE to retry every event in this delivery.
        console.error('LINE event processing error:', err, { eventId })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('LINE webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEvent(event: any): Promise<void> {
  // Log group ID when bot is added to a group or receives group message
  if (event.source?.type === 'group') {
    console.log('GROUP_ID:', event.source.groupId)
  }

  // Spec §5.3: follow event = user added the OA. Send welcome + ask for
  // voucher code so we can link their userId to a lead for future push.
  if (event.type === 'follow' && event.source?.type === 'user' && event.replyToken) {
    const welcome = [
      'ยินดีต้อนรับสู่ รู้ก่อนดี(รู้งี้) 💚',
      '',
      'หากคุณเพิ่งรับ voucher จากเว็บไซต์ของเรา',
      'กรุณาส่ง "โค้ด voucher" ของคุณในช่องแชทนี้',
      '(เช่น RGD-GLP1-A3X9K2)',
      '',
      'เพื่อเชื่อมบัญชีและรับการแจ้งเตือนอัตโนมัติ',
    ].join('\n')
    await replyToLine(event.replyToken, welcome)
    return
  }

  if (event.type !== 'message' || event.message?.type !== 'text') return

  const sourceType: string | undefined = event.source?.type
  const text: string = event.message.text || ''
  const replyToken: string = event.replyToken

  // In groups/rooms: stay silent unless the bot is explicitly @mentioned.
  // No lead-saving and no group notify — the group IS the audience.
  if (sourceType === 'group' || sourceType === 'room') {
    const mentionees: Array<{ userId?: string; type?: string }> =
      event.message?.mention?.mentionees || []
    const mentioned =
      !!LINE_BOT_USER_ID &&
      mentionees.some(m => m.type === 'user' && m.userId === LINE_BOT_USER_ID)
    if (!mentioned) return

    const aiReply = await askClaude(text)
    if (replyToken && aiReply) {
      await replyToLine(replyToken, aiReply)
    }
    return
  }

  if (sourceType !== 'user') return

  const userId: string = event.source?.userId || ''

  // Voucher code linkage: if the message is a voucher code,
  // match to a lead and save line_user_id for future push.
  const codeMatch = text.trim().toUpperCase().match(/RGD-(GLP1|CKD|STD|FRN)-[A-Z0-9]{6}/)
  if (codeMatch && userId) {
    const code = codeMatch[0]
    const { data: voucher } = await supabaseAdmin
      .from('vouchers')
      .select('code, service, expires_at, redeemed_at, lead_id, lead:leads(first_name, line_user_id)')
      .eq('code', code)
      .maybeSingle()

    if (!voucher) {
      await replyToLine(replyToken, `ไม่พบ voucher รหัส ${code}\nกรุณาตรวจสอบอีกครั้ง`)
      return
    }

    // Link userId to the lead (idempotent)
    await supabaseAdmin
      .from('leads')
      .update({ line_user_id: userId })
      .eq('id', voucher.lead_id)

    const expires = new Date(voucher.expires_at).toLocaleDateString('th-TH')
    const reply = voucher.redeemed_at
      ? `✓ Voucher ${code} ใช้ไปแล้ว\nขอบคุณที่ใช้บริการ 💚`
      : [
          `✓ เชื่อมบัญชีสำเร็จ`,
          `🎟 ${code}`,
          `📅 หมดอายุ ${expires}`,
          `📍 W Medical Hospital สมุทรสาคร`,
          ``,
          `ต่อไปเราจะแจ้งเตือนคุณผ่าน LINE โดยตรง`,
        ].join('\n')
    await replyToLine(replyToken, reply)
    return
  }

  // Fallback: AI chat assistant
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

  // Notify staff group only when message hits a service keyword — prevents
  // "สวัสดี/ขอบคุณ" chitchat from flooding the team room. General chat is
  // still saved as a lead above for analytics.
  if (service !== 'general') {
    void notifyLineGroup({
      service,
      source: 'LINE Bot',
      note: text,
    })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
