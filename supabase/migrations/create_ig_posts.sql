-- Track Instagram daily posts (feed + story)
-- ใช้โดย scripts/ig_post.py — กันโพสต์ซ้ำในวันเดียวกัน + เก็บ caption/image
-- รองรับทั้ง IMAGE (feed) และ STORIES (24-hour ephemeral) ใน 1 ตาราง

create table if not exists public.ig_posts (
  id            uuid primary key default gen_random_uuid(),
  posted_date   date not null,
  service       text not null,
  story_type    text,
  media_type    text not null,            -- 'IMAGE' | 'STORIES'
  ig_container_id text,                   -- creation_id from /media endpoint
  ig_media_id   text,                     -- id returned from /media_publish
  ig_permalink  text,                     -- public link (feed only; stories ไม่มี)
  headline      text,
  subline       text,
  caption       text,
  hashtags      text,
  image_url     text,
  link_url      text,
  posted_at     timestamptz default now(),
  status        text default 'posted'
);

create index if not exists ig_posts_posted_date_idx
  on public.ig_posts (posted_date desc);

create index if not exists ig_posts_service_idx
  on public.ig_posts (service);

-- กันโพสต์ซ้ำ: 1 (service, media_type) ต่อวัน
create unique index if not exists ig_posts_uniq_day_service_type
  on public.ig_posts (posted_date, service, media_type)
  where status = 'posted';
