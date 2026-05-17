import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, requestIp } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'

const VALID_CHANNELS = ['call', 'line', 'sms', 'email', 'other'] as const
const VALID_OUTCOMES = [
  'answered', 'no_answer', 'voicemail', 'wrong_number',
  'line_sent', 'sms_sent', 'email_sent',
  'scheduled',                                    // user just scheduled a follow-up, no actual contact yet
] as const

// Status promotion rules: certain outcomes naturally bump the lead's pipeline
// stage so the team doesn't have to manually click status + log contact.
//   answered → contacted (if still new)
//   scheduled → contacted (we have an active conversation, just deferred)
const STATUS_PROMOTIONS: Record<string, string> = {
  answered: 'contacted',
  scheduled: 'contacted',
}

interface ContactBody {
  channel?: string
  outcome?: string
  notes?: string
  next_followup_at?: string | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id, status, assigned_to, contact_attempts')
    .eq('id', params.id)
    .maybeSingle()
  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Sales role can only log contact on leads assigned to them.
  if (me.role === 'sale' && me.id && lead.assigned_to !== me.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as ContactBody
  const channel = body.channel
  const outcome = body.outcome
  if (!channel || !VALID_CHANNELS.includes(channel as typeof VALID_CHANNELS[number])) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
  }
  if (!outcome || !VALID_OUTCOMES.includes(outcome as typeof VALID_OUTCOMES[number])) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  const nextFollowup = body.next_followup_at
    ? new Date(body.next_followup_at).toISOString()
    : null

  const now = new Date().toISOString()
  const isRealContact = outcome !== 'scheduled' // 'scheduled' is just deferring, no outreach happened yet

  const newAttempts = (lead.contact_attempts ?? 0) + (isRealContact ? 1 : 0)
  const update: Record<string, unknown> = {
    next_followup_at: nextFollowup,
    last_outcome: outcome,
    contact_attempts: newAttempts,
  }
  if (isRealContact) update.last_contacted_at = now

  // Auto-promote pipeline stage if applicable, but never demote (e.g. don't
  // bump a 'booked' lead back to 'contacted' just because we logged a call).
  const promotion = STATUS_PROMOTIONS[outcome]
  if (promotion && lead.status === 'new') update.status = promotion

  const { error: updateErr } = await supabaseAdmin
    .from('leads')
    .update(update)
    .eq('id', params.id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Append-only contact log — managers audit "did we really call 5 times?"
  // against this, leads.contact_attempts is just the fast counter.
  await supabaseAdmin.from('lead_contact_log').insert([{
    lead_id: params.id,
    by_user: me.id,
    channel,
    outcome,
    notes: body.notes?.slice(0, 1000) || null,
    next_followup_at: nextFollowup,
  }])

  logLeadAccess({
    leadId: params.id,
    actor: me.email,
    action: 'update',
    details: { contact: { channel, outcome, next_followup_at: nextFollowup } },
    ip: requestIp(req),
  })

  return NextResponse.json({
    ok: true,
    contact_attempts: newAttempts,
    next_followup_at: nextFollowup,
  })
}
