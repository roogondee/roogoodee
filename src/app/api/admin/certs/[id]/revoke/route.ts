import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'

export const runtime = 'nodejs'

// POST /api/admin/certs/[id]/revoke — manager only. Revoked certs keep
// resolving on the verify page (showing "ถูกเพิกถอน") so a scanner cannot
// confuse revocation with a non-existent/forged token.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (me.role !== 'manager') {
    return NextResponse.json({ error: 'เฉพาะผู้จัดการเท่านั้นที่เพิกถอนใบรับรองได้' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const reason = (body.reason ?? '').toString().trim()
  if (!reason) return NextResponse.json({ error: 'ต้องระบุเหตุผลการเพิกถอน' }, { status: 400 })

  const { data: cert } = await supabaseAdmin
    .from('medical_certificates')
    .select('status')
    .eq('id', params.id)
    .maybeSingle()
  if (!cert) return NextResponse.json({ error: 'ไม่พบใบรับรอง' }, { status: 404 })
  if (cert.status !== 'issued') {
    return NextResponse.json({ error: 'เพิกถอนได้เฉพาะใบรับรองที่ออกแล้ว' }, { status: 409 })
  }

  const { error } = await supabaseAdmin
    .from('medical_certificates')
    .update({
      status: 'revoked',
      revoked_by: me.id,
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({ actor: me.email, action: 'cert_revoke', details: { cert_id: params.id, reason }, ip: requestIp(req) })
  return NextResponse.json({ ok: true })
}
