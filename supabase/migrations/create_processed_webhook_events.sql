-- Idempotency for LINE webhook delivery.
-- LINE retries any webhook that doesn't get a 200 OK within 3s, sending the same
-- event payload (same webhookEventId) again. Without dedup, every retry causes
-- duplicate AI replies, duplicate staff notifications, and duplicate lead inserts.
create table if not exists public.processed_webhook_events (
  event_id      text primary key,
  source        text not null,
  processed_at  timestamptz not null default now()
);

alter table public.processed_webhook_events enable row level security;

create policy "Service role full access"
  on public.processed_webhook_events for all
  using (true)
  with check (true);

create index if not exists processed_webhook_events_processed_at_idx
  on public.processed_webhook_events (processed_at desc);
