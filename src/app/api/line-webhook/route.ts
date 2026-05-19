import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateReply } from '@/lib/chatbot/reply'
import { detectService, extractVoucherCode } from '@/lib/chatbot/service-detect'
import { captureBotLead } from '@/lib/chatbot/lead'
import crypto from 'crypto'

export const maxDuration = 60

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const LINE_BOT_USER_ID = process.env.LINE_BOT_USER_ID || ''

function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return true // skip if not configured
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64')
  return hash === signature
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

    // Process events in parallel: LINE batches up to ~100 events per delivery
    // and each replyToken has its own 60s TTL. Serial processing made later
    // events wait on earlier AI calls and risked token expiry.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.all(events.map(async (event: any) => {
      const eventId: string | undefined = event.webhookEventId
      if (eventId) {
        const { error: claimErr } = await supabaseAdmin
          .from('processed_webhook_events')
          .insert({ event_id: eventId, source: 'line' })
        if (claimErr) {
          if ((claimErr as { code?: string }).code === '23505') return
          console.error('webhook dedup insert error:', claimErr)
        }
      }

      try {
        await handleEvent(event)
      } catch (err) {
        console.error('LINE event processing error:', err, { eventId })
      }
    }))

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
    // Many followers arrive from LINE Ads without a voucher in hand — the
    // welcome must serve both paths or ad-clicked users go silent.
    const welcome = [
      'ยินดีต้อนรับสู่ รู้ก่อนดี(รู้งี้) 💚',
      '',
      '🎟 มี voucher อยู่แล้ว?',
      'ส่งโค้ด (เช่น RGD-GLP1-A3X9K2) ในแชทนี้',
      'เพื่อเชื่อมบัญชีและรับการแจ้งเตือน',
      '',
      '✨ ยังไม่มี voucher?',
      'ทำแบบประเมินสุขภาพฟรี (2 นาที)',
      'รับ voucher ตรวจฟรีมูลค่า 500฿',
      '👉 https://roogondee.com/quiz',
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

    const aiReply = await generateReply(text)
    if (replyToken && aiReply) {
      await replyToLine(replyToken, aiReply)
    }
    return
  }

  if (sourceType !== 'user') return

  const userId: string = event.source?.userId || ''

  // Voucher code linkage: if the message is a voucher code,
  // match to a lead and save line_user_id for future push.
  const code = extractVoucherCode(text)
  if (code && userId) {
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
  const aiReply = await generateReply(text)

  await captureBotLead({ platform: 'line-bot', userId, service, rawText: text })

  if (replyToken && aiReply) {
    await replyToLine(replyToken, aiReply)
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
