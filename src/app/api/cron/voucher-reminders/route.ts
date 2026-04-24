import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendVoucherToUser } from '@/lib/email'
import { notifyLeadToSale } from '@/lib/line-notify'

// Spec §5, §10: nudge before voucher expiry to lift redemption rate.
// Called by a scheduler (vercel.json cron, Supabase cron, or external).
// Auth: either Bearer CRON_SECRET header, or Vercel's cron UA header on free tier.

const REMINDER_WINDOW_DAYS = 7 // nudge when expires_at is within 7 days

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const secret = process.env.CRON_SECRET
  const isAuthorized =
    !!vercelCron ||
    (secret && auth === `Bearer ${secret}`)
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const { data: vouchers, error } = await supabaseAdmin
    .from('vouchers')
    .select('id, code, service, expires_at, lead:leads(first_name, last_name, phone, line_id, email, lead_tier)')
    .is('redeemed_at', null)
    .is('reminded_at', null)
    .gte('expires_at', now.toISOString())
    .lt('expires_at', windowEnd.toISOString())
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ code: string; email: boolean; sale: boolean }> = []
  for (const v of vouchers || []) {
    const lead = Array.isArray(v.lead) ? v.lead[0] : v.lead
    if (!lead) continue

    const emailed = !!lead.email
    if (lead.email) {
      await sendVoucherToUser({
        to:         lead.email,
        name:       `${lead.first_name} ${lead.last_name || ''}`.trim(),
        service:    v.service,
        code:       v.code,
        expires_at: v.expires_at,
      })
    }

    // Sale team visibility — they can follow up via LINE/phone
    await notifyLeadToSale({
      name:         `${lead.first_name} ${lead.last_name || ''}`.trim(),
      phone:        lead.phone,
      line_id:      lead.line_id || undefined,
      service:      v.service,
      tier:         (lead.lead_tier as 'urgent' | 'hot' | 'warm' | 'cold') || 'warm',
      score:        0,
      voucher_code: v.code,
      reasons:      [`⏰ Voucher หมดอายุ ${new Date(v.expires_at).toLocaleDateString('th-TH')}`],
    })

    await supabaseAdmin
      .from('vouchers')
      .update({ reminded_at: now.toISOString() })
      .eq('id', v.id)

    results.push({ code: v.code, email: emailed, sale: true })
  }

  return NextResponse.json({
    ok: true,
    checked: vouchers?.length || 0,
    reminded: results.length,
    results,
  })
}
