-- Sticky triage level for /api/advice sessions.
--
-- Red-flag triage (src/lib/advice/triage.ts) runs on every message, but the
-- level must not downgrade mid-conversation: someone who mentions chest pain
-- and then makes small talk is still an emergency conversation. Persisting
-- the level lets the next turn call escalate(previous, next) instead of
-- re-deriving it from the whole message history.
alter table public.chat_sessions
  add column if not exists triage_level text; -- 'routine' | 'urgent' | 'emergency', null = pre-advice sessions
