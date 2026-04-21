-- Track Facebook daily caption publishing on posts
-- ใช้โดย scripts/fb_caption.py เพื่อไม่ให้แชร์บทความเดิมซ้ำ
alter table public.posts
  add column if not exists fb_posted_at timestamptz,
  add column if not exists fb_post_id   text,
  add column if not exists fb_caption   text;

create index if not exists posts_fb_posted_at_idx
  on public.posts (fb_posted_at);
