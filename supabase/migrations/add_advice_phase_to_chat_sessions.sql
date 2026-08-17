-- Two-model handoff phase for /api/advice sessions.
--
-- Haiku conducts multi-turn history-taking (src/lib/advice/prompt.ts INTAKE
-- prompt); once it has enough to be useful it calls the submit_intake tool,
-- and the route hands the conversation to Sonnet for one structured,
-- detailed assessment turn (still no diagnosis, no prescribing — see
-- ASSESSMENT_SYSTEM_PROMPT). This column remembers which mode a session is
-- in so a later message ("ขอบคุณค่ะ") doesn't get pulled back into intake
-- questions after the handoff already happened.
alter table public.chat_sessions
  add column if not exists advice_phase text default 'intake'; -- 'intake' | 'assessment_done'
