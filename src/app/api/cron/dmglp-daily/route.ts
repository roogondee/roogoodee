import { NextRequest, NextResponse } from 'next/server'
import { processNoShows, runBookkeeping, sendSurveyInvites, sendVisitReminders } from '@/lib/dmglp/daily'

export const runtime = 'nodejs'
export const maxDuration = 60

// Daily 09:00 BKK (02:00 UTC in vercel.json) — DMGLP programme reminders,
// survey links, no-show handling and billing/stock bookkeeping. Each step
// runs even if an earlier one fails, and reports its own error.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const secret = process.env.CRON_SECRET
  const isAuthorized = !!vercelCron || (secret && auth === `Bearer ${secret}`)
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = async <T,>(fn: () => Promise<T>) => {
    try { return await fn() } catch (err) {
      console.error('[dmglp-daily]', err)
      return { error: (err as Error).message }
    }
  }
  const reminders = await run(sendVisitReminders)
  const surveys = await run(sendSurveyInvites)
  const noShows = await run(processNoShows)
  const bookkeeping = await run(runBookkeeping)
  const failed = [reminders, surveys, noShows, bookkeeping].some(r => 'error' in r)
  return NextResponse.json({ ok: !failed, reminders, surveys, noShows, bookkeeping }, { status: failed ? 500 : 200 })
}
