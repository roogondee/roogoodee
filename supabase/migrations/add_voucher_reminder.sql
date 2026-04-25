-- Voucher reminder tracking — support pre-expiry nudge at day 7/13 (spec §5, §10)
alter table public.vouchers
  add column if not exists reminded_at timestamptz;

create index if not exists vouchers_reminder_idx
  on public.vouchers (expires_at, reminded_at, redeemed_at);
