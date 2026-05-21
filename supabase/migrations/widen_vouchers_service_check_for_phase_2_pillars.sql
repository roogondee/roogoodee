-- Widen vouchers.service check constraint to allow Phase 2 pillars
-- (mens, women, mind). Without this, issueVoucher() in /api/quiz/route.ts
-- raises check_violation for any submission to those 3 verticals — the
-- lead row inserts, then the voucher INSERT fails inside the same request,
-- the Supabase JS client throws, and the user sees "เกิดข้อผิดพลาด".
--
-- Found via Phase 3 E2E test pass 2026-05-21. No prod users had hit it
-- yet (the 3 verticals shipped in waitlist / no-quiz-traffic state), so
-- no cleanup of half-issued leads was needed.
--
-- Applied to remote project fbxyrynslijhmvfcrulz on 2026-05-21 via
-- Supabase MCP apply_migration. This file checked in for parity.

ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_service_check;
ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_service_check
  CHECK (service = ANY (ARRAY[
    'glp1'::text, 'ckd'::text, 'std'::text, 'foreign'::text,
    'mens'::text, 'women'::text, 'mind'::text
  ]));
