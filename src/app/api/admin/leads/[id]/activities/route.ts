import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'

const VALID_KINDS = new Set(['call', 'line', 'sms', 'visit', 'note', 'email'])
const VALID_OUTCOMES = new Set([
  'reached', 'no_answer', 'wrong_number', 'callback_requested',
  'booked', 'not_interested', 'customer', 'other',
])
const CONTACT_KINDS = new Set(['call', 'line', 'sms', 'visit', 'email'])

async function assertCanAccess(leadId: string, role: string, userId: string | null) {
  if (role !== 'sale' || !userId) return true
  const { data } = await supabaseAdmin
    .from('leads')
    .select('assigned_to')
    .eq('id', leadId)
    .maybeSingle()
  return !!data && data.assigned_to === userId
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await assertCanAccess(params.id, me.role, me.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('lead_activities')
    .select('*')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ activities: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await assertCanAccess(params.id, me.role, me.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    kind?: string
    outcome?: string | null
    body?: string
    next_action_at?: string | null
    next_action_note?: string | null
  }

  if (!body.kind || !VALID_KINDS.has(body.kind)) {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 })
  }
  if (body.outcome && !VALID_OUTCOMES.has(body.outcome)) {
    return NextResponse.json({ error: 'invalid_outcome' }, { status: 400 })
  }

  const text = (body.body || '').slice(0, 2000)
  const nextAt = body.next_action_at ? new Date(body.next_action_at) : null
  if (nextAt && Number.isNaN(nextAt.getTime())) {
    return NextResponse.json({ error: 'invalid_next_action_at' }, { status: 400 })
  }
  const nextNote = body.next_action_note ? body.next_action_note.slice(0, 500) : null

  const now = new Date().toISOString()
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('lead_activities')
    .insert([{
      lead_id:           params.id,
      actor_id:          me.id,
      actor_email:       me.email,
      kind:              body.kind,
      outcome:           body.outcome || null,
      body:              text || null,
      next_action_at:    nextAt ? nextAt.toISOString() : null,
      next_action_note:  nextNote,
    }])
    .select()
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Mirror to parent lead: bump last_contacted_at for real-channel kinds,
  // and copy next-action so the queue page can `where next_action_at <= now()`.
  const leadUpdate: Record<string, unknown> = {}
  if (CONTACT_KINDS.has(body.kind)) leadUpdate.last_contacted_at = now
  if (nextAt) {
    leadUpdate.next_action_at = nextAt.toISOString()
    leadUpdate.next_action_note = nextNote
  } else if (body.outcome === 'customer' || body.outcome === 'not_interested') {
    // Terminal outcomes — clear the queue entry so the lead drops off.
    leadUpdate.next_action_at = null
    leadUpdate.next_action_note = null
  }

  // Auto-advance status on common outcomes (sales never has to remember).
  if (body.outcome === 'reached')       leadUpdate.status = 'contacted'
  if (body.outcome === 'booked')        leadUpdate.status = 'booked'
  if (body.outcome === 'customer')      leadUpdate.status = 'customer'
  if (body.outcome === 'not_interested') leadUpdate.status = 'lost'

  if (Object.keys(leadUpdate).length > 0) {
    const { error: updErr } = await supabaseAdmin
      .from('leads')
      .update(leadUpdate)
      .eq('id', params.id)
    if (updErr) console.error('lead mirror update failed:', updErr)
  }

  logLeadAccess({
    leadId:  params.id,
    actor:   me.email,
    action:  'activity',
    details: { kind: body.kind, outcome: body.outcome || null, has_next: !!nextAt },
  })

  return NextResponse.json({ ok: true, activity: inserted })
}
