-- Per-sender rate limit for the social bot. Without this an attacker can blast
-- the bot with messages and rack up Anthropic spend during an ad campaign
-- (where webhook traffic spikes 10-50x normal).
--
-- One row per inbound message; we count rows in the last hour for
-- (platform, sender_id) and short-circuit to a canned reply if the count
-- exceeds the threshold (15/hour by default — generous, real users rarely
-- exceed 5).
create table if not exists public.bot_message_log (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,    -- 'fb' | 'ig'
  sender_id   text not null,
  created_at  timestamptz default now()
);

create index if not exists bot_message_log_lookup_idx
  on public.bot_message_log (platform, sender_id, created_at desc);

alter table public.bot_message_log enable row level security;

create policy "Service role full access"
  on public.bot_message_log for all
  using (true)
  with check (true);
