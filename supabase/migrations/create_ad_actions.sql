-- ad_actions — audit log for every automated ad action taken via /api/ads.
-- Captures who/what/when, plus the API response so we can reconstruct spend
-- decisions without hitting Meta/TikTok history.
create table if not exists public.ad_actions (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null,           -- meta | tiktok
  action        text not null,           -- launch | pause | resume | budget_update | insights
  service       text,                    -- glp1 | std | ckd | foreign | mens
  campaign_id   text,                    -- platform campaign id (after launch)
  adset_id      text,
  ad_id         text,
  daily_budget_thb int,                  -- budget at moment of action, in THB
  dry_run       boolean not null default false,
  initiated_by  text,                    -- 'claude' | 'cron' | user email
  request       jsonb,                   -- params we sent
  response      jsonb,                   -- platform response (or error)
  ok            boolean not null default true,
  error         text,
  created_at    timestamptz not null default now()
);

alter table public.ad_actions enable row level security;

create policy "Service role full access"
  on public.ad_actions for all
  using (true)
  with check (true);

create index if not exists ad_actions_created_at_idx
  on public.ad_actions (created_at desc);
create index if not exists ad_actions_platform_service_idx
  on public.ad_actions (platform, service, created_at desc);
