import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { publishToFacebookPage } from '@/lib/fb-publish'

interface PostRequest {
  message: string
  link?: string
  // ISO 8601 datetime; omit/null → publish immediately
  scheduledAt?: string | null
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as PostRequest
  const message = (body.message || '').trim()
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (message.length > 5000) return NextResponse.json({ error: 'message too long' }, { status: 400 })

  let scheduledPublishTime: number | undefined
  if (body.scheduledAt) {
    const t = Date.parse(body.scheduledAt)
    if (Number.isNaN(t)) return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 })
    scheduledPublishTime = Math.floor(t / 1000)
  }

  try {
    const result = await publishToFacebookPage({
      message,
      link: body.link?.trim() || undefined,
      scheduledPublishTime,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('[fb-post]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
