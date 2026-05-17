-- Salesperson follow-up tracking. Without these columns the team can mark a
-- lead "contacted" but lose the answer to "when do I call again?" — meaning
-- leads that say "เรียกกลับพรุ่งนี้บ่าย 3" never get a reminder and slip
-- through the funnel.
--
-- next_followup_at  — scheduled next-touch time. Drives the /admin/my-tasks
--                     priority queue and the overdue alert cron.
-- last_contacted_at — most recent salesperson outreach (any channel). Lets
--                     the overdue alert distinguish "new lead never touched"
--                     from "contacted but waiting on customer".
-- contact_attempts  — counter, incremented on every call/LINE/SMS log. Caps
--                     dialer fatigue (after 4-5 attempts move to lost).
-- last_outcome      — short-form result of the last attempt. UI shows it as
--                     a badge so the next salesperson context-switches in
--                     under a second.
alter table public.leads
  add column if not exists next_followup_at  timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists contact_attempts  int default 0,
  add column if not exists last_outcome      text;       -- answered | no_answer | voicemail | wrong_number | line_sent | sms_sent | scheduled

-- Drives the my-tasks page query (assigned_to + ordered by next_followup_at).
create index if not exists leads_assigned_followup_idx
  on public.leads (assigned_to, next_followup_at nulls last);

-- Drives the overdue cron query.
create index if not exists leads_followup_due_idx
  on public.leads (next_followup_at)
  where next_followup_at is not null;

-- Append-only contact attempt log. One row per call/LINE/SMS so managers can
-- audit "did we really reach this lead 5 times?" — the leads.contact_attempts
-- counter is the fast read, this table is the source of truth for the audit.
create table if not exists public.lead_contact_log (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  by_user         uuid,                                   -- nullable: cron / system writes leave this null
  channel         text not null,                          -- call | line | sms | email | other
  outcome         text not null,                          -- answered | no_answer | voicemail | wrong_number | line_sent | sms_sent | scheduled
  notes           text,
  next_followup_at timestamptz,                           -- snapshot of what was scheduled at this attempt
  created_at      timestamptz default now()
);

alter table public.lead_contact_log enable row level security;

create policy "Service role full access"
  on public.lead_contact_log for all
  using (true)
  with check (true);

create index if not exists lead_contact_log_lead_idx
  on public.lead_contact_log (lead_id, created_at desc);
create index if not exists lead_contact_log_by_user_idx
  on public.lead_contact_log (by_user, created_at desc);
