-- Track LINE OA broadcast publishing on posts (mirrors fb_posted_at columns).
-- Used by scripts/line_broadcast.py so we never broadcast the same post twice.
alter table public.posts
  add column if not exists line_broadcast_at  timestamptz,
  add column if not exists line_broadcast_id  text;

create index if not exists posts_line_broadcast_at_idx
  on public.posts (line_broadcast_at);
