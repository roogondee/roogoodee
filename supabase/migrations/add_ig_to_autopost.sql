-- Add Instagram tracking to autopost tables.
-- IG content publishing uses a Meta Business Portfolio System User token
-- (env: IG_SYSTEM_USER_TOKEN) targeting IG_BUSINESS_ACCOUNT_ID.

alter table public.fb_stories
  add column if not exists ig_media_id text,
  add column if not exists ig_status text,
  add column if not exists ig_error text;

alter table public.posts
  add column if not exists ig_posted_at timestamptz,
  add column if not exists ig_post_id text,
  add column if not exists ig_caption text;
