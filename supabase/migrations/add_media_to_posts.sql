-- Add media support to posts: featured video URL (direct mp4/webm, YouTube, or Vimeo)
alter table public.posts
  add column if not exists video_url text;
