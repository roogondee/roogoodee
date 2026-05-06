-- Track Facebook Story daily posts (separate from feed posts)
-- ใช้โดย scripts/fb_story.py — log การโพสต์สตอรี่รายวัน เพื่อกันโพสต์ซ้ำในวันเดียวกัน
-- และเก็บ caption/image ไว้ดู analytics ภายหลัง

create table if not exists public.fb_stories (
  id            uuid primary key default gen_random_uuid(),
  posted_date   date not null,
  service       text not null,
  story_type    text,
  fb_photo_id   text,
  fb_story_id   text,
  headline      text,
  subline       text,
  caption       text,
  image_url     text,
  link_url      text,
  posted_at     timestamptz default now(),
  status        text default 'posted'
);

create index if not exists fb_stories_posted_date_idx
  on public.fb_stories (posted_date desc);

create index if not exists fb_stories_service_idx
  on public.fb_stories (service);

-- ป้องกันการโพสต์ stories ซ้ำในวันเดียวกัน (1 service ต่อวัน)
create unique index if not exists fb_stories_uniq_day_service
  on public.fb_stories (posted_date, service)
  where status = 'posted';
