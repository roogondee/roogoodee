-- Lab Result Interpretation + Year-over-Year Comparison (internal admin tool)
-- Distinct from create_lab_test_system.sql (that one is voucher giveaways).
-- Identity: patients keyed by Thai national ID (hashed + encrypted), name, phone.
-- Lab values stored flexibly as JSONB (FHIR-Observation-shaped) for cross-year compare.

-- ── 1. patients ────────────────────────────────────────────────────────
create table if not exists public.patients (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  national_id_hash  text unique not null,   -- sha256(13-digit id), lookup/dedup
  national_id_enc   jsonb,                   -- encryptJson(raw id), PDPA at-rest
  phone             text,                    -- E.164, reserved for future OTP
  line_id           text,                    -- LINE push user id (CRM phase)
  dob               date,
  gender            text check (gender is null or gender in ('male','female','other')),
  consent_pdpa      boolean default false,
  consent_at        timestamptz,
  created_by        uuid references public.admin_users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.patients enable row level security;

create policy "Service role full access on patients"
  on public.patients for all
  using (auth.role() = 'service_role');

create index if not exists patients_name_idx  on public.patients (name);
create index if not exists patients_phone_idx on public.patients (phone);

-- ── 2. lab_reports ─────────────────────────────────────────────────────
create table if not exists public.lab_reports (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients(id) on delete cascade,
  report_date       date not null,
  lab_name          text,                    -- provenance: which lab issued it
  source_file_path  text,                    -- private storage path (lab-files)
  source_file_type  text,
  raw_extraction    jsonb,                   -- full model JSON before normalization
  analytes          jsonb not null default '[]'::jsonb,  -- LabAnalyte[]
  interpretation    jsonb,                   -- LabInterpretation (th + en)
  upsell            jsonb,                   -- LabUpsell[]
  health_score      int,                     -- 0-100 (deterministic, see score.ts)
  risk_level        text check (risk_level is null or risk_level in ('green','yellow','red')),
  status            text not null default 'pending_review'
                    check (status in ('pending_review','confirmed')),
  public_token      text unique,             -- QR verify (set on confirm)
  reviewer_name     text,                    -- medical sign-off
  reviewer_license  text,
  created_by        uuid references public.admin_users(id) on delete set null,
  confirmed_by      uuid references public.admin_users(id) on delete set null,
  confirmed_at      timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.lab_reports enable row level security;

create policy "Service role full access on lab_reports"
  on public.lab_reports for all
  using (auth.role() = 'service_role');

-- Year-over-year retrieval: all reports for a patient, newest first
create index if not exists lab_reports_patient_date_idx
  on public.lab_reports (patient_id, report_date desc);
create index if not exists lab_reports_status_idx
  on public.lab_reports (status, created_at desc);
create index if not exists lab_reports_token_idx
  on public.lab_reports (public_token);

-- ── 3. Link leads <-> patients (cross-pillar identity, CRM phase) ───────
alter table public.leads
  add column if not exists patient_id uuid references public.patients(id) on delete set null;
create index if not exists leads_patient_idx on public.leads (patient_id);

-- ── 4. Reviewer license on admin_users (medical sign-off) ───────────────
alter table public.admin_users
  add column if not exists license_no    text,
  add column if not exists license_title text;
