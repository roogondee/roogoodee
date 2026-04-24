-- Lead nurture log — records every personalized follow-up suggestion the AI
-- generates for a lead, so we don't re-queue the same lead within the cooldown
-- window (default 5 days in the Python job).
create table if not exists public.lead_nurture_log (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  message     text not null,          -- the draft message sent to the team
  channel     text,                   -- phone_call | line | sms
  trigger     text,                   -- check_in | promo | education | book_now
  urgency     int,                    -- 1..5
  reason      text,
  created_at  timestamptz default now()
);

alter table public.lead_nurture_log enable row level security;

create policy "Service role full access"
  on public.lead_nurture_log for all
  using (true)
  with check (true);

create index if not exists lead_nurture_log_lead_id_idx
  on public.lead_nurture_log (lead_id, created_at desc);
create index if not exists lead_nurture_log_created_at_idx
  on public.lead_nurture_log (created_at desc);
