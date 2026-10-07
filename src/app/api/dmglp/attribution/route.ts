import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAdviceRateLimit, clientIpFrom } from '@/lib/advice/rate-limit'
import { createAttribution } from '@/lib/dmglp/db'
import { detectChannel, lineDeepLink } from '@/lib/dmglp/attribution'

export const runtime = 'nodejs'

// Public: the /dmglp landing calls this once per visit to mint a ref code
// (DM-4821) that the LINE button carries. Stores gclid/utm/partner ref and
// whether the visitor accepted the PDPA/cookie banner (§4.9 steps 1 + 5).
// No personal data is accepted here — the LINE webhook adds the user later.

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

function short(v: unknown, max = 200): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
}

export async function POST(req: NextRequest) {
  const rl = checkAdviceRateLimit(clientIpFrom(req))
  if (!rl.allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const gclid = short(body.gclid, 120)
  const utm: Record<string, string> = {}
  for (const k of UTM_KEYS) { const v = short(body[k], 120); if (v) utm[k] = v }
  const ref = short(body.ref, 20)?.toUpperCase().replace(/[^A-Z0-9-]/g, '') || null

  let partner_id: string | null = null
  if (ref) {
    const { data } = await supabaseAdmin.from('dmglp_partners').select('id').eq('ref_code', ref).eq('active', true).maybeSingle()
    partner_id = data?.id ?? null
  }

  const row = await createAttribution({
    gclid, utm, partner_id,
    channel: detectChannel({ gclid, utm_source: utm.utm_source, ref: partner_id ? ref : null }),
    cookie_consent: body.consent === true,
    landing_path: short(body.path, 200),
  })
  if (!row) return NextResponse.json({ error: 'could not create attribution' }, { status: 500 })
  return NextResponse.json({ ref_code: row.ref_code, line_url: lineDeepLink(row.ref_code) })
}

// The banner is answered after the row exists → flip its consent flag.
export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const ref = short(body.ref_code, 12)
  if (!ref || !/^DM-\d{4}$/.test(ref)) return NextResponse.json({ error: 'bad ref' }, { status: 400 })
  await supabaseAdmin.from('dmglp_attribution').update({ cookie_consent: body.consent === true }).eq('ref_code', ref)
  return NextResponse.json({ ok: true })
}
