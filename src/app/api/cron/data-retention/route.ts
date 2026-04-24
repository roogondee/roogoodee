import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logLeadAccess } from '@/lib/audit'

// Spec §8.1: "Data retention — ลบ lead ที่ไม่ convert ภายใน 2 ปี"
// Customers (status='customer') are retained for business records.

const RETENTION_YEARS = 2

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const secret = process.env.CRON_SECRET
  const isAuthorized = !!vercelCron || (secret && auth === `Bearer ${secret}`)
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS)

  const { data: expiredLeads, error } = await supabaseAdmin
    .from('leads')
    .select('id, phone, status')
    .lt('created_at', cutoff.toISOString())
    .neq('status', 'customer')
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (expiredLeads || []).map(l => l.id)
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, cutoff: cutoff.toISOString() })
  }

  // vouchers cascade via FK ON DELETE CASCADE
  const { error: deleteError } = await supabaseAdmin
    .from('leads')
    .delete()
    .in('id', ids)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  for (const id of ids) {
    logLeadAccess({ leadId: id, actor: 'system', action: 'delete', details: { reason: 'retention_2y' } })
  }

  return NextResponse.json({
    ok: true,
    deleted: ids.length,
    cutoff: cutoff.toISOString(),
  })
}
