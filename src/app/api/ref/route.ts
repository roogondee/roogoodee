import { NextRequest, NextResponse } from 'next/server'
import { checkAdviceRateLimit, clientIpFrom } from '@/lib/advice/rate-limit'
import { mintRefCode, setRefConsent } from '@/lib/growth/ref-visits'
import { parseBareRefCode, refLineUrl, type RefProgram } from '@/lib/refcodes'

export const runtime = 'nodejs'

// Public: /medical-certificate and /clinic call this once per visit to mint
// the code they show on the page and pre-fill into the LINE button. Accepts
// only click ids, utm and the banner answer — never personal data.

const PROGRAMS: readonly RefProgram[] = ['medcert', 'clinic']
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

function short(v: unknown, max = 200): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
}

export async function POST(req: NextRequest) {
  const ip = clientIpFrom(req)
  if (!checkAdviceRateLimit(ip).allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const program = body.program as RefProgram
  if (!PROGRAMS.includes(program)) return NextResponse.json({ error: 'bad program' }, { status: 400 })

  const utm: Record<string, string> = {}
  for (const k of UTM_KEYS) { const v = short(body[k], 120); if (v) utm[k] = v }

  const ref_code = await mintRefCode({
    program,
    gclid: short(body.gclid, 200),
    fbc: short(body.fbc, 300),
    fbp: short(body.fbp, 120),
    utm,
    consent: body.consent === true,
    ip,
    userAgent: req.headers.get('user-agent'),
    path: short(body.path, 200),
  })
  if (!ref_code) return NextResponse.json({ error: 'could not mint' }, { status: 500 })
  return NextResponse.json({ ref_code, line_url: refLineUrl(ref_code, program) })
}

// The PDPA banner is often answered after the code exists. Rate-limited like
// minting: the code is the only key, so this must not be a way to sweep the
// code space flipping other visitors' consent.
export async function PATCH(req: NextRequest) {
  const ip = clientIpFrom(req)
  if (!checkAdviceRateLimit(ip).allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const ref = parseBareRefCode(short(body.ref_code, 16) ?? '')
  if (!ref) return NextResponse.json({ error: 'bad ref' }, { status: 400 })
  await setRefConsent(ref.code, body.consent === true, ip, req.headers.get('user-agent'))
  return NextResponse.json({ ok: true })
}
