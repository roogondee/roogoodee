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
