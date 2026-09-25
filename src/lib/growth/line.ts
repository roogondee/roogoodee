// LINE Messaging API calls for the post-visit loops. line-notify.ts and
// messaging/push.ts only send plain text; these loops need quick replies
// (review stars) and a button template (share with a friend).

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

export type LineMessage = Record<string, unknown>

async function call(path: string, body: Record<string, unknown>): Promise<boolean> {
  if (!LINE_TOKEN) {
    console.warn(`[growth/line] ${path} skipped: LINE_CHANNEL_ACCESS_TOKEN not set`)
    return false
  }
  try {
    const res = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[growth/line] ${path} ${res.status}: ${await res.text().catch(() => '')}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`[growth/line] ${path} error:`, err)
    return false
  }
}

export const pushLineMessages = (to: string, messages: LineMessage[]) =>
  call('push', { to, messages: messages.slice(0, 5) })

export const replyLineMessages = (replyToken: string, messages: LineMessage[]) =>
  call('reply', { replyToken, messages: messages.slice(0, 5) })

export const textMessage = (text: string): LineMessage => ({ type: 'text', text: text.slice(0, 5000) })
