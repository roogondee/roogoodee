-- W Medical Diabetes & Metabolic Care (GLP-1) program — roogondee.com/dmglp
--
-- Internal system for the hospital's injectable-GLP-1 program: lead → first
-- visit → 6-month program → maintenance, plus controlled-drug ledger, program
-- billing, LINE follow-up and dashboards. Since 15 ก.ย. 2569 injectable GLP-1
-- drugs are ยาควบคุมพิเศษ (MOPH announcement No. 58), so every dispense needs a
-- physician prescription, pharmacist dispensing, a documented indication and
-- a pen-level ledger. See docs/dmglp-program.md and "DMGLP program" in
-- CLAUDE.md.
--
-- Every table is prefixed dmglp_ because the site already has `leads`,
-- `patients` (lab interpretation), `alerts`-like tables and `partners`-like
-- concepts with different shapes. Staff are the existing admin_users rows
-- (custom session cookie, see src/lib/auth.ts), given a program role via the
-- new admin_users.dmglp_role column — the app enforces §3 of the spec in
-- src/lib/dmglp/roles.ts; the service-role RLS policies below match the rest
-- of this repo (server code only ever talks to Postgres with the secret key).

-- ── 0. staff roles ──────────────────────────────────────────────────────
alter table public.admin_users
  add column if not exists dmglp_role    text
    check (dmglp_role is null or dmglp_role in
      ('admin','nurse','doctor','pharmacist','finance','marketing','manager','auditor')),
  add column if not exists license_no    text,      -- doctors / pharmacists
  add column if not exists is_specialist boolean not null default false;

-- ── 1. partners ─────────────────────────────────────────────────────────
create table if not exists public.dmglp_partners (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  type             text not null check (type in ('clinic','agent','factory')),
  ref_code         text unique not null,
  shared_care_fee  numeric(10,2),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ── 2. attribution (landing page → ref code → LINE) ─────────────────────
create table if not exists public.dmglp_attribution (
  id              uuid primary key default gen_random_uuid(),
  ref_code        text unique not null,            -- DM-4821
  gclid           text,
  utm             jsonb,
  channel         text,                            -- google, facebook, partner, factory, walkin, direct
  partner_id      uuid references public.dmglp_partners(id) on delete set null,
  cookie_consent  boolean not null default false,
  landing_path    text,
  created_at      timestamptz not null default now()
);
create index if not exists dmglp_attribution_gclid_idx on public.dmglp_attribution (gclid) where gclid is not null;

-- ── 3. leads ────────────────────────────────────────────────────────────
create table if not exists public.dmglp_leads (
  id              uuid primary key default gen_random_uuid(),
  line_user_id    text,
  display_name    text,
  phone           text,
  attribution_id  uuid references public.dmglp_attribution(id) on delete set null,
  status          text not null default 'new'
                  check (status in ('new','contacted','booked','converted','lost')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists dmglp_leads_line_idx   on public.dmglp_leads (line_user_id) where line_user_id is not null;
create index if not exists dmglp_leads_status_idx on public.dmglp_leads (status);

-- ── 4. patients ─────────────────────────────────────────────────────────
-- Not an EMR: linked to the hospital HIS by HN, holds only what the program needs.
create table if not exists public.dmglp_patients (
  id            uuid primary key default gen_random_uuid(),
  hn            text unique,
  first_name    text not null,
  last_name     text not null,
  sex           text check (sex is null or sex in ('M','F')),
  birth_date    date,
  phone         text,
  line_user_id  text unique,
  lead_id       uuid references public.dmglp_leads(id) on delete set null,
  partner_id    uuid references public.dmglp_partners(id) on delete set null,
  created_by    uuid references public.admin_users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists dmglp_patients_name_idx on public.dmglp_patients (last_name, first_name);
create index if not exists dmglp_patients_phone_idx on public.dmglp_patients (phone) where phone is not null;

create table if not exists public.dmglp_consents (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.dmglp_patients(id) on delete cascade,
  kind        text not null check (kind in ('pdpa','treatment','program_terms')),
  version     text not null,
  signed_at   timestamptz not null default now(),
  recorded_by uuid references public.admin_users(id) on delete set null
);
create index if not exists dmglp_consents_patient_idx on public.dmglp_consents (patient_id);

-- ── 5. screening / eligibility ──────────────────────────────────────────
create table if not exists public.dmglp_screenings (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid not null references public.dmglp_patients(id) on delete cascade,
  weight_kg             numeric(5,1),
  height_cm             numeric(5,1),
  waist_cm              numeric(5,1),
  bmi                   numeric(4,1) generated always as
                          (case when height_cm > 0 then round(weight_kg / ((height_cm/100)^2), 1) end) stored,
  has_t2dm              boolean not null default false,
  comorbidities         text[] not null default '{}',   -- ht, dyslipidemia, t2dm, ...
  pregnant_or_planning  boolean not null default false,
  breastfeeding         boolean not null default false,
  mtc_men2_history      boolean not null default false,
  pancreatitis_history  boolean not null default false,
  gallbladder_history   boolean not null default false,
  gastroparesis         boolean not null default false,
  on_insulin            boolean not null default false,
  on_sulfonylurea       boolean not null default false,
  retinopathy           boolean not null default false,
  eligibility_status    text not null check (eligibility_status in ('eligible','ineligible','needs_review')),
  flags                 text[] not null default '{}',
  note                  text,
  created_by            uuid references public.admin_users(id) on delete set null,
  created_at            timestamptz not null default now()
);
create index if not exists dmglp_screenings_patient_idx on public.dmglp_screenings (patient_id, created_at desc);

-- Editable rule thresholds (§4.1) — pharmacist/doctor maintain these from
-- /dmglp/staff/settings/rules; the code reads them, never hard-codes them.
create table if not exists public.dmglp_eligibility_rules (
  key         text primary key,
  value       numeric not null,
  label_th    text not null,
  updated_by  uuid references public.admin_users(id) on delete set null,
  updated_at  timestamptz not null default now()
);
insert into public.dmglp_eligibility_rules (key, value, label_th) values
  ('obesity_bmi',              30,  'BMI ขั้นต่ำ (ไม่มีโรคร่วม)'),
  ('overweight_bmi',           27,  'BMI ขั้นต่ำ (มีโรคร่วม ≥ 1)'),
  ('min_days_per_step',        28,  'จำนวนวันขั้นต่ำต่อขนาดยา ก่อนปรับขึ้น'),
  ('long_gap_days',            14,  'จ่ายยาช้ากว่ากำหนดเกิน (วัน) → พิจารณา re-titration'),
  ('no_show_call_after_days',  7,   'ไม่มาตามนัดเกิน (วัน) → สร้างงานโทรตาม')
on conflict (key) do nothing;

-- ── 6. enrollment + care schedule ───────────────────────────────────────
create table if not exists public.dmglp_enrollments (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.dmglp_patients(id) on delete cascade,
  screening_id      uuid references public.dmglp_screenings(id) on delete set null,
  drug              text not null check (drug in ('mounjaro','wegovy')),
  indication_icd10  text not null,
  indication_note   text,
  confirmed_by      uuid not null references public.admin_users(id),   -- doctor
  start_date        date not null,
  phase             text not null default 'initiation'
                    check (phase in ('initiation','maintenance','stopped','maintenance_program')),
  stop_reason       text,
  stopped_at        timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists dmglp_enrollments_patient_idx on public.dmglp_enrollments (patient_id);

create table if not exists public.dmglp_appointments (
  id                uuid primary key default gen_random_uuid(),
  enrollment_id     uuid references public.dmglp_enrollments(id) on delete cascade,
  patient_id        uuid not null references public.dmglp_patients(id) on delete cascade,
  template_code     text,                       -- D0, D3, W4 ... M1, Q3 ...
  type              text not null check (type in ('specialist_visit','followup_visit','line_followup','lab_only')),
  drug_linked       boolean not null default true,
  scheduled_date    date not null,
  status            text not null default 'scheduled'
                    check (status in ('scheduled','checked_in','completed','missed','rescheduled','cancelled')),
  lab_panel         text check (lab_panel is null or lab_panel in ('baseline','q3m','q6m','yearly')),
  reminder_sent_at  timestamptz,
  survey_sent_at    timestamptz,
  missed_at         timestamptz,
  no_show_task_id   uuid,
  note              text,
  created_at        timestamptz not null default now()
);
create index if not exists dmglp_appointments_date_idx    on public.dmglp_appointments (scheduled_date, status);
create index if not exists dmglp_appointments_patient_idx on public.dmglp_appointments (patient_id, scheduled_date);

-- ── 7. visits, labs ─────────────────────────────────────────────────────
create table if not exists public.dmglp_visits (
  id                  uuid primary key default gen_random_uuid(),
  appointment_id      uuid references public.dmglp_appointments(id) on delete set null,
  patient_id          uuid not null references public.dmglp_patients(id) on delete cascade,
  enrollment_id       uuid references public.dmglp_enrollments(id) on delete set null,
  visit_date          date not null default current_date,
  weight_kg           numeric(5,1),
  bp_sys              int,
  bp_dia              int,
  pulse               int,
  gi_side_effects     jsonb,                     -- {nausea, vomiting, constipation, diarrhea, ...}
  hypoglycemia_events int,
  injection_adherence text check (injection_adherence is null or injection_adherence in ('all','missed_1','missed_2plus')),
  checklist           jsonb,                     -- per-visit doctor checklist answers
  dose_decision       text check (dose_decision is null or dose_decision in ('start','keep','increase','decrease','hold','stop')),
  dose_mg             numeric(4,2),
  decided_by          uuid references public.admin_users(id) on delete set null,
  flags               text[] not null default '{}',
  note                text,
  created_by          uuid references public.admin_users(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists dmglp_visits_patient_idx on public.dmglp_visits (patient_id, visit_date desc);

create table if not exists public.dmglp_labs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.dmglp_patients(id) on delete cascade,
  visit_id      uuid references public.dmglp_visits(id) on delete set null,
  test_code     text not null,                   -- HBA1C, FBS, LDL, CR, EGFR, AST, ALT, UACR, UPT ...
  value         numeric,
  unit          text,
  collected_at  date not null,
  entered_by    uuid references public.admin_users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists dmglp_labs_patient_idx on public.dmglp_labs (patient_id, test_code, collected_at);

-- ── 8. prices, programs, billing ────────────────────────────────────────
create table if not exists public.dmglp_price_items (
  code        text primary key,
  name_th     text not null,
  category    text not null check (category in ('drug','service','lab','package')),
  price       numeric(10,2) not null,
  placeholder boolean not null default false,    -- true = finance still has to confirm
  active      boolean not null default true,
  updated_by  uuid references public.admin_users(id) on delete set null,
  updated_at  timestamptz not null default now()
);
insert into public.dmglp_price_items (code, name_th, category, price, placeholder) values
  ('MJ-2.5',     'Mounjaro 2.5 mg (1 ปากกา)',   'drug',    12000, false),
  ('MJ-5',       'Mounjaro 5 mg (1 ปากกา)',     'drug',    14000, false),
  ('MJ-7.5',     'Mounjaro 7.5 mg (1 ปากกา)',   'drug',    18000, false),
  ('MJ-10',      'Mounjaro 10 mg (1 ปากกา)',    'drug',    21000, false),
  ('WG-0.25',    'Wegovy 0.25 mg (1 ปากกา)',  'drug',    10900, false),
  ('WG-0.5',     'Wegovy 0.5 mg (1 ปากกา)',   'drug',    11900, false),
  ('WG-1',       'Wegovy 1 mg (1 ปากกา)',     'drug',    12900, false),
  ('WG-1.7',     'Wegovy 1.7 mg (1 ปากกา)',   'drug',    15900, false),
  ('WG-2.4',     'Wegovy 2.4 mg (1 ปากกา)',   'drug',    18900, false),
  ('SVC-OPD',    'ค่าบริการโรงพยาบาล (ทุกครั้ง)',   'service', 250,   false),
  ('SVC-SPEC',   'ค่าแพทย์เฉพาะทาง',                 'service', 800,   false),
  ('SVC-FU',     'ติดตามผลโดยแพทย์ทั่วไป/เภสัชกร',   'service', 400,   false),
  ('LAB-BASE',   'ตรวจแล็บพื้นฐานก่อนเริ่ม',          'lab',     1500,  true),
  ('LAB-Q3M',    'HbA1c + FBS',                       'lab',     450,   true),
  ('LAB-Q6M',    'ตรวจแล็บครบ 6 เดือน',               'lab',     1200,  true),
  ('SVC-TANITA', 'วัดองค์ประกอบร่างกาย',              'service', 200,   true),
  ('SVC-NUTRI',  'ปรึกษานักกำหนดอาหาร',              'service', 600,   true),
  ('SVC-CGM',    'CGM 14 วัน + แปลผล',                'service', 6500,  true),
  ('PKG-BASIC',  'โปรแกรม 6 เดือน BASIC',             'package', 7900,  false),
  ('PKG-PLUS',   'โปรแกรม 6 เดือน PLUS',              'package', 15900, false),
  ('PKG-PREMIUM','โปรแกรม 6 เดือน PREMIUM',           'package', 22900, false)
on conflict (code) do nothing;

-- Tier entitlements (§4.7). Edited by finance; copied onto each program at purchase.
create table if not exists public.dmglp_program_tiers (
  tier              text primary key check (tier in ('BASIC','PLUS','PREMIUM')),
  price_code        text not null references public.dmglp_price_items(code),
  installments      int not null default 6,
  validity_months   int not null default 8,
  renewal_discount  numeric(4,3) not null default 0.10,
  entitlements      jsonb not null,               -- {"SVC-SPEC":3,"SVC-FU":4,...}
  updated_at        timestamptz not null default now()
);
insert into public.dmglp_program_tiers (tier, price_code, entitlements) values
  ('BASIC',   'PKG-BASIC',   '{"SVC-SPEC":3,"SVC-FU":4,"LAB-BASE":1,"LAB-Q3M":1,"LAB-Q6M":1}'),
  ('PLUS',    'PKG-PLUS',    '{"SVC-SPEC":3,"SVC-FU":4,"LAB-BASE":1,"LAB-Q3M":1,"LAB-Q6M":1,"SVC-TANITA":7,"SVC-NUTRI":2,"SVC-CGM":1}'),
  ('PREMIUM', 'PKG-PREMIUM', '{"SVC-SPEC":3,"SVC-FU":4,"LAB-BASE":1,"LAB-Q3M":1,"LAB-Q6M":1,"SVC-TANITA":7,"SVC-NUTRI":4,"SVC-CGM":2}')
on conflict (tier) do nothing;

create table if not exists public.dmglp_programs (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid references public.dmglp_enrollments(id) on delete set null,
  patient_id     uuid not null references public.dmglp_patients(id) on delete cascade,
  tier           text not null check (tier in ('BASIC','PLUS','PREMIUM')),
  price          numeric(10,2) not null,
  amount_paid    numeric(10,2) not null default 0,
  payment_mode   text not null check (payment_mode in ('upfront','installment')),
  purchased_at   date not null,
  expires_at     date not null,
  status         text not null default 'active'
                 check (status in ('active','completed','cancelled','refunded','expired')),
  refund_amount  numeric(10,2),
  refund_note    text,
  created_by     uuid references public.admin_users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists dmglp_programs_patient_idx on public.dmglp_programs (patient_id, status);

create table if not exists public.dmglp_program_entitlements (
  program_id  uuid not null references public.dmglp_programs(id) on delete cascade,
  item_code   text not null references public.dmglp_price_items(code),
  qty         int not null,
  primary key (program_id, item_code)
);

create table if not exists public.dmglp_program_usage (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.dmglp_programs(id) on delete cascade,
  item_code   text not null references public.dmglp_price_items(code),
  qty         int not null default 1,
  visit_id    uuid references public.dmglp_visits(id) on delete set null,
  used_at     timestamptz not null default now(),
  recorded_by uuid references public.admin_users(id) on delete set null
);
create index if not exists dmglp_program_usage_program_idx on public.dmglp_program_usage (program_id);

create table if not exists public.dmglp_installments (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.dmglp_programs(id) on delete cascade,
  seq         int not null,
  amount      numeric(10,2) not null,
  due_date    date not null,
  status      text not null default 'due' check (status in ('due','paid','overdue','cancelled')),
  paid_at     timestamptz,
  unique (program_id, seq)
);
create index if not exists dmglp_installments_due_idx on public.dmglp_installments (due_date, status);

-- ── 9. prescriptions, pens, dispenses, fridge ───────────────────────────
create table if not exists public.dmglp_prescriptions (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid not null references public.dmglp_visits(id) on delete cascade,
  patient_id  uuid not null references public.dmglp_patients(id) on delete cascade,
  sku         text not null references public.dmglp_price_items(code),
  qty         int not null default 1 check (qty = 1),
  directions  text not null,
  doctor_id   uuid not null references public.admin_users(id),
  created_at  timestamptz not null default now()
);
create index if not exists dmglp_prescriptions_patient_idx on public.dmglp_prescriptions (patient_id, created_at desc);

create table if not exists public.dmglp_pens (
  id            uuid primary key default gen_random_uuid(),
  sku           text not null references public.dmglp_price_items(code),
  lot           text not null,
  expiry        date not null,
  received_at   date not null,
  supplier_doc  text,
  fridge        text not null default 'main',   -- which fridge holds it (fridge log → quarantine)
  status        text not null default 'in_stock'
                check (status in ('in_stock','quarantine','dispensed','expired','damaged','returned')),
  status_note   text,
  received_by   uuid references public.admin_users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists dmglp_pens_stock_idx on public.dmglp_pens (sku, status, expiry);

create table if not exists public.dmglp_dispenses (
  id               uuid primary key default gen_random_uuid(),
  prescription_id  uuid unique not null references public.dmglp_prescriptions(id),
  pen_id           uuid unique not null references public.dmglp_pens(id),
  patient_id       uuid not null references public.dmglp_patients(id) on delete cascade,
  pharmacist_id    uuid not null references public.admin_users(id),
  doctor_name      text not null,
  doctor_license   text not null,
  counseling       jsonb,                        -- {teach_back, hypo_education, missed_dose_rule}
  dispensed_at     timestamptz not null default now()
);
create index if not exists dmglp_dispenses_patient_idx on public.dmglp_dispenses (patient_id, dispensed_at desc);

create table if not exists public.dmglp_fridge_logs (
  id           uuid primary key default gen_random_uuid(),
  fridge       text not null,
  temp_c       numeric(4,1) not null,
  in_range     boolean not null,
  recorded_by  uuid references public.admin_users(id) on delete set null,
  recorded_at  timestamptz not null default now()
);

create table if not exists public.dmglp_stock_counts (
  id            uuid primary key default gen_random_uuid(),
  count_month   date not null,                   -- first day of the month
  sku           text not null references public.dmglp_price_items(code),
  system_count  int not null,
  physical_count int not null,
  variance_note text,
  counted_by    uuid references public.admin_users(id) on delete set null,
  counted_at    timestamptz not null default now(),
  unique (count_month, sku)
);

-- ── 10. surveys, alerts, tasks ──────────────────────────────────────────
create table if not exists public.dmglp_surveys (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.dmglp_patients(id) on delete cascade,
  appointment_id  uuid references public.dmglp_appointments(id) on delete set null,
  answers         jsonb not null,
  red_flag        boolean not null default false,
  submitted_at    timestamptz not null default now()
);
create index if not exists dmglp_surveys_patient_idx on public.dmglp_surveys (patient_id, submitted_at desc);

create table if not exists public.dmglp_alerts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references public.dmglp_patients(id) on delete cascade,
  source      text not null check (source in ('survey','fridge','stock','eligibility','titration')),
  severity    text not null check (severity in ('high','normal')),
  message     text not null,
  status      text not null default 'open' check (status in ('open','acknowledged','resolved')),
  handled_by  uuid references public.admin_users(id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists dmglp_alerts_open_idx on public.dmglp_alerts (status, created_at desc);

create table if not exists public.dmglp_tasks (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid references public.dmglp_patients(id) on delete cascade,
  appointment_id uuid references public.dmglp_appointments(id) on delete set null,
  assignee_role  text not null,
  kind           text not null,                  -- call_no_show, line_followup, review_alert, survey_followup
  priority       text not null default 'normal' check (priority in ('high','normal')),
  due_date       date,
  status         text not null default 'open' check (status in ('open','done','cancelled')),
  note           text,
  done_by        uuid references public.admin_users(id) on delete set null,
  done_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists dmglp_tasks_open_idx on public.dmglp_tasks (status, due_date);
-- Exactly one no-show call task per missed appointment (§8).
create unique index if not exists dmglp_tasks_no_show_once_idx
  on public.dmglp_tasks (appointment_id) where kind = 'call_no_show';

-- ── 11. conversions (Google Ads offline import) ─────────────────────────
create table if not exists public.dmglp_conversions (
  id              uuid primary key default gen_random_uuid(),
  attribution_id  uuid not null references public.dmglp_attribution(id) on delete cascade,
  name            text not null check (name in ('line_contact','booked','treatment_started')),
  occurred_at     timestamptz not null,
  exported_at     timestamptz,
  unique (attribution_id, name)
);

-- ── 12. partner services + audit ────────────────────────────────────────
create table if not exists public.dmglp_partner_services (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.dmglp_partners(id) on delete cascade,
  patient_id    uuid not null references public.dmglp_patients(id) on delete cascade,
  dispense_id   uuid references public.dmglp_dispenses(id) on delete set null,
  service_note  text not null,
  performed_at  date not null,
  fee           numeric(10,2),
  recorded_by   uuid references public.admin_users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists dmglp_partner_services_month_idx on public.dmglp_partner_services (partner_id, performed_at);

create table if not exists public.dmglp_audit_log (
  id          bigint generated always as identity primary key,
  staff_id    uuid,
  staff_role  text,
  action      text not null,                     -- read, create, update, export, dispense ...
  table_name  text not null,
  record_id   text,
  details     jsonb,
  at          timestamptz not null default now()
);
create index if not exists dmglp_audit_log_record_idx on public.dmglp_audit_log (table_name, record_id);
create index if not exists dmglp_audit_log_at_idx on public.dmglp_audit_log (at desc);

-- ── RLS: server-only, same posture as every other table in this repo ─────
do $$
declare t text;
begin
  foreach t in array array[
    'dmglp_partners','dmglp_attribution','dmglp_leads','dmglp_patients','dmglp_consents',
    'dmglp_screenings','dmglp_eligibility_rules','dmglp_enrollments','dmglp_appointments',
    'dmglp_visits','dmglp_labs','dmglp_price_items','dmglp_program_tiers','dmglp_programs',
    'dmglp_program_entitlements','dmglp_program_usage','dmglp_installments',
    'dmglp_prescriptions','dmglp_pens','dmglp_dispenses','dmglp_fridge_logs','dmglp_stock_counts',
    'dmglp_surveys','dmglp_alerts','dmglp_tasks','dmglp_conversions','dmglp_partner_services',
    'dmglp_audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format(
        'create policy "Service role full access on %s" on public.%I for all using (auth.role() = ''service_role'')',
        t, t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
