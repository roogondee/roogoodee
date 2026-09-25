# DMGLP — W Medical Diabetes & Metabolic Care (GLP-1) program

Lives at **roogondee.com/dmglp**. Built from the owner's spec (CLAUDE.md of
the "W Medical Diabetes & Metabolic Care System"), adapted to this repo:
same Next.js app, same Supabase project, same admin login.

| Surface | URL | Who |
|---|---|---|
| Ad landing (public) | `/dmglp` | patients / ad clicks |
| Patient LIFF | `/dmglp/liff?page=appointments\|survey\|program` | patients, inside LINE |
| Staff system | `/dmglp/staff/...` | hospital staff (admin login + program role) |
| Google Ads offline feed | `/api/dmglp/conversions-export` | Ads scheduled upload |
| Controlled-drug CSV | `/api/dmglp/pharmacy-export` | pharmacist |
| Daily cron | `/api/cron/dmglp-daily` (09:00 BKK) | Vercel |

## Hard boundaries (from the spec — never relax)

1. **No online drug sales.** No cart, checkout, or ordering anywhere.
2. **The system never recommends a dose.** `src/lib/dmglp/titration.ts` only
   raises flags (`DOSE_INCREASE_TOO_EARLY`, `SKIPPED_STEP`, `LONG_GAP`) on the
   dose the doctor chose; the doctor must tick "รับทราบคำเตือน" to save it.
3. **No drug brand names, strengths or drug prices on `/dmglp`** (public) —
   the landing copy names only the drug *class* once, in a FAQ. Brand names
   and prices exist only in staff screens and 1:1 LINE by staff.
4. **Health data never reaches an ad platform.** The Ads feed is exactly five
   columns (gclid, name, time, value, currency) — `tests/dmglp/conversions.test.mts`.
   Client events `dmglp_line_click` / `dmglp_call_click` carry no health data.
5. **LINE messages to patients are neutral** — `src/lib/dmglp/reminders-text.ts`
   has a forbidden-word list (drug names, mg, HbA1c, เบาหวาน, ...) and a test.
6. **Not an EMR.** Patients link to HIS by `hn`; `dmglp_patients` holds only
   what the program needs.

## Setup

1. Apply `supabase/migrations/create_dmglp_program.sql` **before deploying**
   (adds `admin_users.dmglp_role`, 28 `dmglp_*` tables, seed prices/tiers/rules).
   `supabase/seed/dmglp_sample_patients.sql` is dev-only.
2. Assign program roles: a site **manager** opens `/dmglp/staff/settings/staff`
   and sets each admin user's role (แพทย์ / เภสัชกร / พยาบาล / แอดมิน /
   การเงิน / การตลาด / ผู้จัดการ / ผู้ตรวจสอบ) plus **license number** for
   doctors and pharmacists — dispensing is blocked without both.
3. Env (all optional, degrade gracefully):
   - `NEXT_PUBLIC_LIFF_DMGLP_ID` — LIFF app whose endpoint is
     `https://roogondee.com/dmglp/liff` (LINE Login channel, size Tall). Without
     it, reminders go out without a link and surveys are skipped.
   - `LINE_LOGIN_CHANNEL_ID` — already used by the quiz; verifies the id_token.
   - `LINE_CHANNEL_ACCESS_TOKEN` — pushes reminders (already set).
   - `LINE_NOTIFY_GROUP_ID` — high-severity alerts + DMGLP LINE leads.
   - `ADS_OFFLINE_EXPORT_USER/PASSWORD` — Basic auth for the Ads scheduled upload.
   - `CRON_SECRET` — cron auth (already set).
4. Google Ads: create three "Import → Clicks" conversion actions named
   `DMGLP LINE Contact`, `DMGLP Booked`, `DMGLP Treatment Started` and point a
   scheduled HTTPS upload at `/api/dmglp/conversions-export`. Landing Final URL:
   `https://roogondee.com/dmglp` (gclid auto-tagging on).
5. Partners: create at `/dmglp/staff/partners`; their link is
   `roogondee.com/dmglp?ref=<REF_CODE>`.

## Roles (§3)

Permission matrix: `src/lib/dmglp/roles.ts` (`MATRIX`). Highlights:
admin sees leads/booking/registration/tasks but no clinical data; nurse
screens and enters vitals/labs; doctor confirms indication, decides doses,
prescribes; pharmacist dispenses, ledger, fridge, alerts; finance sells
programs, payments, refunds, partner statements; marketing sees attribution
and aggregated dashboards only; manager read-only; auditor reads the audit
log. Every clinical read/write goes to `dmglp_audit_log`.

## Patient journey in the staff UI

1. **Lead** arrives (LINE with `DM-xxxx`, walk-in, phone) → `/dmglp/staff/leads`.
2. **Register** patient (HN, PDPA consent required) → `/dmglp/staff/patients`.
3. **Screen** (nurse/doctor) → eligibility `eligible | needs_review | ineligible`
   from `dmglp_eligibility_rules` (BMI ≥ 30, ≥ 27 + comorbidity, or T2DM;
   pregnancy/MTC/MEN2 block; cautions warn).
4. **Enroll** (doctor): drug + ICD-10 + start date → 9 appointments
   (D0, D3, D7, W4, W8, W12, W16, W20, W24) generated automatically.
5. **Visit**: check-in from `/dmglp/staff/today` → vitals, side effects,
   labs, checklist → doctor's dose decision (flags shown) → prescription
   (qty 1) → close visit (consumes program entitlements).
6. **Dispense** (pharmacist): FEFO pen pick, counseling checklist; blocked
   without prescription, doctor licence, HN, confirmed indication, eligibility,
   pen in stock and not expired. First dispense = `treatment_started`.
7. **Follow-up**: cron sends D-1 reminders and D-2 survey links; D3/D7 are
   pharmacist LINE follow-ups (one tap on the today screen); red-flag survey
   answers create a high alert + LINE group ping; no-show → `missed`, after
   7 days → `call_no_show` task (exactly one per appointment).
8. **Programs** (finance): BASIC/PLUS/PREMIUM, upfront or 0% × 6, 8-month
   validity; refund = paid − Σ(list price × used), floored at 0.

## Tests

`npm test` runs `node --test tests/**/*.test.mts` (Node ≥ 22.18, no build):
schedule generation, titration flags, eligibility, refund/instalments,
Ads CSV shape, ref-code parsing, LINE text forbidden words.

## Open items to confirm with the hospital

- Real lab/CGM/TANITA/dietitian prices (rows marked `*` in `/dmglp/staff/settings/prices`)
- Specialist doctor fee contract
- Thai package-insert indications for current lots (adjust `/dmglp/staff/settings/rules`)
- Partner fee basis after legal review (`shared_care_fee`)
- LINE OA message quota for reminders
- HIS integration (manual HN entry today)
- Track & Trace CSV column list (`src/app/api/dmglp/pharmacy-export/route.ts` `HEADER`)
