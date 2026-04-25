import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, requestIp } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'

interface RouteParams { params: { id: string } }

// POST — assign (or unassign) a lead. Managers can assign anyone;
// sales cannot reassign (only managers).
export async function POST(req: NextRequest, { params }: RouteParams) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'manager') {
    return NextResponse.json({ error: 'เฉพาะ manager เท่านั้นที่มอบหมาย lead ได้' }, { status: 403 })
  }

  const body = await req.json() as { assigned_to?: string | null }
  const target = body.assigned_to ?? null

  if (target !== null) {
    const { data: u } = await supabaseAdmin
      .from('admin_users')
      .select('id, disabled_at')
      .eq('id', target)
      .maybeSingle()
    if (!u || u.disabled_at) return NextResponse.json({ error: 'User ไม่พบหรือถูกปิดใช้งาน' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('leads')
    .update({ assigned_to: target, assigned_at: target ? new Date().toISOString() : null })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({
    leadId:  params.id,
    actor:   me.email,
    action:  'update',
    details: { assigned_to: target },
    ip:      requestIp(req),
  })

  return NextResponse.json({ ok: true })
}
