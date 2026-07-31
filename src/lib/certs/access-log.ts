import { supabaseAdmin } from '@/lib/supabase'

// Fire-and-forget public-view log (PDPA processing record + leak detection).
// Never throws — logging failure must not block the verify page.
export function logCertView(input: { certificateId: string; ip?: string; userAgent?: string }) {
  void supabaseAdmin
    .from('certificate_access_log')
    .insert([{
      certificate_id: input.certificateId,
      ip: input.ip ?? null,
      user_agent: input.userAgent?.slice(0, 400) ?? null,
    }])
    .then(({ error }) => {
      if (error) console.error('cert access log error:', error.message)
    })
}

// DB-backed rate limit for the public verify page: counts this IP's views in
// the last 10 minutes. Works across serverless instances without Redis.
// Fails open — a broken counter must not take verification down.
const WINDOW_MINUTES = 10
const MAX_VIEWS_PER_WINDOW = 60

export async function isRateLimited(ip: string | undefined): Promise<boolean> {
  if (!ip) return false
  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count, error } = await supabaseAdmin
      .from('certificate_access_log')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('viewed_at', since)
    if (error) return false
    return (count ?? 0) >= MAX_VIEWS_PER_WINDOW
  } catch {
    return false
  }
}

// ── Public-search brute-force guard ────────────────────────────────────────
// Name / cert-number lookups reveal a certificate only when the correct
// personal verify_code is supplied. To stop an attacker enumerating the
// 6-digit code space against a known cert, every attempt (hit or miss) is
// logged per IP and capped in a short window. Fails open so a broken counter
// never blocks legitimate verification.
const SEARCH_WINDOW_MINUTES = 10
const MAX_SEARCH_ATTEMPTS_PER_WINDOW = 20

export function logVerifyAttempt(ip: string | undefined, ok: boolean) {
  void supabaseAdmin
    .from('certificate_verify_attempts')
    .insert([{ ip: ip ?? null, ok }])
    .then(({ error }) => {
      if (error) console.error('verify attempt log error:', error.message)
    })
}

export async function isSearchRateLimited(ip: string | undefined): Promise<boolean> {
  if (!ip) return false
  try {
    const since = new Date(Date.now() - SEARCH_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count, error } = await supabaseAdmin
      .from('certificate_verify_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('at', since)
    if (error) return false
    return (count ?? 0) >= MAX_SEARCH_ATTEMPTS_PER_WINDOW
  } catch {
    return false
  }
}
