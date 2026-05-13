-- Quiz funnel drop-off tracking — per-question events for the multi-step quiz.
-- Powers /admin/quiz-funnel dashboard so we can see which question each
-- service loses respondents on.
--
-- A session_id (uuid) is generated client-side in QuizRunner on mount and
-- reused for every event in that quiz attempt, letting us join start →
-- progress(N) → complete to compute drop-off per step.

create table if not exists public.quiz_funnel_events (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  service         text not null,
  event           text not null,         -- 'start' | 'progress' | 'complete' | 'submit_success'
  question_id     text,                  -- null for 'start' / 'complete'
  question_index  int,                   -- 0-based, null for 'start' / 'complete'
  total_questions int,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  referrer        text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists qfe_service_session_idx
  on public.quiz_funnel_events (service, session_id);

create index if not exists qfe_created_at_idx
  on public.quiz_funnel_events (created_at desc);

create index if not exists qfe_service_event_created_idx
  on public.quiz_funnel_events (service, event, created_at desc);
