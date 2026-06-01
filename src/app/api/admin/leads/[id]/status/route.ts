import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'

export const runtime = 'nodejs'

const STATUSES = ['new', 'contacted', 'qualified', 'booked', 'visited', 'customer', 'lost']

// PATCH { status } — move a lead along the pipeline (kanban drag/select).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = (await req.json().catch(() => ({}))) as { status?: string }
  if (!status || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('leads').update({ status }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record the move in the activity timeline.
  void supabaseAdmin.from('lead_activities').insert([{
    lead_id: params.id, actor_email: me.email, kind: 'note', body: `ย้ายสถานะเป็น ${status}`,
  }]).then(({ error: e }) => { if (e) console.error('status activity log:', e.message) })

  logLeadAccess({ actor: me.email, action: 'update', leadId: params.id, details: { status }, ip: requestIp(req) })
  return NextResponse.json({ ok: true })
}
