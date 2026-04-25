import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, requestIp } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'

interface RouteParams { params: { id: string } }

// POST — process the request: delete matching leads (and cascade vouchers) + mark processed
export async function POST(req: NextRequest, { params }: RouteParams) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'manager') {
    return NextResponse.json({ error: 'เฉพาะ manager เท่านั้น' }, { status: 403 })
  }

  const { action } = await req.json() as { action?: 'process' | 'reject' }
  if (action !== 'process' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: reqRow, error: lookupError } = await supabaseAdmin
    .from('data_deletion_requests')
    .select('id, phone, email, status')
    .eq('id', params.id)
    .maybeSingle()
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
  if (!reqRow) return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 })
  if (reqRow.status !== 'pending') {
    return NextResponse.json({ error: 'คำขอนี้ดำเนินการไปแล้ว' }, { status: 409 })
  }

  const ip = requestIp(req)
  let deletedLeadIds: string[] = []

  if (action === 'process') {
    const { data: leadsToDelete } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('phone', reqRow.phone)

    deletedLeadIds = (leadsToDelete || []).map(l => l.id)

    if (deletedLeadIds.length > 0) {
      // vouchers cascade via FK ON DELETE CASCADE
      const { error: deleteError } = await supabaseAdmin
        .from('leads')
        .delete()
        .in('id', deletedLeadIds)
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    for (const id of deletedLeadIds) {
      logLeadAccess({ leadId: id, actor: me.email, action: 'delete', ip, details: { reason: 'pdpa_request', request_id: params.id } })
    }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabaseAdmin
    .from('data_deletion_requests')
    .update({
      status:       action === 'process' ? 'processed' : 'rejected',
      processed_at: now,
      processed_by: me.email,
      notes:        action === 'process' ? `Deleted ${deletedLeadIds.length} lead(s)` : null,
    })
    .eq('id', params.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    action,
    deleted_leads: deletedLeadIds.length,
  })
}
