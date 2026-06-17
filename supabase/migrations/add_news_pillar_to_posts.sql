-- Tag daily news items with the pillar they cover (glp1|std|ckd|foreign|mens|women|mind).
-- Used by scripts/gen_news.py (pillar rotation) and the /news page (badge + filter).
-- Nullable: only news posts (service='news') set it; blog posts leave it null.
alter table public.posts
  add column if not exists news_pillar text;

create index if not exists posts_news_pillar_idx
  on public.posts (news_pillar);
