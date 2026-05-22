import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'

const VALID_ACTIONS = new Set(['reassign', 'mark_contacted', 'snooze', 'mark_lost'])

interface BulkPayload {
  ids: string[]
  action: string
  assignee_id?: string | null
  snooze_days?: number
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as BulkPayload
  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 100) {
    return NextResponse.json({ error: 'invalid_ids' }, { status: 400 })
  }
  if (!VALID_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }
  // Only managers may reassign across the team.
  if (body.action === 'reassign' && me.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Sales can only act on leads assigned to them.
  let leadIds = body.ids
  if (me.role === 'sale' && me.id) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('id')
      .in('id', body.ids)
      .eq('assigned_to', me.id)
    leadIds = (data || []).map(r => r.id)
    if (leadIds.length === 0) {
      return NextResponse.json({ error: 'no_accessible_leads' }, { status: 403 })
    }
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {}

  if (body.action === 'reassign') {
    if (!body.assignee_id) {
      return NextResponse.json({ error: 'missing_assignee_id' }, { status: 400 })
    }
    update.assigned_to = body.assignee_id
    update.assigned_at = now
  } else if (body.action === 'mark_contacted') {
    update.last_contacted_at = now
    update.status = 'contacted'
  } else if (body.action === 'snooze') {
    const days = Math.max(1, Math.min(60, body.snooze_days ?? 3))
    const next = new Date(Date.now() + days * 86_400_000)
    next.setHours(10, 0, 0, 0)
    update.next_action_at = next.toISOString()
  } else if (body.action === 'mark_lost') {
    update.status = 'lost'
    update.next_action_at = null
    update.next_action_note = null
  }

  const { error } = await supabaseAdmin
    .from('leads')
    .update(update)
    .in('id', leadIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const id of leadIds) {
    logLeadAccess({
      leadId: id,
      actor:  me.email,
      action: 'update',
      details: { bulk: body.action, ...update },
    })
  }

  return NextResponse.json({ ok: true, updated: leadIds.length })
}
