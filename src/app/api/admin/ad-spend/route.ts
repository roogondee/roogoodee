import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { canWrite, getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// Manual ad-spend entry for /admin/growth — Google, TikTok and LINE Ads have
// no API hookup, so their daily/weekly spend is typed in here. Meta arrives
// automatically via scripts/sync_ad_spend.py (source='meta_api').

const PLATFORMS = ['meta', 'google', 'tiktok', 'line', 'other']
const SERVICES = ['glp1', 'ckd', 'std', 'foreign', 'mens', 'women', 'mind', 'dna', 'advice', 'unknown']

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!canWrite(me)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    spend_date?: string; platform?: string; service?: string; campaign?: string; spend?: number | string
  }
  const spend = Number(body.spend)
  if (!body.spend_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.spend_date)) {
    return NextResponse.json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 })
  }
  if (!body.platform || !PLATFORMS.includes(body.platform)) {
    return NextResponse.json({ error: 'แพลตฟอร์มไม่ถูกต้อง' }, { status: 400 })
  }
  if (!body.service || !SERVICES.includes(body.service)) {
    return NextResponse.json({ error: 'บริการไม่ถูกต้อง' }, { status: 400 })
  }
  if (!Number.isFinite(spend) || spend < 0 || spend > 10_000_000) {
    return NextResponse.json({ error: 'ยอดเงินไม่ถูกต้อง' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('ad_spend_daily').upsert({
    spend_date: body.spend_date,
    platform: body.platform,
    service: body.service,
    campaign: (body.campaign || '').trim().slice(0, 200),
    spend,
    source: 'manual',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'spend_date,platform,service,campaign' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const me = await getSessionUser()
  if (!canWrite(me)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  // Only hand-typed rows — a Meta row would just come back on the next sync.
  const { error } = await supabaseAdmin.from('ad_spend_daily').delete().eq('id', id).eq('source', 'manual')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
