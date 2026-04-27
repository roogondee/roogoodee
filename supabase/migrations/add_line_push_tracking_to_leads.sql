-- Track 1-on-1 LINE push follow-ups so the daily cron in
-- scripts/line_push_followup.py never spams the same lead.
-- We keep a count + last-push timestamp on the lead row directly
-- (no separate audit table — lead_nurture_log already covers staff drafts;
-- this is the message we actually sent through Messaging API push).
alter table public.leads
  add column if not exists line_pushed_at   timestamptz,
  add column if not exists line_push_count  int not null default 0;

-- Help the cron's eligibility query: leads with a line_id and a small push
-- count find their candidates fast.
create index if not exists leads_line_push_eligible_idx
  on public.leads (line_pushed_at nulls first, line_push_count)
  where line_id is not null;
