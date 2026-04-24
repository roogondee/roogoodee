import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logLeadAccess, requestIp } from '@/lib/audit'

// Spec §6.1 pipeline + legacy 'converted'
const VALID_STATUSES = [
  'new', 'contacted', 'qualified', 'booked', 'visited', 'customer', 'lost', 'converted',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin session
  const session = cookies().get('admin_session')?.value
  if (session !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    actor:   'admin',
    action:  'update',
    details: update,
    ip:      requestIp(req),
  })

  return NextResponse.json({ ok: true })
}
