-- Patient-facing self-service for lab reports.
--   patient_token        — long random secret; the capability-URL the patient
--                          uses to read their OWN confirmed report at /lab/r/<token>.
--                          Distinct from public_token (authenticity-only, no values).
--   submitted_by_patient — true when the report arrived via the public
--                          /lab/upload form (vs. staff upload in /admin/lab).
--   submit_ip            — X-Forwarded-For first hop at public submission, for
--                          the per-IP rate limiter. PDPA retention applies.
alter table public.lab_reports
  add column if not exists patient_token        text unique,
  add column if not exists submitted_by_patient boolean not null default false,
  add column if not exists submit_ip            text;

create index if not exists lab_reports_patient_token_idx
  on public.lab_reports (patient_token);

-- Pending patient submissions, newest first (admin review queue).
create index if not exists lab_reports_submitted_idx
  on public.lab_reports (submitted_by_patient, status, created_at desc);
