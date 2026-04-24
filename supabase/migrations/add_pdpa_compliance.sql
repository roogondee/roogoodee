-- PDPA compliance tables (spec §8.1, §8.2)

-- ── 1. Data deletion requests (right to be forgotten) ──────────────────
create table if not exists public.data_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  email         text,
  reason        text,
  requested_at  timestamptz not null default now(),
  requester_ip  text,
  status        text not null default 'pending'
                check (status in ('pending','processed','rejected')),
  processed_at  timestamptz,
  processed_by  text,
  notes         text
);

alter table public.data_deletion_requests enable row level security;

create policy "Service role full access on deletion_requests"
  on public.data_deletion_requests for all
  using (auth.role() = 'service_role');

create index if not exists deletion_requests_status_idx
  on public.data_deletion_requests (status, requested_at desc);

-- ── 2. Audit log for lead access (spec §8.2) ───────────────────────────
create table if not exists public.lead_access_log (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references public.leads(id) on delete set null,
  actor        text not null,          -- admin identifier ('admin' for cookie auth, or email)
  action       text not null,          -- 'view' | 'update' | 'redeem' | 'delete' | 'export'
  details      jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);

alter table public.lead_access_log enable row level security;

create policy "Service role full access on access_log"
  on public.lead_access_log for all
  using (auth.role() = 'service_role');

create index if not exists lead_access_log_lead_idx on public.lead_access_log (lead_id, created_at desc);
create index if not exists lead_access_log_time_idx on public.lead_access_log (created_at desc);
