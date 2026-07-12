-- Online Medical Certificate system (ใบรับรองแพทย์ออนไลน์ตรวจสอบได้)
-- Staff issue certs (dashboard form or CSV batch import), each cert gets a
-- printable PDF with a QR that resolves /verify/cert/<public_token> showing
-- the FULL certificate (photo, patient info, exam, lab, visit history) —
-- single-token full disclosure is the clinic owner's explicit choice; the
-- token is ~244-bit unguessable and every public view is access-logged.
-- Also run: create private storage bucket `cert-files` in the dashboard.

-- ── 1. patients: support passport holders (foreign-worker Work Permit) ──
alter table public.patients
  add column if not exists id_type text not null default 'thai_id'
    check (id_type in ('thai_id','passport','other')),
  add column if not exists nationality text;   -- ISO-ish: 'TH','MM','KH','LA',...

-- ── 2. medical_certificates ─────────────────────────────────────────────
create table if not exists public.medical_certificates (
  id                uuid primary key default gen_random_uuid(),
  cert_no           text unique,              -- 'WMC-2569-000123', assigned at issue
  cert_type         text not null check (cert_type in
                      ('general','annual_checkup','risk_based','work_permit')),
  patient_id        uuid not null references public.patients(id) on delete restrict,
  visit_date        date not null,
  photo_path        text,                     -- private storage path (cert-files)
  -- Frozen copy of patient identity at issue time: a certificate is a legal
  -- document; later edits to `patients` must not change what was certified.
  -- { name, dob, gender, nationality, id_type, id_last4, employer_name, work_permit_no }
  patient_snapshot  jsonb,
  exam              jsonb not null default '{}'::jsonb,
                    -- { weight_kg, height_cm, bmi, bp_sys, bp_dia, pulse, doctor_opinion }
  disease_items     jsonb,                    -- CertDiseaseItem[]: 5-disease (แพทยสภา)
                                              -- or 9-item work-permit checklist
  lab_analytes      jsonb not null default '[]'::jsonb,  -- LabAnalyte[] (same shape as lab_reports)
  lab_report_id     uuid references public.lab_reports(id) on delete set null,
  summary           text,                     -- ความเห็นแพทย์ / สรุปผล
  fit_status        text check (fit_status is null or fit_status in
                      ('normal','fit','fit_with_condition','unfit')),
  valid_until       date,                     -- work-permit certs: visit_date + 60 days
  status            text not null default 'draft'
                    check (status in ('draft','issued','revoked')),
  public_token      text unique,              -- QR verify token, assigned at issue
  doctor_name       text,
  doctor_license    text,                     -- เลขที่ใบอนุญาตประกอบวิชาชีพเวชกรรม
  issued_by         uuid references public.admin_users(id) on delete set null,
  issued_at         timestamptz,
  revoked_by        uuid references public.admin_users(id) on delete set null,
  revoked_at        timestamptz,
  revoke_reason     text,
  import_batch_id   uuid,                     -- FK added below (batches table follows)
  created_by        uuid references public.admin_users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.medical_certificates enable row level security;

do $$ begin
  create policy "Service role full access on medical_certificates"
    on public.medical_certificates for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create index if not exists medical_certificates_patient_visit_idx
  on public.medical_certificates (patient_id, visit_date desc);
create index if not exists medical_certificates_status_idx
  on public.medical_certificates (status, created_at desc);
create index if not exists medical_certificates_token_idx
  on public.medical_certificates (public_token);
create index if not exists medical_certificates_cert_no_idx
  on public.medical_certificates (cert_no);
create index if not exists medical_certificates_batch_idx
  on public.medical_certificates (import_batch_id);

-- ── 3. Running cert number, race-safe under concurrent bulk issue ───────
create table if not exists public.certificate_counters (
  year_be  int primary key,          -- Buddhist-era year, e.g. 2569
  last_no  int not null default 0
);

alter table public.certificate_counters enable row level security;

do $$ begin
  create policy "Service role full access on certificate_counters"
    on public.certificate_counters for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create or replace function public.next_cert_no(p_year int)
returns int language sql as $$
  insert into public.certificate_counters (year_be, last_no) values (p_year, 1)
  on conflict (year_be) do update set last_no = certificate_counters.last_no + 1
  returning last_no;
$$;

-- ── 4. certificate_import_batches (CSV group checkups) ──────────────────
create table if not exists public.certificate_import_batches (
  id             uuid primary key default gen_random_uuid(),
  filename       text,
  cert_type      text,
  row_count      int not null default 0,
  success_count  int not null default 0,
  error_count    int not null default 0,
  errors         jsonb,                 -- [{ row, field, message_th }]
  defaults       jsonb,                 -- batch-level: { visit_date, doctor_name, doctor_license, employer_name }
  status         text not null default 'committed'
                 check (status in ('committed','failed')),
  created_by     uuid references public.admin_users(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.certificate_import_batches enable row level security;

do $$ begin
  create policy "Service role full access on certificate_import_batches"
    on public.certificate_import_batches for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.medical_certificates
    add constraint medical_certificates_import_batch_fk
    foreign key (import_batch_id) references public.certificate_import_batches(id)
    on delete set null;
exception when duplicate_object then null; end $$;

-- ── 5. certificate_access_log (PDPA ม.39 records + abuse/rate limiting) ─
-- The public verify page discloses full PII by owner's choice; every view is
-- recorded so leaked tokens are detectable and processing is accountable.
create table if not exists public.certificate_access_log (
  id              bigint generated always as identity primary key,
  certificate_id  uuid not null references public.medical_certificates(id) on delete cascade,
  ip              text,
  user_agent      text,
  viewed_at       timestamptz not null default now()
);

alter table public.certificate_access_log enable row level security;

do $$ begin
  create policy "Service role full access on certificate_access_log"
    on public.certificate_access_log for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create index if not exists certificate_access_log_cert_idx
  on public.certificate_access_log (certificate_id, viewed_at desc);
create index if not exists certificate_access_log_ip_idx
  on public.certificate_access_log (ip, viewed_at desc);
