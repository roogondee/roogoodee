-- Per-conversation pause for the LINE bot's AI auto-reply. Two triggers:
--   'burmese'     — customer texted in Burmese script; the AI prompt isn't
--                   tuned for it, so we hand off to staff instead of guessing.
--   'staff_reply' — a staff member marked the conversation as manually
--                   answered (admin panel), so the bot should stay quiet.
-- Reply linkage (voucher-code lookup) is unaffected — this only silences the
-- AI fallback in src/app/api/line-webhook/route.ts.
create table if not exists public.line_bot_pauses (
  line_user_id  text primary key,
  reason        text not null check (reason in ('burmese', 'staff_reply')),
  paused_until  timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.line_bot_pauses enable row level security;

create policy "Service role full access"
  on public.line_bot_pauses for all
  using (true)
  with check (true);

create index if not exists line_bot_pauses_paused_until_idx
  on public.line_bot_pauses (paused_until);
