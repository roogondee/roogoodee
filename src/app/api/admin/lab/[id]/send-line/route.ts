import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { pushVoucherToUser } from '@/lib/line-notify'

export const runtime = 'nodejs'

// POST { voucherCode } — pushes an already-issued voucher to the patient's
// personal LINE. Resolves a LINE user id from the lead, the linked CRM contact,
// or the patient record (in that order). Returns lineSent=false with a reason
// when no LINE id is on file — the UI surfaces that rather than failing.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { voucherCode } = (await req.json().catch(() => ({}))) as { voucherCode?: string }
  if (!voucherCode) return NextResponse.json({ error: 'missing voucherCode' }, { status: 400 })

  const { data: voucher } = await supabaseAdmin
    .from('vouchers').select('code, service, expires_at, lead_id').eq('code', voucherCode).maybeSingle()
  if (!voucher) return NextResponse.json({ error: 'voucher not found' }, { status: 404 })

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, first_name, line_user_id, line_id, patient_id, contact_id, line_push_count')
    .eq('id', voucher.lead_id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'lead not found' }, { status: 404 })

  // Resolve a LINE user id: lead → CRM contact → patient.
  let lineId: string | null = lead.line_user_id || lead.line_id || null
  if (!lineId && lead.contact_id) {
    const { data: c } = await supabaseAdmin
      .from('crm_contacts').select('line_user_id').eq('id', lead.contact_id).maybeSingle()
    lineId = c?.line_user_id ?? null
  }
  if (!lineId && lead.patient_id) {
    const { data: p } = await supabaseAdmin
      .from('patients').select('line_id').eq('id', lead.patient_id).maybeSingle()
    lineId = p?.line_id ?? null
  }

  if (!lineId) {
    return NextResponse.json({ ok: true, lineSent: false, reason: 'ไม่มี LINE ID ของคนไข้รายนี้ในระบบ' })
  }

  const daysLeft = Math.ceil((new Date(voucher.expires_at).getTime() - Date.now()) / 86_400_000)
  const lineSent = await pushVoucherToUser(lineId, {
    name: lead.first_name || 'คนไข้',
    service: voucher.service,
    code: voucher.code,
    expires_at: voucher.expires_at,
    daysLeft,
  })

  if (lineSent) {
    await supabaseAdmin.from('leads').update({
      line_pushed_at: new Date().toISOString(),
      line_push_count: (lead.line_push_count ?? 0) + 1,
    }).eq('id', lead.id)
  }

  logLeadAccess({ leadId: lead.id, actor: me.email, action: 'lab_send', details: { event: 'lab_voucher_line', report_id: params.id, code: voucher.code, lineSent }, ip: requestIp(req) })
  return NextResponse.json({
    ok: true,
    lineSent,
    reason: lineSent ? undefined : 'ส่ง LINE ไม่สำเร็จ (ตรวจสอบ LINE token หรือสถานะผู้ใช้)',
  })
}
