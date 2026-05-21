-- Mind pillar — provider directory for /mind/team
-- Populated by admin when Phase 2 onboarding completes (see
-- docs/mind-recruiting.md). The /mind/team page renders only rows
-- where active=true, so this table can be staged ahead of launch.

create table if not exists public.mind_providers (
  id              uuid primary key default gen_random_uuid(),
  -- Display fields (public)
  name            text not null,
  title           text,                       -- "นักจิตวิทยาคลินิก" / "จิตแพทย์ที่ปรึกษา"
  photo_url       text,                       -- Supabase Storage public URL
  bio             text,                       -- 2-3 sentence Thai bio
  specialties     text[] default '{}',        -- ["mood","anxiety","relationship","grief","lgbtq","trauma"]
  languages       text[] default '{}',        -- ["th","en"]
  display_order   int default 100,            -- ascending; lower shows first
  active          boolean default false,      -- gate before going public
  -- Operational fields (private — RLS hides from public)
  license_number  text,                       -- ใบอนุญาตประกอบวิชาชีพจิตวิทยาคลินิก / แพทยสภา
  email           text,
  phone           text,
  rate_per_session_thb int,                   -- compensation tracking
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists mind_providers_active_idx
  on public.mind_providers (active, display_order asc)
  where active = true;

-- RLS — public reads only active rows + only display-safe columns
-- (license/email/phone/rate are hidden via column-level policy
-- enforced by the API layer reading only `select id, name, title,
-- photo_url, bio, specialties, languages, display_order from
-- mind_providers where active = true`).
alter table public.mind_providers enable row level security;

create policy "public_read_active_mind_providers"
  on public.mind_providers
  for select
  using (active = true);

create policy "service_role_full_mind_providers"
  on public.mind_providers
  for all
  using (auth.role() = 'service_role');

-- updated_at auto-bump
create or replace function public.tg_mind_providers_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists mind_providers_updated_at on public.mind_providers;
create trigger mind_providers_updated_at
  before update on public.mind_providers
  for each row execute function public.tg_mind_providers_updated_at();
