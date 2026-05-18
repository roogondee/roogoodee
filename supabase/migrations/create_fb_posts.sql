-- Track Facebook Feed posts (boost-ready, NOT Stories)
-- ใช้โดย scripts/fb_feed.py — log โพสต์ฟีดรายวันเพื่อกันโพสต์ซ้ำในวันเดียวกัน
-- เก็บ caption + link_url ไว้ดู attribution หลัง boost (fb_post_id linkable
-- กับ Meta Ads Manager → boosted post insights)

create table if not exists public.fb_posts (
  id            uuid primary key default gen_random_uuid(),
  posted_date   date not null,
  service       text not null,
  story_type    text,
  fb_post_id    text,
  headline      text,
  subline       text,
  caption       text,
  image_url     text,
  link_url      text,
  boosted       boolean default false,
  boost_spent   numeric(10, 2),
  boost_leads   integer,
  posted_at     timestamptz default now(),
  status        text default 'posted'
);

create index if not exists fb_posts_posted_date_idx
  on public.fb_posts (posted_date desc);

create index if not exists fb_posts_service_idx
  on public.fb_posts (service);

create index if not exists fb_posts_boosted_idx
  on public.fb_posts (boosted) where boosted = true;

create unique index if not exists fb_posts_uniq_day_service
  on public.fb_posts (posted_date, service)
  where status = 'posted';
