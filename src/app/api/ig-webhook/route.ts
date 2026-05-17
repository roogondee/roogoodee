import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { generateReply } from '@/lib/chatbot/reply'
import { detectService } from '@/lib/chatbot/service-detect'
import { captureBotLead } from '@/lib/chatbot/lead'

export const maxDuration = 60

// Instagram Messaging shares the Meta App with Facebook Messenger (App ID
// 1840096433337980), so verify_token + app secret are reused. Token can be
// overridden with IG_PAGE_ACCESS_TOKEN if a separate IG access token is
// provisioned — otherwise the Page token works for the linked IG Business.
const IG_PAGE_ACCESS_TOKEN = process.env.IG_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN || ''
const IG_VERIFY_TOKEN = process.env.IG_VERIFY_TOKEN || process.env.FB_VERIFY_TOKEN || ''
const FB_APP_SECRET = process.env.FB_APP_SECRET || ''

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!FB_APP_SECRET) return true
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const expected = createHmac('sha256', FB_APP_SECRET).update(rawBody).digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  if (expected.length !== received.length) return false
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}

async function sendIGMessage(recipientIgsid: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${IG_PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('IG send error:', res.status, err)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === IG_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)

    if (body.object !== 'instagram') {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.message?.text) continue
        // Skip echoes of messages we (the IG account) sent.
        if (event.message.is_echo) continue

        const senderId: string = event.sender?.id
        const mid: string | undefined = event.message.mid
        const text: string = event.message.text
        if (!senderId || !text) continue

        // Idempotency: Meta retries deliveries that don't 200 quickly.
        // mid is unique per message; claim it atomically to dedup.
        if (mid) {
          const { error: claimErr } = await supabaseAdmin
            .from('processed_webhook_events')
            .insert({ event_id: mid, source: 'instagram' })
          if (claimErr) {
            if ((claimErr as { code?: string }).code === '23505') continue
            console.error('IG webhook dedup insert error:', claimErr)
          }
        }

        const service = detectService(text)
        const aiReply = await generateReply(text)

        await captureBotLead({ platform: 'instagram-bot', userId: senderId, service, rawText: text })

        if (aiReply) {
          await sendIGMessage(senderId, aiReply)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('IG webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
