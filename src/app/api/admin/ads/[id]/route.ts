import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, note } = body as { action: 'approve' | 'reject'; note?: string }

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  const status = action === 'approve' ? 'approved' : 'rejected'
  const update: Record<string, unknown> = {
    status,
    approved_by: me.email,
    approved_at: action === 'approve' ? new Date().toISOString() : null,
  }
  if (note) update['note'] = note.slice(0, 500)

  const { error } = await supabaseAdmin
    .from('ad_drafts')
    .update(update)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}
