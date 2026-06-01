import { NextRequest, NextResponse } from 'next/server'
import { runDueEnrollments } from '@/lib/crm/sequences'

export const runtime = 'nodejs'
export const maxDuration = 60

// Advances due nurture enrollments: drafts + sends the next step per contact,
// honouring channel rules + PDPA consent (see sendToContact). Stop conditions
// (reply / booking / opt-out) are applied elsewhere via stopEnrollments().
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const secret = process.env.CRON_SECRET
  const isAuthorized = !!vercelCron || (secret && auth === `Bearer ${secret}`)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runDueEnrollments()
  return NextResponse.json({ ok: true, ...result })
}
