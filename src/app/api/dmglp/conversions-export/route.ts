import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getDmglpUser, can } from '@/lib/dmglp/roles'
import { dmglpAudit } from '@/lib/dmglp/audit'
import { conversionRowsToCsv } from '@/lib/dmglp/conversions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Google Ads offline-conversion feed for the DMGLP landing (§4.9 step 4).
// Same shape and auth as /api/ads/offline-conversions: point a Google Ads
// scheduled upload (HTTPS + Basic auth, ADS_OFFLINE_EXPORT_USER/PASSWORD) at
// this URL, or download it from /dmglp/staff/marketing/conversions. Only
// gclid + conversion name + time (+ value/currency) — nothing else, ever.
const WINDOW_DAYS = 90

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
function basicAuthOk(req: NextRequest): boolean {
  const user = process.env.ADS_OFFLINE_EXPORT_USER, pass = process.env.ADS_OFFLINE_EXPORT_PASSWORD
  if (!user || !pass) return false
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Basic ')) return false
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const idx = decoded.indexOf(':')
  return idx >= 0 && safeEqual(decoded.slice(0, idx), user) && safeEqual(decoded.slice(idx + 1), pass)
}

export async function GET(req: NextRequest) {
  const me = basicAuthOk(req) ? null : await getDmglpUser()
  if (!basicAuthOk(req) && !(me && can(me.role, 'marketing.read'))) {
    return new NextResponse('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="dmglp-conversions"' } })
  }
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('dmglp_conversions')
    .select('id, name, occurred_at, attribution:dmglp_attribution(gclid)')
    .gte('occurred_at', since).order('occurred_at').limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []).map(c => {
    const a = Array.isArray(c.attribution) ? c.attribution[0] : c.attribution
    return { gclid: (a as { gclid: string | null } | null)?.gclid ?? null, name: c.name, occurred_at: c.occurred_at }
  })
  const csv = conversionRowsToCsv(rows)
  const ids = (data ?? []).filter(c => { const a = Array.isArray(c.attribution) ? c.attribution[0] : c.attribution; return !!(a as { gclid: string | null } | null)?.gclid }).map(c => c.id)
  if (ids.length) await supabaseAdmin.from('dmglp_conversions').update({ exported_at: new Date().toISOString() }).in('id', ids).is('exported_at', null)
  dmglpAudit(me, 'export', 'dmglp_conversions', null, { rows: rows.length })
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="dmglp-google-ads-conversions.csv"' },
  })
}
