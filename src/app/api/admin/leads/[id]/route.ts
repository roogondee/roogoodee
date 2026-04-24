import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, requestIp } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'

// Spec §6.1 pipeline + legacy 'converted'
const VALID_STATUSES = [
  'new', 'contacted', 'qualified', 'booked', 'visited', 'customer', 'lost', 'converted',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Sales can only update leads assigned to them
  if (me.role === 'sale' && me.id) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('assigned_to')
      .eq('id', params.id)
      .maybeSingle()
    if (!lead || lead.assigned_to !== me.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json() as { status?: string; note?: string }

  const update: Record<string, unknown> = {}
  if (typeof body.status !== 'undefined') {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }
  if (typeof body.note !== 'undefined') {
    update.note = body.note.slice(0, 2000)
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('leads')
    .update(update)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({
    leadId:  params.id,
    actor:   me.email,
    action:  'update',
    details: update,
    ip:      requestIp(req),
  })

  return NextResponse.json({ ok: true })
}
