-- Enhancement layer for the medical certificate system: PDPA-gated public
-- search, read-only accounts, name-correction audit trail.
--
-- Apply via Supabase MCP `apply_migration` or the dashboard SQL editor
-- (this repo has no Supabase CLI). Idempotent where practical.

-- 1. Personal verification code (6-digit) frozen onto each certificate at
--    issue time. Printed on the cert/PDF and given to the patient. The public
--    search endpoints require this code before revealing any health data, so a
--    name / cert-number lookup alone never discloses PDPA-protected results.
alter table public.medical_certificates
  add column if not exists verify_code text;

-- 2. Read-only role (e.g. hospital staff / รพ.) that can view the registry and
--    monthly summaries but cannot issue, edit, revoke, import, or correct.
alter table public.admin_users
  drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check
    check (role in ('manager', 'sale', 'viewer'));

-- 3. Audit trail for name corrections on already-issued certificates (typo
--    fixes that must not require revoke + re-issue). Every correction is logged
--    with old/new value, actor, and reason.
create table if not exists public.certificate_corrections (
  id             uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.medical_certificates(id) on delete cascade,
  field          text not null,           -- currently only 'name'
  old_value      text,
  new_value      text,
  reason         text,
  corrected_by   uuid references public.admin_users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists certificate_corrections_cert_idx
  on public.certificate_corrections (certificate_id, created_at desc);
alter table public.certificate_corrections enable row level security;
do $$ begin
  create policy "Service role full access on certificate_corrections"
    on public.certificate_corrections for all
    to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

-- 4. Public-search brute-force guard. Every search attempt (by name or cert
--    number + code) is recorded so we can rate-limit a single IP guessing the
--    6-digit codes. Successful QR/token views keep using certificate_access_log.
create table if not exists public.certificate_verify_attempts (
  id  bigint generated always as identity primary key,
  ip  text,
  ok  boolean not null default false,
  at  timestamptz not null default now()
);
create index if not exists certificate_verify_attempts_ip_idx
  on public.certificate_verify_attempts (ip, at desc);
alter table public.certificate_verify_attempts enable row level security;
do $$ begin
  create policy "Service role full access on certificate_verify_attempts"
    on public.certificate_verify_attempts for all
    to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
