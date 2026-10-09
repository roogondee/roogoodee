-- leads.utm_term / utm_content exist in production (added outside the repo)
-- but no migration created them; the website ref-code lead insert
-- (src/lib/growth/ref-visits.ts) writes both, so a fresh database would
-- reject it. Additive and idempotent.
alter table public.leads
  add column if not exists utm_term    text,
  add column if not exists utm_content text;
