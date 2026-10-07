-- Structured headcount and company on leads.
--
-- WorkPermitLeadForm has always asked how many workers need the checkup, but it
-- flattened the answer — along with company and nationality — into a single
-- Thai sentence in `note`:
--
--   "บริษัท: ABC จำกัด | จำนวนแรงงาน: 21-50 | สัญชาติ: เมียนมา"
--
-- so the one field that separates an employer booking fifty workers from a
-- single walk-in was unqueryable. Nobody could sort the callback queue by deal
-- size, or ask how many 50+ enquiries a campaign produced, without parsing
-- prose out of a text column.
--
-- `note` keeps carrying the same summary: the sales SOP and the LINE group
-- notification both read it, and the team calling the lead should not have to
-- change what they look at.
alter table public.leads
  add column if not exists worker_count text,
  add column if not exists company text;

-- Values are constrained to the form's four bands in the API route rather than
-- by a check constraint, so adding a band later does not need a migration.
-- Partial index: only foreign-worker leads ever set this, and the queries that
-- use it are pipeline sorts and campaign reporting.
create index if not exists leads_worker_count_idx
  on public.leads (worker_count)
  where worker_count is not null;
