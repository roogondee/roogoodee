# W Medical systems — how they connect

> **สรุปภาษาไทย** — W Medical มี 4 ระบบ: roogondee.com (การตลาด/ลีด/ทีมขาย), เว็บโรงพยาบาล,
> ระบบห้องยา และ cert.roogondee.com (ใบรับรองแพทย์) สามตัวหลังใช้ฐานข้อมูล Supabase `wmedical`
> ร่วมกันอยู่แล้ว แต่ roogondee.com อยู่คนละฐาน จึงไม่เคยรู้ว่า (1) มีคนจองผ่านเว็บโรงพยาบาล
> และ (2) ลีดจากโฆษณามาที่โรงพยาบาลจริงหรือยัง ตอนนี้เชื่อมกันด้วย webhook ที่ลงลายเซ็น:
> ลีดใหม่จากเว็บโรงพยาบาลเข้าการ์ดทีมขาย และ "มาตามนัด/จ่ายยาแล้ว" จะ stamp ลีดเป็น visited
> อัตโนมัติ → รายงาน ROI, Meta CAPI และ Google Ads offline conversion ได้ข้อมูล "คนไข้มาจริง"
> โดยไม่ต้องให้ใครกด redeem เอง ระบบโรงพยาบาล/ห้องยาส่งแค่ **sha256 ของเบอร์** — roogondee
> จับคู่ได้เฉพาะคนที่เป็นลีดของตัวเอง คนไข้อื่นไม่ถูกเก็บอะไรเลย วิธีเปิดใช้ดูหัวข้อ "Setup"
> อีกทางหนึ่ง: หน้าลงทะเบียนผู้ป่วย DMGLP มีปุ่ม "ค้นหา HN จากระบบห้องยา" — ส่งเบอร์ไปถามระบบห้องยา
> ได้ HN + ชื่อกลับมาให้เจ้าหน้าที่เลือก (อ่านอย่างเดียว เก็บแค่ HN เมื่อกดบันทึก) ดูหัวข้อ "HN lookup"

## The four systems

| System | Repo | URL | Stack | Database |
|---|---|---|---|---|
| Marketing site, leads, sales pipeline, ROI | `roogondee/roogoodee` (this repo) | roogondee.com | Next.js 14 on Vercel (`sin1`) | Supabase **roogondee's Project** `fbxyrynslijhmvfcrulz` (ap-southeast-1) |
| Hospital website (booking, triage, MOU queue, LIFF app) | `roogondee/wmedicalhospital` | — | Next.js 16 on Vercel | Supabase **wmedical** `sfymqfcnhatynhtfsfil` (ap-southeast-2) |
| Pharmacy (HN, prescriptions, stock, LINE CRM) | `roogondee/wmedical-pharmacy` | — | Express + Prisma on Railway, React on Vercel | Supabase **wmedical** (Prisma tables `"Patient"`, `"Prescription"`, …) |
| Certificate verification | `roogondee/medicalcertificate` (deploys from `main`) | cert.roogondee.com | static HTML, browser → Supabase | Supabase **wmedical** (`certificates`, `cert_seal`, …) |

What already connected before the bridge:

- The three wmedical systems share one database. The hospital's `/admin/bookings` shows
  pharmacy HNs via `find_patients_by_phone` (hospital migration `0006_operations.sql`).
- cert.roogondee.com links to `roogondee.com/medical-certificate` (`utm_source=cert_verify`),
  and roogondee.com links back via `CERT_VERIFY_URL` (`src/lib/certs/verify-site.ts`).

What did not: nothing crossed between the two Supabase projects. A person who booked on the
hospital site never reached the sales pipeline, and a lead who actually came to W Medical was
only counted when staff remembered to redeem a voucher or drag the card to "visited".

## The bridge

```
hospital site ──lead.created (name, phone)──────────┐
hospital site ──visit.completed (phone hash)────────┤  POST roogondee.com/api/integrations/wmedical
pharmacy      ──visit.completed (phone hash)────────┘  x-wmh-signature: sha256=HMAC(body)
                                                         │
                                  ┌──────────────────────┴───────────────────────┐
                           lead.created                                   visit.completed
                  open lead with that phone?                    open lead with that phone hash?
                   yes → timeline note (+ status booked)          yes → markLeadVisited() + status visited
                   no  → new lead (source wmh-*)                  no  → nothing stored

The other direction, DMGLP staff screens only (see "HN lookup" below):

DMGLP patient form ──phones (1–5)──────────▶ pharmacy POST /api/integrations/v1/patients/lookup
 (roogondee, server action)  ◀──hn, original_hn, name── x-api-key (permission patients:lookup)
```

Code: `src/lib/integrations/wmedical.ts` (pure contract, tested by `npm test`),
`src/app/api/integrations/wmedical/route.ts` (DB side). Senders: hospital `lib/crm.ts`
(`pushLeadToCrm`, `pushVisitToCrm`, called from the booking forms and `app/admin/actions.ts`),
pharmacy `backend/src/lib/roogondee.ts` (called after `POST /api/prescriptions/:id/dispense`).
HN lookup: `src/lib/integrations/pharmacy.ts` (client + response parser, tested by `npm test`),
called by `lookupPharmacyHn` in `src/app/dmglp/staff/actions.ts`.

### Transport

- `POST /api/integrations/wmedical`, JSON body ≤ 16 KB.
- Header `x-wmh-signature: sha256=<hex HMAC-SHA256 of the raw body>` — the format the hospital
  site already used for its CRM webhook.
- One shared secret: `WMEDICAL_WEBHOOK_SECRET` here = `CRM_WEBHOOK_SECRET` on the hospital =
  `ROOGONDEE_WEBHOOK_SECRET` on the pharmacy. Unset here → the endpoint answers 503 and accepts
  nothing.
- Responses: 200 `{ok:true, …}` (also for duplicates and for event names this side doesn't know
  yet), 400 bad payload, 401 bad signature, 413 too large, 500 processing failed (the dedup
  claim is released, so a retry can go through). Senders time out after 5 s and never retry;
  a failure is logged on the sender and never blocks the booking or the dispense.
- Idempotency: each event with an id is claimed in `processed_webhook_events`
  (`wmedical:<event>:<system>:<type>:<id>`) before processing.

### `lead.created` (hospital)

```json
{
  "event": "lead.created",
  "created_at": "2026-10-08T03:00:00.000Z",
  "source": "Facebook",
  "type": "booking",
  "id": "1b9d6bcd-…",
  "name": "…", "phone": "0812345678", "lang": "th",
  "service": "teleconsult", "company": null,
  "attribution": { "utm_source": "facebook", "utm_campaign": "…", "fbclid": "…", "gclid": "…" },
  "marketing_consent": false
}
```

`type` ∈ `booking | group_booking | follow_up | subscriber`. Unknown fields (anything health
related included) are dropped by `parseEvent`.

- **Same phone already has an open lead** (unvisited, not customer, created in the last 90 days):
  no new card. A timeline note is added (`lead_activities`, actor `system:wmedical`); a
  `booking` moves the lead to `booked` from new/contacted/qualified/lost and tells the sales
  LINE group not to chase it again. This is the common case for a quiz/advice lead who then
  books on the hospital site.
- **Otherwise** a new lead: `source` `wmh-booking | wmh-group-booking | wmh-follow-up |
  wmh-subscriber`, `service` `foreign` for group bookings (MOU worker screening) else `general`,
  `status` `booked` for a booking else `new`, UTM/gclid copied, `fbc` rebuilt from fbclid.
  The sales LINE group is notified (not for newsletter subscribers).
- `consent_pdpa` = the hospital's `marketing_consent` (true only for newsletter sign-ups), so a
  hospital booking is never reported to Meta.

### `visit.completed` (hospital, pharmacy)

```json
{
  "event": "visit.completed",
  "created_at": "2026-10-08T03:00:00.000Z",
  "system": "pharmacy",
  "type": "dispense",
  "id": "<prescription id>",
  "phone_sha256": ["9cb4de460569edf9c77c8f5dafda425b7b47d287ffc4c19015d172f623bc93f5"]
}
```

Sent when hospital staff set a booking or group booking to `completed`, and after every
successful pharmacy dispense. The receiver picks the **most recent open lead** whose
`leads.phone_sha256` is in the list (created ≤ 90 days ago — Google's offline-conversion click
window — unvisited, not customer/converted), then:

1. `markLeadVisited()` — stamps `visited_at` once; Meta CAPI `Purchase` (consent and pillar
   rules in `src/lib/growth/config.ts` still apply); Google picks it up through
   `/api/ads/offline-conversions`; `/admin/growth` counts it. It also feeds the post-visit
   loops (review request, referral, recall) exactly as a redeemed voucher does.
2. Status → `visited` from new/contacted/qualified/booked/lost.
3. A `visit` entry on the lead's timeline.

No match → nothing is written, and the response doesn't say whether there was a match.

### Phone normalisation and the test vector

All three systems: digits only, `66` + 8–9 digits → `0` + rest, then valid only if
`^0[0-9]{8,9}$`; hash = lowercase hex sha256 of that string. On this side the hash is a
generated column (`leads.phone_sha256`, migration `add_phone_sha256_to_leads.sql`, function
`public.th_phone_sha256`), so every insert path gets it and a PDPA erasure of `phone` erases
the hash too. The pharmacy splits free-text `Patient.phone` on `, ; / |` and newlines and
sends up to 3 hashes.

Test vector, asserted in all three repos' tests and by the migration:
`"+66 81-234-5678"` → `9cb4de460569edf9c77c8f5dafda425b7b47d287ffc4c19015d172f623bc93f5`.
Change the rule in one place and visits silently stop matching — change it everywhere.

### HN lookup (roogondee → pharmacy, DMGLP staff only)

The HN field on the DMGLP register form and edit card has **ค้นหา HN จากระบบห้องยา**: the phone
on the form goes server to server to `POST {PHARMACY_API_URL}/api/integrations/v1/patients/lookup`
(`x-api-key: {PHARMACY_API_KEY}`, permission `patients:lookup`; body `{"phones": [...]}`, 1–5
numbers normalised as above). The answer is up to 10 rows of `hn` (the pharmacy's id),
`original_hn` (the HIS HN when the record was imported from HIS, else null), `name` and `phone`;
malformed rows are dropped. Staff pick one and the input gets `original_hn`, else `hn` — stored
only when they submit the form, and only the HN. 401/403 → `unauthorized`, 429 →
`rate_limited`, 5xx/network/5 s timeout → `unavailable`, anything else (redirects are not
followed, so the key never travels on) → `bad_response`; the form stays usable either way.
Allowed for DMGLP `patients.write` (admin, nurse, doctor); each lookup is a `lookup` row in
`dmglp_audit_log` with counts only. Env unset → no request, the button says "not connected".

## Red lines — MUST NOT be relaxed

1. **Visit events carry only hashes** — never a name, HN, phone, drug, diagnosis or service.
   roogondee may learn about a visit only for a person who is already its lead.
2. **No match → nothing stored.** A visit event must never create a lead.
3. **No health data in `lead.created`** — the hospital already strips symptoms; `parseEvent`
   drops unknown fields anyway.
4. **Hospital leads without marketing consent never reach an ad platform** (`consent_pdpa`
   false). The growth-loop pillar lists (`std`/`mind`/`dna`) keep applying to stamped visits.
5. **Unsigned events are rejected**, and the endpoint is off while the secret is unset.
6. **The HN lookup stays staff-only and read-only.** Phone in, HN + name out, server to server
   with the pharmacy key; only the HN is ever stored (the name is shown for picking, never
   saved); logs and the audit row hold counts and status codes only — never a phone, name or HN.

## Setup (in this order)

1. **roogondee Supabase** (`fbxyrynslijhmvfcrulz`): run
   `supabase/migrations/add_phone_sha256_to_leads.sql`. Without it every event fails with 500.
2. Generate one secret:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. **roogondee Vercel**: `WMEDICAL_WEBHOOK_SECRET=<secret>`, redeploy.
4. **Hospital Vercel**: `CRM_WEBHOOK_URL=https://roogondee.com/api/integrations/wmedical`,
   `CRM_WEBHOOK_SECRET=<secret>`, redeploy.
5. **Pharmacy Railway**: `ROOGONDEE_WEBHOOK_URL=https://roogondee.com/api/integrations/wmedical`,
   `ROOGONDEE_WEBHOOK_SECRET=<secret>`, redeploy.
6. Smoke test (expects `{"ok":true}`; the test id is consumed, use a new one each run):

   ```bash
   BODY='{"event":"visit.completed","system":"hospital","type":"booking","id":"smoke-1","phone_sha256":["9cb4de460569edf9c77c8f5dafda425b7b47d287ffc4c19015d172f623bc93f5"]}'
   SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WMEDICAL_WEBHOOK_SECRET" | sed 's/^.* //')
   curl -sS -X POST https://roogondee.com/api/integrations/wmedical \
     -H 'content-type: application/json' -H "x-wmh-signature: sha256=$SIG" -d "$BODY"
   ```

   Vercel logs show `[wmedical] visit.completed hospital:booking → no_match` (or
   `visit_recorded` if a test lead has that number).
7. **DMGLP HN lookup** (independent of steps 1–6): a pharmacy admin creates an API key with
   permission `patients:lookup` in the pharmacy app's API-key settings; on roogondee Vercel set
   `PHARMACY_API_URL=https://wmedical-pharmacy-production.up.railway.app` and
   `PHARMACY_API_KEY=<key>`, redeploy. Check: on `/dmglp/staff/patients`, a phone the pharmacy
   knows lists that patient; failures log `[pharmacy] HN lookup failed: HTTP <status> → <reason>`.

## Still not connected — next candidates

- **Two certificate registries.** roogondee has its own (`medical_certificates`, QR →
  `roogondee.com/verify/cert/<token>`), while the certificates staff actually issue live in
  the wmedical project behind cert.roogondee.com (HN + token). Pick one before printing more QR
  codes; the marketing copy already points at cert.roogondee.com.
- **DMGLP HN lookup — connected 2026-10-08** (see "HN lookup" above): staff pick the HN from the
  pharmacy by phone instead of retyping it. The pharmacy now enforces API keys on
  `/api/integrations/v1/*` (per-key permission; missing, revoked or expired keys refused), so
  this machine caller needs no staff JWT. HIS itself is still not reachable: a patient the
  pharmacy doesn't know still gets the HN typed by hand.
- **Region split.** roogondee runs in `sin1` next to its Supabase in Singapore; the wmedical
  project is in Sydney (ap-southeast-2). Fine for the webhook (one call per event) and the HN
  lookup (one call per staff click), worth knowing before anything here starts reading wmedical
  data per page load.
- The hospital site's tables are still empty, so until it goes live the pharmacy dispense is the
  only automatic visit signal.
