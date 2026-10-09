-- Website ref codes + HR LINE alerts. Additive only; safe to re-run.
-- See src/lib/refcodes.ts and src/lib/growth/ref-visits.ts.

-- ── 1. site_ref_codes ────────────────────────────────────────────────────
-- One row per landing visit on /medical-certificate (MC-xxxxx) and /clinic
-- (CL-xxxxx). Holds the ad click ids so a visit recorded days later — by
-- staff typing the code at the counter, into the certificate admin on
-- cert.roogondee.com or the /admin/redeem screen — can be reported back to
-- Google Ads and Meta. No personal data at mint time; ip/user agent are
-- only kept once the visitor has accepted the PDPA/cookie banner.
create table if not exists public.site_ref_codes (
  id               uuid primary key default gen_random_uuid(),
  ref_code         text unique not null,
  program          text not null check (program in ('medcert', 'clinic')),
  gclid            text,
  fbc              text,
  fbp              text,
  utm              jsonb,
  cookie_consent   boolean not null default false,
  client_ip        text,
  user_agent       text,
  landing_path     text,
  -- Set when the visitor sends the code over LINE (a lead is created then).
  lead_id          uuid references public.leads(id) on delete set null,
  line_contact_at  timestamptz,
  -- Set once, by whichever path records the visit first.
  visited_at       timestamptz,
  visit_source     text check (visit_source in ('cert', 'redeem')),
  created_at       timestamptz not null default now()
);
create index if not exists site_ref_codes_gclid_idx on public.site_ref_codes (gclid) where gclid is not null;
create index if not exists site_ref_codes_visited_idx on public.site_ref_codes (visited_at) where visited_at is not null;

alter table public.site_ref_codes enable row level security;
do $$ begin
  create policy "Service role full access on site_ref_codes"
    on public.site_ref_codes for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

-- ── 2. employer_accounts: HR LINE alerts ─────────────────────────────────
-- HR opens their portal, taps "รับแจ้งเตือนทาง LINE", and the pre-filled
-- message carries this code; the webhook stores their LINE user id. The
-- renewal cron then pushes a count-only reminder to them directly, on the
-- same weekly cadence (renewal_notified_at) as the sales-group alert.
alter table public.employer_accounts
  add column if not exists line_link_code  text unique,
  add column if not exists line_user_id    text,
  add column if not exists line_linked_at  timestamptz;
