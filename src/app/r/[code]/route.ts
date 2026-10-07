import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { REFERRAL_CODE_RE } from '@/lib/growth/referral'
import { hasLiffQuiz, liffQuizUrl } from '@/lib/liff-links'
import type { Service } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Patient referral link → the pillar's quiz, tagged utm_source=referral and
// utm_campaign=<code>. Both LIFF (claim-line) and the web quiz already store
// utm on the lead, so the referee is attributed with no new plumbing.
//
// Shared links are opened inside LINE, so go straight to the LIFF quiz when
// one is configured (one tap fewer); otherwise the /quiz gate. An unknown or
// malformed code still lands on the homepage rather than a 404 — the person
// clicking did nothing wrong.
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code || '').trim().toUpperCase()
  const home = new URL('/', req.url)
  if (!REFERRAL_CODE_RE.test(code)) return NextResponse.redirect(home, 302)

  const { data } = await supabaseAdmin
    .from('referral_codes').select('service').eq('code', code).maybeSingle()
  if (!data?.service) return NextResponse.redirect(home, 302)

  // Awaited: a serverless function may be frozen as soon as it responds.
  const { error: bumpErr } = await supabaseAdmin.rpc('bump_referral_click', { p_code: code })
  if (bumpErr) console.error('[referral] click count:', bumpErr.message)

  const service = data.service as Service
  const utm = { utm_source: 'referral', utm_medium: 'patient', utm_campaign: code }
  const target = hasLiffQuiz()
    ? liffQuizUrl({ service, ...utm })
    : new URL(`/quiz/${service}?${new URLSearchParams(utm).toString()}`, req.url).toString()

  return NextResponse.redirect(target, 302)
}
