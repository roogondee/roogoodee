import { supabaseAdmin } from '@/lib/supabase'

export type LinePauseReason = 'burmese' | 'staff_reply'

// Myanmar (Burmese) Unicode block — U+1000–U+109F. Used to detect a Burmese
// customer texting in so the bot can hand off to staff instead of replying
// with a Thai-tuned AI prompt in a language it isn't built for.
const BURMESE_SCRIPT = /[က-႟]/

export function isBurmeseText(text: string): boolean {
  return BURMESE_SCRIPT.test(text)
}

// Burmese hand-off re-triggers on every message from that user (see
// line-webhook route), so a short window is enough. A staff-marked pause
// needs to outlast a single reply, so it defaults longer.
const BURMESE_PAUSE_HOURS = 6
const STAFF_PAUSE_HOURS = 24

interface ActivePause {
  reason: LinePauseReason
  paused_until: string
}

export async function getActivePause(lineUserId: string): Promise<ActivePause | null> {
  if (!lineUserId) return null
  const { data } = await supabaseAdmin
    .from('line_bot_pauses')
    .select('reason, paused_until')
    .eq('line_user_id', lineUserId)
    .maybeSingle()
  if (!data) return null
  if (new Date(data.paused_until).getTime() <= Date.now()) return null
  return data as ActivePause
}

export async function pauseBotForUser(
  lineUserId: string,
  reason: LinePauseReason,
  hours?: number
): Promise<void> {
  if (!lineUserId) return
  const h = hours ?? (reason === 'burmese' ? BURMESE_PAUSE_HOURS : STAFF_PAUSE_HOURS)
  const paused_until = new Date(Date.now() + h * 60 * 60 * 1000).toISOString()
  const { error } = await supabaseAdmin
    .from('line_bot_pauses')
    .upsert(
      { line_user_id: lineUserId, reason, paused_until, updated_at: new Date().toISOString() },
      { onConflict: 'line_user_id' }
    )
  if (error) console.error('pauseBotForUser failed:', error)
}

export async function resumeBotForUser(lineUserId: string): Promise<void> {
  if (!lineUserId) return
  const { error } = await supabaseAdmin
    .from('line_bot_pauses')
    .delete()
    .eq('line_user_id', lineUserId)
  if (error) console.error('resumeBotForUser failed:', error)
}
