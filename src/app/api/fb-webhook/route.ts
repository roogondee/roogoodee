import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import {
  askClaude,
  detectService,
  sendDM,
  replyToComment,
  sendPrivateReplyFromComment,
  publicCommentHandoff,
} from '@/lib/social-bot'

export const maxDuration = 60

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || ''
const FB_APP_SECRET = process.env.FB_APP_SECRET || ''
const FB_PAGE_ID = process.env.FB_PAGE_ID || ''
const IG_BUSINESS_ID = process.env.IG_BUSINESS_ID || ''

type Platform = 'fb' | 'ig'

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!FB_APP_SECRET) return true
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const expected = createHmac('sha256', FB_APP_SECRET).update(rawBody).digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  if (expected.length !== received.length) return false
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}

// Atomically claim an event_id; returns true if we won the claim and should
// process, false if a previous delivery already handled it. Same pattern as
// the LINE webhook — Meta retries any 5xx and we'd otherwise double-reply.
async function claimEvent(eventId: string, source: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('processed_webhook_events')
    .insert({ event_id: eventId, source })
  if (!error) return true
  if ((error as { code?: string }).code === '23505') return false
  console.error('[fb-webhook] dedup insert error:', error)
  return true // fail open: better to maybe-double-reply than to silently drop
}

// Webhook verification (GET). Used for both FB Page and IG webhook subscription.
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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)

    const obj: string = body.object
    if (obj !== 'page' && obj !== 'instagram') {
      return NextResponse.json({ ok: false }, { status: 404 })
    }
    const platform: Platform = obj === 'instagram' ? 'ig' : 'fb'

    for (const entry of body.entry || []) {
      // DM events (Messenger or IG Direct) — entry.messaging[]
      for (const event of entry.messaging || []) {
        try {
          await handleMessagingEvent(platform, event)
        } catch (err) {
          console.error('[fb-webhook] messaging error:', err)
        }
      }
      // Comment events — entry.changes[]
      for (const change of entry.changes || []) {
        try {
          await handleChangeEvent(platform, change)
        } catch (err) {
          console.error('[fb-webhook] change error:', err)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[fb-webhook] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

interface MessagingEvent {
  sender?: { id?: string }
  recipient?: { id?: string }
  message?: {
    mid?: string
    text?: string
    is_echo?: boolean
  }
}

async function handleMessagingEvent(platform: Platform, event: MessagingEvent) {
  const text = event.message?.text
  const senderId = event.sender?.id
  const mid = event.message?.mid

  // Skip echoes of our own outbound messages — otherwise the bot replies to itself.
  if (event.message?.is_echo) return
  if (!text || !senderId) return

  // Dedup: Meta retries the same delivery on 5xx. mid is unique per message.
  if (mid) {
    const won = await claimEvent(`${platform}-msg-${mid}`, `${platform}-msg`)
    if (!won) return
  }

  const service = detectService(text)
  const aiReply = await askClaude(text)

  void supabaseAdmin.from('leads').insert([{
    first_name: platform === 'ig' ? 'IG DM' : 'FB Messenger',
    phone: senderId,
    service,
    note: text.slice(0, 500),
    source: platform === 'ig' ? 'instagram-bot' : 'facebook-bot',
    status: 'new',
  }])

  if (aiReply) {
    await sendDM(platform, senderId, aiReply)
  }

  // Notify staff only when the message hits a service vertical — chitchat
  // (สวัสดี/ขอบคุณ) doesn't need a ping but is still saved as a lead above.
  if (service !== 'general') {
    void notifyLineGroup({
      service,
      source: platform === 'ig' ? 'Instagram DM' : 'Facebook Messenger',
      note: text,
    })
  }
}

interface ChangeEvent {
  field?: string
  value?: {
    item?: string
    verb?: string
    comment_id?: string
    post_id?: string
    parent_id?: string
    message?: string
    text?: string
    id?: string
    media?: { id?: string }
    from?: { id?: string; name?: string; username?: string }
  }
}

async function handleChangeEvent(platform: Platform, change: ChangeEvent) {
  const field = change.field
  const v = change.value || {}

  // FB Page feed: only fire on newly-added comments (skip likes, edits, etc.)
  if (platform === 'fb') {
    if (field !== 'feed') return
    if (v.item !== 'comment' || v.verb !== 'add') return
  } else {
    // IG: 'comments' field. Webhook only fires on new comments, no need to filter verb.
    if (field !== 'comments') return
  }

  const commentId = (platform === 'fb' ? v.comment_id : v.id) || ''
  const text = (v.message || v.text || '').trim()
  const fromId = v.from?.id || ''
  const fromName = v.from?.name || v.from?.username || 'Commenter'

  if (!commentId || !text) return

  // Avoid replying to our own page/IG comments — would loop forever otherwise.
  if (platform === 'fb' && FB_PAGE_ID && fromId === FB_PAGE_ID) return
  if (platform === 'ig' && IG_BUSINESS_ID && fromId === IG_BUSINESS_ID) return

  // Dedup by comment_id — Meta resends on 5xx.
  const won = await claimEvent(`${platform}-comment-${commentId}`, `${platform}-comment`)
  if (!won) return

  const service = detectService(text)

  // Save as lead so the team has the commenter on the funnel even if they
  // never DM. phone field stores the platform user id (no real number yet).
  void supabaseAdmin.from('leads').insert([{
    first_name: `${platform === 'ig' ? 'IG' : 'FB'} Comment · ${fromName}`,
    phone: fromId || commentId,
    service,
    note: text.slice(0, 500),
    source: platform === 'ig' ? 'instagram-comment' : 'facebook-comment',
    status: 'new',
  }])

  // Public reply: short handoff to DM, no AI prose under public comments.
  await replyToComment(platform, commentId, publicCommentHandoff(service))

  // Private DM: full AI sales reply pulling them into the funnel. Meta allows
  // exactly one private reply per comment within 7 days, so this is the one
  // shot we get to land them on the quiz.
  const aiReply = await askClaude(text)
  if (aiReply) {
    await sendPrivateReplyFromComment(platform, commentId, aiReply)
  }

  if (service !== 'general') {
    void notifyLineGroup({
      service,
      source: platform === 'ig' ? 'Instagram Comment' : 'Facebook Comment',
      note: text,
    })
  }
}
