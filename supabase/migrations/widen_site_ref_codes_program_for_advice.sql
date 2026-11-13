-- /advice now mints website ref codes too (AD-xxxxx): its LINE button
-- pre-fills the visitor's symptom plus the code, so the message creates a
-- lead carrying the ad click ids. See src/lib/refcodes.ts.
-- Apply BEFORE deploying — /api/ref inserts program = 'advice'.
alter table public.site_ref_codes drop constraint if exists site_ref_codes_program_check;
alter table public.site_ref_codes
  add constraint site_ref_codes_program_check check (program in ('medcert', 'clinic', 'advice'));
