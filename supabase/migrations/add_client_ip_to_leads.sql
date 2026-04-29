-- Add client_ip column for IP-based fraud rate limiting on /api/quiz.
-- Stored to enforce a soft per-IP daily cap (~10 vouchers / IP / day) so a
-- bot can't exhaust the monthly service quota (50 / service / month).
--
-- IP is also a personal identifier under PDPA — keep the same retention as
-- other PII columns (purged by data-retention cron after the configured
-- TTL window). Index is created BTREE on (client_ip, created_at) since
-- the rate-limit query filters on both.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_ip text;

CREATE INDEX IF NOT EXISTS leads_client_ip_created_at_idx
  ON public.leads (client_ip, created_at DESC)
  WHERE client_ip IS NOT NULL;

COMMENT ON COLUMN public.leads.client_ip
  IS 'X-Forwarded-For first hop captured at quiz submission. Used by the per-IP rate limiter in /api/quiz/route.ts. Subject to PDPA retention.';
