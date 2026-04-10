-- Leads table: stores contact form submissions
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  service     text,
  first_name  text not null,
  last_name   text,
  phone       text not null,
  age         text,
  gender      text,
  note        text,
  source      text default 'roogondee.com',
  status      text default 'new',       -- new | contacted | closed
  created_at  timestamptz default now()
);

-- RLS
alter table public.leads enable row level security;

-- Only service role (server) can read/write leads (private data)
create policy "Service role full access"
  on public.leads for all
  using (auth.role() = 'service_role');

-- Index for dashboard queries
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_service_idx on public.leads (service);
