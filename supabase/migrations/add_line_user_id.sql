-- LINE user ID linkage for direct push-to-user (spec §5.3)
alter table public.leads
  add column if not exists line_user_id text;

create index if not exists leads_line_user_id_idx
  on public.leads (line_user_id) where line_user_id is not null;
