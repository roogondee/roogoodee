-- Chat Sessions table — stores multi-turn agent conversations for the site chat widget
-- Each row is one conversation; messages is the full Anthropic-format message array
-- (roles "user" / "assistant"; assistant turns may include tool_use blocks and the
-- following user turn holds the matching tool_result blocks)
create table if not exists public.chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  messages      jsonb not null default '[]'::jsonb,
  service_hint  text,                          -- std | glp1 | ckd | foreign | general
  lang          text,                          -- detected language code, best-effort
  lead_id       uuid references public.leads(id),
  turn_count    int not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.chat_sessions enable row level security;

-- Server-only: widget talks to /api/chat which uses the service-role client
create policy "Service role full access"
  on public.chat_sessions for all
  using (true)
  with check (true);

create index if not exists chat_sessions_updated_at_idx
  on public.chat_sessions (updated_at desc);
create index if not exists chat_sessions_lead_id_idx
  on public.chat_sessions (lead_id);
