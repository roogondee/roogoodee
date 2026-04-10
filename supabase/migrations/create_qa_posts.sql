-- Q&A Posts table — for /ask page (AI-generated answers indexed by Google)
create table if not exists public.qa_posts (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  service     text default 'general',
  published   boolean default true,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table public.qa_posts enable row level security;

-- Public read policy
create policy "Public can read published Q&A"
  on public.qa_posts for select
  using (published = true);

-- Service role can insert/update (used by API route with supabaseAdmin)
create policy "Service role full access"
  on public.qa_posts for all
  using (true)
  with check (true);
