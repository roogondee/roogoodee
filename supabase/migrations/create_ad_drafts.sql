-- ad_drafts: AI-generated FB ad drafts จาก scripts/gen_ads.py
-- รันเป็น cron, ทีม ads รีวิว status='approved' ก่อน publish เป็น campaign จริง
create table if not exists public.ad_drafts (
  id            uuid primary key default gen_random_uuid(),
  service       text not null check (service in ('glp1', 'std', 'ckd', 'foreign')),
  angle         text not null,
  primary_text  text not null,
  headline      text not null,
  description   text,
  cta_button    text,
  image_url     text,
  landing_url   text not null,
  audience      text,
  status        text not null default 'draft'
                  check (status in ('draft', 'approved', 'rejected', 'live', 'paused', 'archived')),
  lint_pass     boolean not null default false,
  meta_campaign_id text,
  meta_ad_id    text,
  generated_at  timestamptz not null default now(),
  approved_at   timestamptz,
  approved_by   text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_ad_drafts_status on public.ad_drafts(status);
create index if not exists idx_ad_drafts_service_angle on public.ad_drafts(service, angle);
create index if not exists idx_ad_drafts_generated_at on public.ad_drafts(generated_at desc);

-- View: latest drafts ที่ยังไม่ได้รีวิว
create or replace view public.ad_drafts_pending as
select * from public.ad_drafts
where status = 'draft'
order by generated_at desc;
