-- Ad attribution columns on leads — needed so:
-- 1. We can fire FB Conversion API with the original click ID (fbclid/_fbp) for
--    accurate iOS-17-resistant attribution. Without these, Meta optimizer
--    over-counts clicks that don't convert and burns budget.
-- 2. Admin can break down ROAS by ad_id/adset_id/campaign_id/utm_term/content,
--    not just utm_source/medium/campaign.
-- All columns are nullable so existing pre-ad organic leads stay valid.

alter table public.leads
  add column if not exists fbclid       text,
  add column if not exists fbp          text,
  add column if not exists utm_term     text,
  add column if not exists utm_content  text,
  add column if not exists ad_id        text,
  add column if not exists adset_id     text,
  add column if not exists campaign_id  text,
  add column if not exists referral_ref text;        -- m.me/page?ref=… payload from Click-to-Messenger ads

create index if not exists leads_fbclid_idx     on public.leads (fbclid);
create index if not exists leads_campaign_id_idx on public.leads (campaign_id);
create index if not exists leads_ad_id_idx      on public.leads (ad_id);
