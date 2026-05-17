-- Track Instagram DM users so we can push voucher/follow-up messages
-- back through the IG Messenger API after a lead is created.
alter table public.leads
  add column if not exists instagram_user_id text,
  add column if not exists instagram_pushed_at timestamptz,
  add column if not exists instagram_push_count int not null default 0;

create index if not exists idx_leads_instagram_user_id on public.leads (instagram_user_id);
