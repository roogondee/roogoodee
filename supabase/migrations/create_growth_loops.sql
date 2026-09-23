-- Growth loops: close the loop from "lead" to "patient actually came", then
-- turn that visit into the next lead. Six systems share this migration because
-- they share the same trigger (a voucher being redeemed / a lead being marked
-- visited) — see "Growth loops" in CLAUDE.md for the full picture.
--
--   1. Visit conversions → Meta CAPI + Google Ads offline import
--   2. ROI dashboard (ad spend per service)
--   3. Post-visit review request (LINE rating → Google review)
--   4. Patient referral codes
--   5. Employer (HR) portal for foreign-worker certificates
--   6. Recall messages (time to re-check)

-- ── 1. leads: click ids + the moment the patient showed up ──────────────
-- fbc/fbp/user_agent are what Meta matches a server event on. LIFF leads
-- carry no phone or email, so without these the visit event sent days later
-- (from the admin redeem screen, not the visitor's browser) cannot be tied
-- back to the ad click at all.
alter table public.leads
  add column if not exists fbc         text,
  add column if not exists fbp         text,
  add column if not exists user_agent  text,
  add column if not exists visited_at  timestamptz;

-- Offline-conversion export + ROI dashboard both scan by this.
create index if not exists leads_visited_at_idx
  on public.leads (visited_at)
  where visited_at is not null;

-- ── 3/6. vouchers: post-visit follow-up bookkeeping ─────────────────────
alter table public.vouchers
  add column if not exists review_requested_at  timestamptz,
  add column if not exists review_rating        smallint
    check (review_rating is null or review_rating between 1 and 5),
  add column if not exists review_rated_at      timestamptz,
  add column if not exists recall_sent_at       timestamptz;

create index if not exists vouchers_redeemed_at_idx
  on public.vouchers (redeemed_at)
  where redeemed_at is not null;

-- ── 4. referral_codes ───────────────────────────────────────────────────
-- One shareable code per happy patient per service. The referee's lead is
-- attributed through utm (utm_source='referral', utm_campaign=<code>) set by
-- /r/<code>, so no extra column on leads is needed.
create table if not exists public.referral_codes (
  code           text primary key,          -- 'RGD-REF-XXXXXX'
  lead_id        uuid not null references public.leads(id) on delete cascade,
  voucher_id     uuid references public.vouchers(id) on delete set null,
  service        text not null,
  line_user_id   text,
  clicks         int not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

do $$ begin
  create policy "Service role full access on referral_codes"
    on public.referral_codes for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create unique index if not exists referral_codes_lead_service_idx
  on public.referral_codes (lead_id, service);

create or replace function public.bump_referral_click(p_code text)
returns void language sql as $$
  update public.referral_codes set clicks = clicks + 1 where code = p_code;
$$;

-- ── 2. ad_spend_daily ───────────────────────────────────────────────────
-- Filled by scripts/sync_ad_spend.py (Meta Insights) and by hand from
-- /admin/growth for platforms without an API hookup (Google, TikTok, LINE).
create table if not exists public.ad_spend_daily (
  id           uuid primary key default gen_random_uuid(),
  spend_date   date not null,
  platform     text not null check (platform in ('meta','google','tiktok','line','other')),
  service      text not null default 'unknown',   -- pillar key, 'advice', or 'unknown'
  campaign     text not null default '',
  spend        numeric(12,2) not null default 0,  -- THB
  impressions  int,
  clicks       int,
  source       text not null default 'manual' check (source in ('manual','meta_api')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.ad_spend_daily enable row level security;

do $$ begin
  create policy "Service role full access on ad_spend_daily"
    on public.ad_spend_daily for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create unique index if not exists ad_spend_daily_uniq_idx
  on public.ad_spend_daily (spend_date, platform, service, campaign);

-- ── 5. employer_accounts (HR portal) ────────────────────────────────────
-- An employer sees the certificates whose frozen patient_snapshot names them
-- as the employer. Access is a secret link: only the sha256 of the token is
-- stored, the raw token is shown to staff once at creation.
create table if not exists public.employer_accounts (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  match_names           text[] not null default '{}',  -- exact patient_snapshot.employer_name values
  token_hash            text unique not null,
  contact_name          text,
  contact_phone         text,
  active                boolean not null default true,
  last_viewed_at        timestamptz,
  renewal_notified_at   timestamptz,
  created_by            uuid references public.admin_users(id) on delete set null,
  created_at            timestamptz not null default now()
);

alter table public.employer_accounts enable row level security;

do $$ begin
  create policy "Service role full access on employer_accounts"
    on public.employer_accounts for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

-- PDPA: every portal view is recorded, same posture as certificate_access_log.
create table if not exists public.employer_portal_access_log (
  id           bigint generated always as identity primary key,
  employer_id  uuid not null references public.employer_accounts(id) on delete cascade,
  action       text not null default 'view' check (action in ('view','export')),
  ip           text,
  user_agent   text,
  viewed_at    timestamptz not null default now()
);

alter table public.employer_portal_access_log enable row level security;

do $$ begin
  create policy "Service role full access on employer_portal_access_log"
    on public.employer_portal_access_log for all
    using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

create index if not exists employer_portal_access_log_employer_idx
  on public.employer_portal_access_log (employer_id, viewed_at desc);

-- Portal + renewal cron look certificates up by employer name.
create index if not exists medical_certificates_employer_idx
  on public.medical_certificates ((patient_snapshot->>'employer_name'))
  where status = 'issued';
