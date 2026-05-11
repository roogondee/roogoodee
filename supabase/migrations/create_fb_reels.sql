-- Track Facebook Reel daily posts (separate from photo Stories และ feed posts)
-- ใช้โดย scripts/fb_reel.py — log การโพสต์ Reel รายวัน เพื่อกันโพสต์ซ้ำ
-- และเก็บ prompt/video/caption ไว้ดู analytics + cost tracking ภายหลัง

create table if not exists public.fb_reels (
  id              uuid primary key default gen_random_uuid(),
  posted_date     date not null,
  service         text not null,
  reel_type       text,
  fb_video_id     text,
  fb_post_id      text,
  headline        text,
  caption         text,
  visual_prompt   text,
  video_url       text,
  duration_sec    int,
  provider        text default 'seedance-1.5-pro',
  cost_usd        numeric(10, 4),
  posted_at       timestamptz default now(),
  status          text default 'posted'
);

create index if not exists fb_reels_posted_date_idx
  on public.fb_reels (posted_date desc);

create index if not exists fb_reels_service_idx
  on public.fb_reels (service);

-- กันโพสต์ Reel ซ้ำใน service เดียวกันต่อวัน
create unique index if not exists fb_reels_uniq_day_service
  on public.fb_reels (posted_date, service)
  where status = 'posted';
