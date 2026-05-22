import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_NOTIFY_GROUP_ID = process.env.LINE_NOTIFY_GROUP_ID || ''

// 08:30 BKK morning ping — tells the sales team in one message how much
// follow-up volume they're starting the day with, broken down per person.
// Counts three buckets matching /admin/queue: overdue, due-today, stale-untouched.

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const secret = process.env.CRON_SECRET
  const isAuthorized = !!vercelCron || (secret && auth === `Bearer ${secret}`)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_NOTIFY_GROUP_ID) {
    return NextResponse.json({ ok: false, error: 'line_not_configured' }, { status: 200 })
  }

  const now = new Date()
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [overdueRes, todayRes, staleRes, usersRes] = await Promise.all([
    supabaseAdmin
      .from('leads')
      .select('assigned_to')
      .not('next_action_at', 'is', null)
      .lte('next_action_at', now.toISOString())
      .not('status', 'in', '(customer,lost,converted)'),
    supabaseAdmin
      .from('leads')
      .select('assigned_to')
      .gt('next_action_at', now.toISOString())
      .lte('next_action_at', endOfToday.toISOString())
      .not('status', 'in', '(customer,lost,converted)'),
    supabaseAdmin
      .from('leads')
      .select('assigned_to')
      .is('last_contacted_at', null)
      .is('next_action_at', null)
      .lt('created_at', dayAgo.toISOString())
      .not('status', 'in', '(customer,lost,converted)'),
    supabaseAdmin
      .from('admin_users')
      .select('id, name, email')
      .is('disabled_at', null)
      .eq('role', 'sale'),
  ])

  type Counts = { overdue: number; today: number; stale: number }
  const byUser = new Map<string, Counts>()
  const unassigned: Counts = { overdue: 0, today: 0, stale: 0 }

  const bump = (id: string | null, key: keyof Counts) => {
    if (!id) { unassigned[key]++; return }
    const c = byUser.get(id) || { overdue: 0, today: 0, stale: 0 }
    c[key]++
    byUser.set(id, c)
  }

  for (const r of overdueRes.data || []) bump(r.assigned_to, 'overdue')
  for (const r of todayRes.data    || []) bump(r.assigned_to, 'today')
  for (const r of staleRes.data    || []) bump(r.assigned_to, 'stale')

  const userById = new Map((usersRes.data || []).map(u => [u.id, u.name || u.email]))

  const lines: string[] = ['🌅 คิวเช้านี้ — Roogondee Sales', '━━━━━━━━━━━━━━━']

  const sortedEntries = Array.from(byUser.entries())
    .sort((a, b) => (b[1].overdue + b[1].today) - (a[1].overdue + a[1].today))

  if (sortedEntries.length === 0 && unassigned.overdue + unassigned.today + unassigned.stale === 0) {
    lines.push('✨ ไม่มีคิวค้าง — สุดยอดทีมงาน!')
  } else {
    for (const [id, c] of sortedEntries) {
      const name = userById.get(id) || 'sales'
      const parts: string[] = []
      if (c.overdue > 0) parts.push(`🚨 ค้าง ${c.overdue}`)
      if (c.today   > 0) parts.push(`📅 วันนี้ ${c.today}`)
      if (c.stale   > 0) parts.push(`❄️ ไม่แตะ ${c.stale}`)
      if (parts.length > 0) lines.push(`👤 ${name} — ${parts.join(' · ')}`)
    }
    if (unassigned.overdue + unassigned.today + unassigned.stale > 0) {
      const parts: string[] = []
      if (unassigned.overdue > 0) parts.push(`🚨 ค้าง ${unassigned.overdue}`)
      if (unassigned.today   > 0) parts.push(`📅 วันนี้ ${unassigned.today}`)
      if (unassigned.stale   > 0) parts.push(`❄️ ไม่แตะ ${unassigned.stale}`)
      lines.push(`👤 ยังไม่ assign — ${parts.join(' · ')}`)
    }
  }

  lines.push('', '👉 https://www.roogondee.com/admin/queue')

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_NOTIFY_GROUP_ID,
      messages: [{ type: 'text', text: lines.join('\n') }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('daily-followup-digest push failed:', res.status, errText)
    return NextResponse.json({ ok: false, error: 'line_push_failed' }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    users: sortedEntries.length,
    overdue_total: (overdueRes.data || []).length,
    today_total: (todayRes.data || []).length,
    stale_total: (staleRes.data || []).length,
  })
}
