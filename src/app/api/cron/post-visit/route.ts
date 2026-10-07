import { NextRequest, NextResponse } from 'next/server'
import { sendEmployerRenewalAlerts, sendRecalls, sendReviewRequests } from '@/lib/growth/post-visit'

export const runtime = 'nodejs'
export const maxDuration = 60

// Daily 10:00 BKK — review requests, recalls, employer renewal alerts. Each
// step runs even if an earlier one fails, and reports its own error.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const secret = process.env.CRON_SECRET
  const isAuthorized = !!vercelCron || (secret && auth === `Bearer ${secret}`)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const run = async <T,>(fn: () => Promise<T>) => {
    try {
      return await fn()
    } catch (err) {
      console.error('[post-visit]', err)
      return { error: (err as Error).message }
    }
  }

  const reviews = await run(() => sendReviewRequests())
  const recalls = await run(() => sendRecalls())
  const employers = await run(() => sendEmployerRenewalAlerts())
  const failed = [reviews, recalls, employers].some(r => 'error' in r)

  return NextResponse.json({ ok: !failed, reviews, recalls, employers }, { status: failed ? 500 : 200 })
}
