-- AI lead scoring — separate signal from the rule-based lead_tier (which is set
-- by the quiz route from quiz answers). Claude scores every new lead based on
-- chat history + lead context so sales can see both signals side-by-side.
alter table public.leads
  add column if not exists ai_score          int,
  add column if not exists ai_score_reason   text,
  add column if not exists ai_score_action   text,
  add column if not exists ai_scored_at      timestamptz;

alter table public.leads
  drop constraint if exists leads_ai_score_range;
alter table public.leads
  add constraint leads_ai_score_range
  check (ai_score is null or (ai_score between 1 and 100));

-- index unscored fresh leads (the cron's hot-path query)
create index if not exists leads_unscored_idx
  on public.leads (created_at desc)
  where ai_score is null;

-- index for sorting by score
create index if not exists leads_ai_score_idx
  on public.leads (ai_score desc nulls last);
