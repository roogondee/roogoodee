-- reCAPTCHA is now advisory instead of blocking: submissions with a missing
-- or failed token are accepted and flagged here so the team can screen them.
alter table public.leads
  add column if not exists recaptcha_ok boolean,
  add column if not exists recaptcha_reason text;
