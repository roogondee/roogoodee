import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function requireAdmin() {
  const session = cookies().get('admin_session')?.value
  if (!session || session !== process.env.ADMIN_SECRET) return false
  return true
}

interface RouteParams { params: { code: string } }

// GET — look up voucher by code with associated lead
export async function GET(_req: NextRequest, { params }: RouteParams) {
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = decodeURIComponent(params.code).trim().toUpperCase()
  const { data, error } = await supabaseAdmin
    .from('vouchers')
    .select('id, code, service, issued_at, expires_at, redeemed_at, redeemed_by, lead:leads(id, first_name, last_name, phone, lead_tier, lead_score, status)')
    .eq('code', code)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'ไม่พบ voucher นี้' }, { status: 404 })

  const expired = new Date(data.expires_at).getTime() < Date.now()
  return NextResponse.json({ voucher: data, expired })
}

// POST — mark voucher as redeemed
export async function POST(req: NextRequest, { params }: RouteParams) {
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = decodeURIComponent(params.code).trim().toUpperCase()
  const { staff_name } = await req.json()
  if (!staff_name || typeof staff_name !== 'string' || !staff_name.trim()) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อพนักงาน' }, { status: 400 })
  }

  const { data: voucher, error: lookupError } = await supabaseAdmin
    .from('vouchers')
    .select('id, lead_id, expires_at, redeemed_at')
    .eq('code', code)
    .maybeSingle()

  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
  if (!voucher) return NextResponse.json({ error: 'ไม่พบ voucher นี้' }, { status: 404 })
  if (voucher.redeemed_at) return NextResponse.json({ error: 'Voucher นี้ใช้ไปแล้ว' }, { status: 409 })
  if (new Date(voucher.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Voucher หมดอายุแล้ว' }, { status: 410 })
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabaseAdmin
    .from('vouchers')
    .update({ redeemed_at: now, redeemed_by: staff_name.trim() })
    .eq('id', voucher.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Spec §6.1: advance pipeline to 'visited' on redemption
  await supabaseAdmin
    .from('leads')
    .update({ status: 'visited' })
    .eq('id', voucher.lead_id)

  return NextResponse.json({ ok: true, redeemed_at: now })
}
