-- Google Ads click id on leads.
--
-- The /advice landing takes paid search traffic, so every lead the advice AI
-- captures carries the gclid from the landing URL. That is what lets the team
-- upload offline conversions back into Google Ads once a chat lead actually
-- books, so Smart Bidding learns which symptom keywords produce real patients
-- rather than optimising on raw chat volume.
--
-- utm_source / utm_medium / utm_campaign already exist on leads
-- (added in create_lab_test_system.sql) — only gclid is new.
alter table public.leads
  add column if not exists gclid text;

-- Partial index: only a minority of leads come from paid search, and the only
-- query that touches this column is the offline-conversion export.
create index if not exists leads_gclid_idx
  on public.leads (gclid)
  where gclid is not null;
