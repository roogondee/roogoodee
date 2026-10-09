-- Phone hash on leads, so a visit reported by the W Medical systems can be
-- linked to a lead without those systems ever sending a patient's number.
--
-- The hospital website and the pharmacy system (Supabase project "wmedical")
-- POST visit.completed to /api/integrations/wmedical carrying only
-- sha256(normalised phone). This column is the other half of that match:
-- a lead we already have is found by its hash; a patient who was never our
-- lead matches nothing, and roogondee learns nothing about them.
-- Contract and the matching JS: src/lib/integrations/wmedical.ts,
-- docs/system-integration.md.
--
-- Normalisation is the same rule as public.normalize_th_phone in the
-- wmedical project (hospital migration 0006_operations.sql): digits only,
-- "+66 81-234-5678" → "0812345678". Anything that is not then a Thai number
-- (0 + 8 or 9 digits) — e.g. the platform user ids bot leads keep in
-- `phone` — gets no hash.

create or replace function public.normalize_th_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d ~ '^66[0-9]{8,9}$' then '0' || substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s
$$;

create or replace function public.th_phone_sha256(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when n ~ '^0[0-9]{8,9}$' then encode(sha256(convert_to(n, 'UTF8')), 'hex')
  end
  from (select public.normalize_th_phone(p) as n) s
$$;

-- Generated, so every insert path (quiz, LIFF, bots, forms, admin) gets it
-- without a code change, and a PDPA erasure that blanks `phone` blanks the
-- hash with it.
alter table public.leads
  add column if not exists phone_sha256 text
  generated always as (public.th_phone_sha256(phone)) stored;

create index if not exists leads_phone_sha256_idx
  on public.leads (phone_sha256, created_at desc)
  where phone_sha256 is not null;

-- Left executable by every role on purpose: the generated column calls
-- th_phone_sha256 with the privileges of whoever inserts the row, and both
-- functions are pure (no table access).
