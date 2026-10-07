# Growth loops — setup & operating guide

Six systems that start from the same moment: **a patient actually came to W Medical**
(a voucher redeemed at `/admin/redeem`, or a lead moved to `visited`/`customer` in the
pipeline). Before this, that moment only changed `leads.status`; no ad platform, dashboard
or follow-up ever saw it.

| # | System | Where | Runs |
|---|---|---|---|
| 1 | Visit conversions → Meta CAPI + Google Ads | `src/lib/growth/visit.ts`, `/api/ads/offline-conversions` | on redeem / status change; Ads pulls daily |
| 2 | ROI dashboard (cost per patient who came) | `/admin/growth`, `scripts/sync_ad_spend.py` | page on demand; Meta spend nightly 01:30 |
| 3 | Post-visit review request | `src/lib/growth/review.ts` | cron 10:00 BKK, day after redeem |
| 4 | Patient referral link | `src/lib/growth/referral.ts`, `/r/<code>` | offered after a 4–5 star rating |
| 5 | Employer (HR) portal | `/admin/employers`, `/hr` | on demand; renewal alerts in the 10:00 cron |
| 6 | Recall ("time for your follow-up") | `src/lib/growth/post-visit.ts` | cron 10:00 BKK |

## Before merging — required

1. **Run `supabase/migrations/create_growth_loops.sql`.** The quiz routes now write
   `leads.fbc/fbp/user_agent`; without the columns every quiz submission fails.
   Apply the migration first, then merge.
2. Nothing else is required to deploy safely. Everything below is switched on by
   setting an env var or doing a one-time setup, and stays off until then.

## Env vars

| Var | Where | Needed for | If unset |
|---|---|---|---|
| `ADS_OFFLINE_EXPORT_USER` / `ADS_OFFLINE_EXPORT_PASSWORD` | Vercel | Google Ads scheduled upload auth | feed only downloadable by a logged-in admin |
| `ADS_OFFLINE_LEAD_CONVERSION` | Vercel | name of the quiz-voucher conversion action | `RGD Quiz Voucher` |
| `ADS_OFFLINE_VISIT_CONVERSION` | Vercel | name of the visit conversion action | `RGD Patient Visit` |
| `META_ADS_ACCESS_TOKEN` (`ads_read`) + `META_AD_ACCOUNT_ID` | GitHub Secrets | nightly Meta spend sync | sync skipped — type spend by hand |
| `GOOGLE_REVIEW_URL` | Vercel | link in the review reply | review reply thanks but has no link |
| `REFERRAL_REWARD_TEXT` | Vercel | what the referrer is promised | no reward mentioned (recommended until agreed with W Medical) |

Meta CAPI needs nothing new — it reuses `NEXT_PUBLIC_META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN`.

## 1. Visit conversions

**Meta** — `markLeadVisited()` sends a `Purchase` event (value 500 THB, `action_source:
physical_store`, `event_id = visit-<leadId>`) the first time a lead is stamped visited.
Matching uses phone/email when real, plus the `fbc`/`fbp`/IP/UA now stored on the lead —
LIFF leads have no phone, so those stored click ids are the only thing that ties the visit
back to the ad. `mind` and `dna` are never sent; `std`/`mens`/`women` are sent as a generic
"Clinic Visit" with no pillar name (`src/lib/growth/config.ts`).

Once a few weeks of `Purchase` events are flowing, switch the `RGD_*` ad sets from
`CompleteRegistration` to `Purchase` optimisation.

**Google Ads** — create two conversion actions: *Goals → Conversions → New → Import →
CRM, files, and other data sources → Track conversions from clicks*, named exactly as the
env vars above. Then *Uploads → Schedules → + → HTTPS*:

```
URL:      https://roogondee.com/api/ads/offline-conversions
Username: <ADS_OFFLINE_EXPORT_USER>
Password: <ADS_OFFLINE_EXPORT_PASSWORD>
Frequency: daily
```

The feed carries only gclid + conversion name + time + value — no names or phones.
Re-sending old rows is fine; Google drops duplicates. gclid now survives the quiz gate →
LIFF hop (`QuizGateActions` passthrough → `leads.gclid`), so pillar quiz ads report
conversions for the first time.

## 2. ROI dashboard — `/admin/growth`

Per service, for 7/30/90 days: ad spend, leads, leads from ads, vouchers, visits, visit
rate, cost per lead, **cost per patient who came**. Plus source breakdown, review,
referral and recall counts.

- Meta spend syncs nightly (`.github/workflows/sync_ad_spend.yml`). The service is read
  from the campaign name — **every campaign name must contain its code**: `GLP1`, `CKD`,
  `STD`, `MENS`, `WOMEN`, `MIND`, `DNA`, `FRN`/`MOU`/`WORKPERMIT`, `ADVICE`. The job log
  lists campaigns it could not map.
- Google/TikTok/LINE spend: type it in on the same page (daily, or one row per week).

## 3. Review request

Day 1–7 after a `glp1`/`ckd` voucher is redeemed, the patient's own LINE gets one message
with 1–5 star quick-reply buttons. A tap is answered even outside `LINE_BOT_ACTIVE_HOURS`
(it is a reply to our own button), but never when `LINE_BOT_ENABLED=false`.

- 4–5 stars → thanks + Google review link + referral link
- 1–3 stars → apology + sales LINE group pinged to call back + the same Google link

**The Google link goes to every rating.** Sending it only to happy patients is review
gating, which Google's review policy prohibits. Do not change this.

Get `GOOGLE_REVIEW_URL` from W Medical's Google Business Profile → *Ask for reviews*.

## 4. Referral

A 4–5 star patient gets `https://roogondee.com/r/RGD-REF-XXXXXX` plus a "share in LINE"
button. The link opens the same pillar quiz tagged `utm_source=referral`,
`utm_campaign=<code>`. The friend gets the standing free-screening offer (same monthly
quota) — nothing new is promised.

**PDPA:** the referrer is never told that their friend visited — that would disclose a
third party's health visit. Results show only on `/admin/growth`. If W Medical agrees a
referrer reward, set `REFERRAL_REWARD_TEXT` to something staff can honour *without*
checking whether a friend came (e.g. a discount on the patient's own next visit).

## 5. Employer (HR) portal

1. `/admin/employers` (manager) → add the company, and list the **employer names exactly
   as typed on its certificates** (click the suggestions under the box).
2. Copy the link shown once (`/hr/k/<token>`) and send it to the company's HR.
3. HR sees every worker's latest certificate: fit status, "valid for submission until",
   next annual checkup date, a link to the full certificate, and a CSV export.

The link swaps its token for an httpOnly cookie and redirects to `/hr`, so the token never
appears in a page URL that analytics records. Every view/export is logged
(`employer_portal_access_log`). "Issue new link" kills the old one immediately; "disable
access" blocks it.

The 10:00 cron pings the sales group (at most weekly per company) when workers are due
within 30 days — the cue to call HR and book the next group checkup.

## 6. Recall

A 1:1 LINE message when a redeemed voucher reaches its re-check date: `glp1` 90 days,
`ckd` 180, `mens` 180, `women` 365. It says the visit is paid and invites the patient to
type "นัดตรวจ"; the sales group gets a daily count so staff expect the replies. Only
vouchers that became due in the last 14 days are messaged, so the first run doesn't blast
everyone ever redeemed. `std`, `mind` and `dna` never get recalls.

## Privacy lists

`src/lib/growth/config.ts` holds which pillars each loop may touch. Those lists are
privacy decisions — widening one needs the same sign-off as relaxing a red line in
CLAUDE.md.
