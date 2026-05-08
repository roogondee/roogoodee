import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroupRaw } from '@/lib/line-notify'

// SLA thresholds. New leads should be touched fast — first hour is when
// conversion is highest. After 4h with no contact, ping the team.
const NEW_LEAD_SLA_HOURS = 4
const MAX_PER_RUN = 30                 // cap LINE notifies per cron tick

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD/PrEP', glp1: 'GLP-1', ckd: 'CKD', foreign: 'แรงงาน',
  general: 'ทั่วไป',
}

/**
 * Overdue lead alert. Two buckets:
 *   1. NEW leads created > 4h ago that have never been contacted
 *      (last_contacted_at IS NULL AND status = 'new')
 *   2. SCHEDULED follow-ups whose next_followup_at is past
 *      (next_followup_at <= now AND status NOT IN customer/lost)
 *
 * Sends a single rolled-up LINE message to the W Medical group rather than
 * one ping per lead — otherwise the team gets spammed every cron run.
 *
 * Auth: Bearer CRON_SECRET, or Vercel cron UA. Same pattern as
 * voucher-reminders.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const secret = process.env.CRON_SECRET
  const isAuthorized = !!vercelCron || (secret && auth === `Bearer ${secret}`)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const slaCutoff = new Date(now.getTime() - NEW_LEAD_SLA_HOURS * 60 * 60 * 1000).toISOString()

  const [{ data: untouched }, { data: overdue }] = await Promise.all([
    supabaseAdmin
      .from('leads')
      .select('id, first_name, last_name, phone, service, lead_tier, ai_score, created_at, assigned_to')
      .eq('status', 'new')
      .is('last_contacted_at', null)
      .lt('created_at', slaCutoff)
      .order('created_at', { ascending: true })
      .limit(MAX_PER_RUN),
    supabaseAdmin
      .from('leads')
      .select('id, first_name, last_name, phone, service, lead_tier, ai_score, next_followup_at, contact_attempts, assigned_to')
      .not('status', 'in', '(customer,lost)')
      .not('next_followup_at', 'is', null)
      .lt('next_followup_at', now.toISOString())
      .order('next_followup_at', { ascending: true })
      .limit(MAX_PER_RUN),
  ])

  const untouchedRows = untouched || []
  const overdueRows = overdue || []

  if (untouchedRows.length === 0 && overdueRows.length === 0) {
    return NextResponse.json({ ok: true, untouched: 0, overdue: 0, notified: false })
  }

  const lines: string[] = ['⏰ Lead ค้างต้องตามด่วน', '━━━━━━━━━━━━━━━']

  if (untouchedRows.length > 0) {
    lines.push(`🆕 Lead ใหม่ ${NEW_LEAD_SLA_HOURS}+ ชม. ยังไม่ได้แตะ (${untouchedRows.length})`)
    for (const l of untouchedRows.slice(0, 10)) {
      const ageHours = Math.floor((now.getTime() - new Date(l.created_at).getTime()) / 3_600_000)
      const tag = l.lead_tier ? `[${l.lead_tier.toUpperCase()}] ` : ''
      lines.push(`  ${tag}${l.first_name} ${l.last_name || ''} · ${l.phone} · ${SERVICE_LABELS[l.service] || l.service} · ${ageHours}h`)
    }
    if (untouchedRows.length > 10) lines.push(`  ... และอีก ${untouchedRows.length - 10} คน`)
  }

  if (overdueRows.length > 0) {
    lines.push('', `📞 นัดติดตามเลยกำหนด (${overdueRows.length})`)
    for (const l of overdueRows.slice(0, 10)) {
      const lateHours = Math.max(0, Math.floor((now.getTime() - new Date(l.next_followup_at!).getTime()) / 3_600_000))
      const attempts = l.contact_attempts ? ` (${l.contact_attempts}×)` : ''
      lines.push(`  ${l.first_name} ${l.last_name || ''}${attempts} · ${l.phone} · ${SERVICE_LABELS[l.service] || l.service} · เลย ${lateHours}h`)
    }
    if (overdueRows.length > 10) lines.push(`  ... และอีก ${overdueRows.length - 10} คน`)
  }

  lines.push('', '🔧 https://www.roogondee.com/admin/my-tasks')

  await notifyLineGroupRaw(lines.join('\n'))

  return NextResponse.json({
    ok: true,
    untouched: untouchedRows.length,
    overdue: overdueRows.length,
    notified: true,
  })
}
