import type { Channel, CrmContact } from '@/lib/crm/types'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const FB_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || ''
const IG_TOKEN = process.env.IG_PAGE_ACCESS_TOKEN || FB_TOKEN
const GRAPH = 'https://graph.facebook.com/v19.0'

export interface SendResult {
  success: boolean
  channel?: Channel
  message_id?: string
  error?: string
}

export async function pushToLine(userId: string, text: string): Promise<SendResult> {
  if (!LINE_TOKEN) return { success: false, error: 'LINE token not set' }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
    })
    if (!res.ok) return { success: false, error: `LINE ${res.status}: ${await res.text().catch(() => '')}` }
    return { success: true, channel: 'line' }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// Meta Send API (Messenger + Instagram share the endpoint shape).
async function metaSend(token: string, psid: string, text: string, channel: Channel): Promise<SendResult> {
  if (!token) return { success: false, error: `${channel} token not set` }
  try {
    const res = await fetch(`${GRAPH}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text } }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { success: false, error: `${channel}: ${JSON.stringify(json)}` }
    return { success: true, channel, message_id: json.message_id }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export const pushToFacebook = (psid: string, text: string) => metaSend(FB_TOKEN, psid, text, 'facebook')
export const pushToInstagram = (igsid: string, text: string) => metaSend(IG_TOKEN, igsid, text, 'instagram')

// Channel picker for nurture. LINE is the primary promotional channel.
// IMPORTANT (Meta policy): promotional messages may NOT be sent to FB/IG
// outside the 24-hour window — so Messenger/IG are only used when the caller
// explicitly asserts the window is open (allowMeta), e.g. replying to a recent
// inbound message. Always requires PDPA consent.
export async function sendToContact(
  contact: CrmContact,
  text: string,
  opts: { allowMeta?: boolean } = {}
): Promise<SendResult> {
  if (!contact.consent_pdpa) return { success: false, error: 'no PDPA consent' }

  if (contact.line_user_id) return pushToLine(contact.line_user_id, text)
  if (opts.allowMeta && contact.facebook_user_id) return pushToFacebook(contact.facebook_user_id, text)
  if (opts.allowMeta && contact.instagram_user_id) return pushToInstagram(contact.instagram_user_id, text)

  return { success: false, error: 'no eligible push channel (need LINE, or Meta within 24h window)' }
}
