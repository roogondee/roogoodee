# HR portal + renewal alerts — setup & operating guide

The employer (HR) portal from `docs/growth-loops.md` §5, now reading the certificates
W Medical actually issues on **cert.roogondee.com**, plus a LINE alert HR can switch on
for themselves.

Until 2026-10-08 the portal and the renewal cron read only roogondee's own
`medical_certificates` table — which is empty in production, because every real
certificate is issued in the separate cert.roogondee.com system (repo
`roogondee/medicalcertificate`, Supabase project `wmedical`). So the portal showed
nobody and the cron never alerted. This connects the two.

## How the data gets here

```
cert.roogondee.com DB (wmedical)                         roogondee.com (Vercel, sin1)
  certificates ──► bridge_employer_certs(secret, names) ──► src/lib/certs/wmedical.ts
               ──► bridge_employer_names(secret)        ──►   ├─ /hr portal + CSV export
               ──► bridge_ref_visits(secret, since)     ──►   ├─ /admin/employers name suggestions
                                                              ├─ 10:00 cron: renewal alerts
                                                              └─ 10:00 cron: ref-code visits
```

- The three functions live in the medicalcertificate repo, `db/roogondee-bridge.sql`
  (applied to `wmedical` 2026-10-08). They are `SECURITY DEFINER`, callable with the public
  anon key, and refuse to run unless `p_secret` hashes to the value stored in
  `public.bridge_secret` (a table nobody but the owner can read).
- They return fixed columns only: HN, verify token, form type, name, nationality,
  passport/ID number, employer name, exam date, validity days, the fit verdict
  (`summary`), and the confirm/seal timestamps. **No lab values, no X-ray, no photo, no
  address.** Only the forms an employer submits are returned — `alien_worker`,
  `five_disease`, `bilingual`; sick-leave, driving-licence and สณ.11 certificates never
  leave that database. Voided certificates are excluded.
- Employer names are matched case- and whitespace-insensitively (`bridge_norm`), otherwise
  exactly.
- Unset `WMEDICAL_BRIDGE_SECRET` = every call returns nothing. The portal, cron and
  `/admin/employers` keep working on the local table and `/admin/employers` shows an amber
  warning box. A bridge error is logged and treated the same way — it never takes the
  portal down.

## Setup (one time)

1. **Vercel → roogoodee project → Settings → Environment Variables**, add
   `WMEDICAL_BRIDGE_SECRET` (mark *Sensitive*, Production + Preview). The value was handed
   to the owner on 2026-10-08; it is not in any repo. Redeploy.
2. **Apply `supabase/migrations/create_site_ref_codes.sql`** to the roogondee project
   (adds `employer_accounts.line_link_code / line_user_id / line_linked_at`). The portal
   selects those columns — deploy without them and every HR link shows "invalid link".
3. Optional overrides, normally unset: `WMEDICAL_SUPABASE_URL`, `WMEDICAL_SUPABASE_ANON_KEY`.

### Rotating the secret

```sql
-- on wmedical; replace the value, keep the quotes
update public.bridge_secret
   set secret_hash = encode(extensions.digest('<new 64-hex secret>', 'sha256'), 'hex'),
       updated_at  = now()
 where id = 1;
```

Then update `WMEDICAL_BRIDGE_SECRET` in Vercel and redeploy. Generate a new secret with
`openssl rand -hex 32`. Anything shorter than 32 characters is rejected.

## Adding a company

1. `/admin/employers` → *New employer*. Under the name box the suggestions now include
   every employer name typed on cert.roogondee.com, with how many certificates carry it —
   click them so the spelling matches what staff typed in "นายจ้าง/สถานประกอบการ".
   A company typed two ways (e.g. with and without "บริษัท … จำกัด") needs both names.
2. Copy the link shown once (`/hr/k/<token>`) and send it to the company's HR.

## What HR sees

One row per worker (same passport/ID number across years; name only as a fallback):

| Column | Source on cert.roogondee.com |
|---|---|
| Certificate | HN, form (work permit / general) |
| Result | `summary`: healthy → สุขภาพแข็งแรง ไม่พบความผิดปกติ, treat → ทำงานได้โดยมีเงื่อนไข, fail → ไม่เหมาะสมกับการทำงาน (labels from `FIT_STATUS_LABEL`) |
| Valid for submission until | exam date + the certificate's own validity (default 90 days) |
| Next annual checkup | exam date + 365 days, with a due/overdue badge |
| ดูใบรับรอง | the certificate's page on cert.roogondee.com — the same page the QR printed on the paper opens |

That is what the employer already holds on paper; nothing more. Every view and CSV export
is logged (`employer_portal_access_log`).

## LINE alerts for HR

The portal shows a green **เปิดแจ้งเตือนทาง LINE** button. Tapping it opens LINE with a
pre-filled message carrying the company's link code (`รับแจ้งเตือนตรวจสุขภาพพนักงาน
(HR-XXXXXX)`); sending it links that LINE account. The sales group gets a line saying the
company's HR connected.

- The 10:00 cron (`sendEmployerRenewalAlerts`) checks each active company at most once a
  week. When workers are due within 30 days, HR's LINE gets: company name, how many
  workers, how many are already overdue, and "reply here to book a group checkup". **No
  names, no results** — the list stays behind the portal link. The sales group gets the
  same count and whether HR was reached on LINE, so they know to call if not.
- One LINE account per company. Linking again from another phone moves the alerts there.
- HR stops it by typing **ยกเลิกแจ้งเตือน HR** in the chat.
- Link and opt-out messages are answered even outside `LINE_BOT_ACTIVE_HOURS` (they are
  bookkeeping on our own button, like the review stars) but never when
  `LINE_BOT_ENABLED=false`; the push itself is skipped then too.

## Checking it works

- `/admin/employers` without the amber box = the secret is set and the bridge answers.
- `GET /api/cron/post-visit` (with `CRON_SECRET`) returns `employers: { alerted, hrPushed }`
  and `refVisits: { checked, visited, already, unknown }` — `refVisits.skipped` means the
  secret is missing.
- Portal empty for a company that has certificates → the name in *match names* does not
  match the employer name on the certificates. Use the suggestions.
