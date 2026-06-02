-- Patient portal: let a patient view their OWN lab results after verifying via
-- LINE Login + a one-time claim code issued by staff.
-- patients.line_id (already exists) stores the verified LINE userId once claimed.

-- ── claim codes: staff-issued, single-use, short-lived ──────────────────
create table if not exists public.patient_claim_codes (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  code        text not null unique,        -- short human-readable, e.g. 8 chars
  issued_by   uuid references public.admin_users(id) on delete set null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by_line text,                        -- LINE userId that redeemed it
  created_at  timestamptz not null default now()
);

alter table public.patient_claim_codes enable row level security;
do $$ begin
  create policy "Service role full access on patient_claim_codes"
    on public.patient_claim_codes for all using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create index if not exists claim_codes_code_idx    on public.patient_claim_codes (code);
create index if not exists claim_codes_patient_idx on public.patient_claim_codes (patient_id);

-- Fast reverse lookup: which patient owns a given verified LINE id.
create index if not exists patients_line_id_idx on public.patients (line_id);
