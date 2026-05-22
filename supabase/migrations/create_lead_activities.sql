-- CRM activity timeline + next-action tracking.
-- One row per sales touchpoint (call, LINE, SMS, visit, internal note).
-- `next_action_at` on the parent `leads` row is the single source of truth for
-- the "วันนี้ต้องตามใคร" queue — we copy from the latest activity that sets it
-- so a `where lead.next_action_at <= now()` query stays simple & indexable.

create table if not exists public.lead_activities (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads(id) on delete cascade,
  actor_id          uuid references public.admin_users(id) on delete set null,
  actor_email       text not null,
  kind              text not null check (kind in ('call','line','sms','visit','note','email')),
  outcome           text check (outcome in (
    'reached','no_answer','wrong_number','callback_requested',
    'booked','not_interested','customer','other'
  )),
  body              text,
  next_action_at    timestamptz,
  next_action_note  text,
  created_at        timestamptz not null default now()
);

alter table public.lead_activities enable row level security;

create policy "Service role full access"
  on public.lead_activities for all
  using (true)
  with check (true);

create index if not exists lead_activities_lead_id_idx
  on public.lead_activities (lead_id, created_at desc);
create index if not exists lead_activities_actor_id_idx
  on public.lead_activities (actor_id, created_at desc);

-- Mirror fields on leads so the queue page can filter without an aggregate.
alter table public.leads
  add column if not exists last_contacted_at  timestamptz,
  add column if not exists next_action_at     timestamptz,
  add column if not exists next_action_note   text;

create index if not exists leads_next_action_at_idx
  on public.leads (next_action_at)
  where next_action_at is not null;
