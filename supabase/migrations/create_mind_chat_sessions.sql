-- Mind pillar — AI intake chat (Phase 3 — see docs/mind-ai-intake-spec.md)
-- Pre-session conversation with Claude Sonnet that produces a structured
-- intake summary the human provider reads before their session. NOT a
-- therapy session — guardrails enforced in src/lib/mind/safety.ts.

create table if not exists public.mind_chat_sessions (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.leads(id) on delete cascade,
  voucher_code    text,                                 -- RGD-MND-XXXXXX
  started_at      timestamptz default now(),
  ended_at        timestamptz,
  message_count   int default 0,
  summary         jsonb,                                -- structured intake note (see spec §1)
  crisis_flags    text[] default '{}',                  -- ['self_harm','substance','violence']
  provider_viewed_at timestamptz,
  purge_at        timestamptz default (now() + interval '90 days')
);

create index if not exists mind_chat_sessions_voucher_idx
  on public.mind_chat_sessions (voucher_code);
create index if not exists mind_chat_sessions_lead_idx
  on public.mind_chat_sessions (lead_id);
create index if not exists mind_chat_sessions_purge_idx
  on public.mind_chat_sessions (purge_at)
  where ended_at is not null;

create table if not exists public.mind_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.mind_chat_sessions(id) on delete cascade,
  role        text check (role in ('user','assistant','system')),
  content     text not null,
  safety_flag text,                                     -- 'crisis_self' | 'crisis_substance' | 'violence' | null
  created_at  timestamptz default now()
);

create index if not exists mind_chat_messages_session_idx
  on public.mind_chat_messages (session_id, created_at asc);

-- RLS — only service role touches these tables. The session lookup by
-- voucher_code is the only "public" surface, and that goes through the
-- API route which uses supabaseAdmin.
alter table public.mind_chat_sessions enable row level security;
alter table public.mind_chat_messages enable row level security;

create policy "service_role_full_mind_chat_sessions"
  on public.mind_chat_sessions for all using (auth.role() = 'service_role');

create policy "service_role_full_mind_chat_messages"
  on public.mind_chat_messages for all using (auth.role() = 'service_role');
