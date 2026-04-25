-- Lab Test Giveaway System: expand leads + add vouchers table
-- See context/lab-test-system spec sections 3.1, 3.2, 5

-- ── 1. Expand leads table ──────────────────────────────────────────────
alter table public.leads
  add column if not exists line_id       text,
  add column if not exists email         text,
  add column if not exists quiz_answers  jsonb,
  add column if not exists lead_score    int,
  add column if not exists lead_tier     text,
  add column if not exists consent_pdpa  boolean default false,
  add column if not exists consent_at    timestamptz,
  add column if not exists crm_deal_id   text,
  add column if not exists utm_source    text,
  add column if not exists utm_medium    text,
  add column if not exists utm_campaign  text;

-- Extend status vocabulary: new | contacted | qualified | booked | visited | customer | lost
-- (kept as text to stay backwards-compatible with existing rows)
alter table public.leads
  add constraint leads_tier_check
  check (lead_tier is null or lead_tier in ('urgent','hot','warm','cold'));

create index if not exists leads_tier_idx       on public.leads (lead_tier);
create index if not exists leads_consent_idx    on public.leads (consent_pdpa);

-- ── 2. Vouchers table ──────────────────────────────────────────────────
create table if not exists public.vouchers (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  lead_id       uuid references public.leads(id) on delete cascade,
  service       text not null check (service in ('glp1','ckd','std','foreign')),
  issued_at     timestamptz not null default now(),
  expires_at    timestamptz not null,
  redeemed_at   timestamptz,
  redeemed_by   text,
  created_at    timestamptz not null default now()
);

alter table public.vouchers enable row level security;

create policy "Service role full access on vouchers"
  on public.vouchers for all
  using (auth.role() = 'service_role');

create index if not exists vouchers_code_idx     on public.vouchers (code);
create index if not exists vouchers_lead_idx     on public.vouchers (lead_id);
create index if not exists vouchers_service_idx  on public.vouchers (service);
create index if not exists vouchers_expires_idx  on public.vouchers (expires_at);

-- ── 3. Monthly quota helper view (spec §5.2: 50 / service / month) ─────
create or replace view public.vouchers_monthly_count as
select
  service,
  date_trunc('month', issued_at) as month,
  count(*) as issued
from public.vouchers
group by service, date_trunc('month', issued_at);
