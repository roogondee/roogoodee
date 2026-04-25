-- Per-user ACL (spec §8.2 "เฉพาะ sale ที่ได้รับมอบหมายเห็นข้อมูลได้")

-- ── 1. Admin users ─────────────────────────────────────────────────────
create table if not exists public.admin_users (
  id             uuid primary key default gen_random_uuid(),
  email          text unique not null,
  name           text,
  password_hash  text not null,           -- scrypt:<salt_hex>:<hash_hex>
  role           text not null default 'sale'
                 check (role in ('manager','sale')),
  created_at     timestamptz not null default now(),
  disabled_at    timestamptz,
  last_login_at  timestamptz
);

alter table public.admin_users enable row level security;

create policy "Service role full access on admin_users"
  on public.admin_users for all
  using (auth.role() = 'service_role');

create index if not exists admin_users_email_idx  on public.admin_users (email);
create index if not exists admin_users_active_idx on public.admin_users (role) where disabled_at is null;

-- ── 2. Lead assignment ─────────────────────────────────────────────────
alter table public.leads
  add column if not exists assigned_to uuid references public.admin_users(id) on delete set null,
  add column if not exists assigned_at timestamptz;

create index if not exists leads_assigned_idx
  on public.leads (assigned_to) where assigned_to is not null;
