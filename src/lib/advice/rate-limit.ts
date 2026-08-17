// Best-effort in-memory rate limiter for /api/advice.
//
// This endpoint is public, unauthenticated, and built to sit behind Google Ads
// — every message triggers a paid Anthropic call, so it needs its own limiter
// (the DB-backed one in /api/quiz counts leads/day, which doesn't fit a
// per-message chat). Kept as a plain in-memory Map instead of a Supabase
// round-trip on every message so triage/replies stay fast.
//
// Caveat, spelled out because it matters at review time: this only limits
// requests within a single serverless instance. Vercel can run several
// instances of this route concurrently, so a determined abuser sees a higher
// effective ceiling than WINDOW/LIMIT implies. That's an accepted tradeoff —
// the goal is to blunt casual bot/script abuse of a paid API, not to be a
// hard security boundary. If real abuse shows up, move this to Supabase or
// Upstash Redis instead of tightening the numbers here.

const WINDOW_MS = 5 * 60 * 1000
const LIMIT = 20

const hits = new Map<string, number[]>()

// Sweep occasionally so the map doesn't grow forever on a long-lived instance.
let lastSweep = 0
function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return
  lastSweep = now
  for (const [key, timestamps] of Array.from(hits.entries())) {
    const fresh = timestamps.filter((t: number) => now - t < WINDOW_MS)
    if (fresh.length === 0) hits.delete(key)
    else hits.set(key, fresh)
  }
}

export function checkAdviceRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  if (!ip) return { allowed: true } // no IP header available — fail open, don't block real users

  const now = Date.now()
  sweep(now)

  const timestamps = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  if (timestamps.length >= LIMIT) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - timestamps[0])) / 1000)
    return { allowed: false, retryAfterSec }
  }

  timestamps.push(now)
  hits.set(ip, timestamps)
  return { allowed: true }
}

export function clientIpFrom(req: { headers: { get(name: string): string | null } }): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
}
