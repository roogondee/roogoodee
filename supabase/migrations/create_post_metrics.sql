-- post_metrics: รายวันต่อโพสต์ (views, จาก Plausible หรือ GA4)
create table if not exists public.post_metrics (
  post_id   uuid not null references public.posts(id) on delete cascade,
  date      date not null,
  views     integer not null default 0,
  visitors  integer not null default 0,
  source    text not null default 'plausible',
  synced_at timestamptz not null default now(),
  primary key (post_id, date)
);

create index if not exists idx_post_metrics_date on public.post_metrics(date desc);
create index if not exists idx_post_metrics_views on public.post_metrics(views desc);

-- View: รวม view 30 วันล่าสุด ต่อโพสต์ — ไว้ feed กลับให้ gen_content_plan
create or replace view public.post_performance_30d as
select
  p.id            as post_id,
  p.slug,
  p.title,
  p.service,
  p.focus_kw,
  coalesce(sum(m.views), 0)    as views_30d,
  coalesce(sum(m.visitors), 0) as visitors_30d,
  max(m.date)                  as last_seen
from public.posts p
left join public.post_metrics m
  on m.post_id = p.id
 and m.date >= current_date - interval '30 days'
where p.status = 'published'
group by p.id, p.slug, p.title, p.service, p.focus_kw;

alter table public.post_metrics enable row level security;

drop policy if exists "post_metrics_service_role_all" on public.post_metrics;
create policy "post_metrics_service_role_all"
  on public.post_metrics
  for all
  to service_role
  using (true)
  with check (true);
