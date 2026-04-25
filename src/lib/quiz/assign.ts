import { supabaseAdmin } from '@/lib/supabase'

// Round-robin assignment: pick the active sale (or manager) with the
// fewest recent leads. Simple + no locking needed.
// Returns null when there are no active users; the lead stays unassigned
// and a manager can assign manually.
export async function pickNextAssignee(): Promise<string | null> {
  const { data: users } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .is('disabled_at', null)
  if (!users || users.length === 0) return null

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const counts = new Map<string, number>()
  for (const u of users) counts.set(u.id, 0)

  const { data: recent } = await supabaseAdmin
    .from('leads')
    .select('assigned_to')
    .gte('created_at', since)
    .not('assigned_to', 'is', null)
  for (const l of recent || []) {
    if (l.assigned_to && counts.has(l.assigned_to)) {
      counts.set(l.assigned_to, (counts.get(l.assigned_to) || 0) + 1)
    }
  }

  let bestId: string | null = null
  let bestN = Infinity
  counts.forEach((n, id) => {
    if (n < bestN) { bestN = n; bestId = id }
  })
  return bestId
}
