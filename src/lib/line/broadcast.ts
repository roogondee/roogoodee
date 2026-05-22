const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const SITE_BASE = (process.env.SITE_BASE_URL || 'https://roogondee.com').replace(/\/$/, '')

type FlexMessage = Record<string, unknown>

export type LineComposePayload = {
  service: string
  serviceLabel: string
  imageUrl: string
  headline: string
  caption: string
  cta: string
  blogSlug?: string
}

export function buildFlexFromCompose(p: LineComposePayload): FlexMessage {
  const slug = p.blogSlug ? encodeURIComponent(p.blogSlug).replace(/%2D/g, '-').replace(/%5F/g, '_') : ''
  const blogUrl = slug ? `${SITE_BASE}/blog/${slug}` : `${SITE_BASE}`
  const leadUrl = `${SITE_BASE}/quiz/${p.service}?utm_source=line&utm_medium=broadcast&utm_campaign=compose`

  return {
    type: 'flex',
    altText: `${p.headline} — ${p.serviceLabel}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: p.imageUrl,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: { type: 'uri', uri: blogUrl },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: p.headline.slice(0, 80), weight: 'bold', size: 'lg', wrap: true, color: '#1B4332' },
          { type: 'text', text: p.caption.slice(0, 200), size: 'sm', wrap: true, color: '#444444' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#52B788',
            action: { type: 'uri', label: p.cta.slice(0, 20) || 'ทำ Quiz รับสิทธิ์ฟรี', uri: leadUrl },
          },
          {
            type: 'button',
            style: 'secondary',
            action: { type: 'uri', label: 'อ่านบทความเต็ม', uri: blogUrl },
          },
        ],
      },
    },
  }
}

export async function broadcastFlex(flex: FlexMessage): Promise<{ request_id: string }> {
  if (!LINE_TOKEN) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured')
  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: [flex] }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LINE broadcast failed (${res.status}): ${text}`)
  }
  return { request_id: res.headers.get('x-line-request-id') || 'ok' }
}
