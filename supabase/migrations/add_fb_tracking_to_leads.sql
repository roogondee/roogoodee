-- Capture Facebook ad click + browser identifiers on lead submission so we
-- can (a) attribute Meta ad spend down to specific leads in Supabase, and
-- (b) ship the same identifiers to the Conversions API (CAPI) for better
-- Event Match Quality.

alter table leads
  add column if not exists fbclid text,
  add column if not exists fbp    text,
  add column if not exists fbc    text;

create index if not exists idx_leads_fbclid on leads(fbclid) where fbclid is not null;
