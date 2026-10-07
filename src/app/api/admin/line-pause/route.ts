import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { pauseBotForUser, resumeBotForUser } from '@/lib/chatbot/line-pause'

const VALID_ACTIONS = new Set(['pause', 'resume'])

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { line_user_id?: string; action?: string }
  const lineUserId = body.line_user_id?.trim()
  if (!lineUserId) return NextResponse.json({ error: 'missing_line_user_id' }, { status: 400 })
  if (!body.action || !VALID_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  if (body.action === 'pause') {
    await pauseBotForUser(lineUserId, 'staff_reply')
  } else {
    await resumeBotForUser(lineUserId)
  }

  return NextResponse.json({ ok: true })
}
