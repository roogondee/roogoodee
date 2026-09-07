# Work Permit renewal (`foreign` pillar) — Google Ads brief

`/foreign/workpermit` is the **first pillar campaign wired into
`ADS_CONVERSIONS`** — see `docs/pillar-google-ads.md`'s prerequisite section,
which this page's launch resolves for the `foreign` pillar specifically
(other pillars still have zero conversions tracked). Audience is **employers
and workers renewing under the 2569 special window** (มติ ครม. 14 กรกฎาคม
2569 — ลาว/เมียนมา/เวียดนาม workers permitted until 11 ธันวาคม 2569 may
renew 1 more year), not general `/foreign` B2B traffic — that stays on
`/foreign` and `/foreign/mou`.

Code: `src/app/foreign/workpermit/page.tsx`,
`src/components/pages/ForeignWorkPermitClient.tsx`,
`src/components/ui/WorkPermitChat.tsx`,
`src/components/ui/WorkPermitLeadForm.tsx`,
`src/app/api/workpermit-chat/route.ts`, `src/lib/workpermit/*`.

---

## Campaign configuration

| Setting | Value |
|---|---|
| Campaign type | Search, objective Leads |
| Location | Wider radius than `/advice` — employers travel to arrange group screening. Nationwide-Thailand is defensible given this is a one-time deadline, not an ongoing local service; start narrower (e.g. Samut Sakhon + Bangkok + neighboring provinces) and widen if volume is thin. |
| Language | Thai |
| Final URL | `https://roogondee.com/foreign/workpermit` |
| Status at build time | **Paused** until copy review + Step 0 conversion check below |

This campaign is time-boxed: the renewal window closes **11 ธันวาคม 2569
16.30 น.** Do not let it keep spending past that date — the offer stops
existing. Set an end date on the campaign itself, not just a calendar
reminder.

## Keyword set

Seeded from the `foreign` row in `docs/pillar-google-ads.md`, plus
renewal-specific intent this deadline creates:

```
"ตรวจสุขภาพแรงงานต่างด้าว"        "ใบรับรองแพทย์ต่างด้าว"
"ตรวจสุขภาพ work permit"         "ตรวจสุขภาพ MOU"
"ตรวจสุขภาพต่างด้าว สมุทรสาคร"    [ใบรับรองแพทย์ 2 ภาษา]
"ต่อใบอนุญาตทำงาน 2569"          "ต่อ work permit แรงงานต่างด้าว"
"eworkpermit"                   "ต่ออายุใบอนุญาตทำงานคนต่างด้าว"
[ตรวจสุขภาพต่อใบอนุญาตทำงาน]      [รพ. เชื่อมข้อมูลกรมการจัดหางาน]
```

**Negative keywords:**

```
ฟรี
ไม่มีค่าใช้จ่าย
วีซ่า
ตม.
สัญชาติไทย
งานราชการ
สมัครงาน
```

`ฟรี`/`ไม่มีค่าใช้จ่าย` matter more here than on other pillars — this is one
of only two non-free offers (`docs/pillar-google-ads.md`), so a click
expecting a free checkup is a wasted click and a policy risk if the ad text
ever implied it. `วีซ่า`/`ตม.`/`สมัครงาน` filter out immigration/visa and job
-seeking searches this page cannot help with.

## Tracking template

```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&gclid={gclid}
```

Final URL: `https://roogondee.com/foreign/workpermit`

`WorkPermitLeadForm` and `WorkPermitChat` both read `gclid`/`utm_*` from the
URL on mount, persist `gclid` via `persistClickId` (30-day cookie, same
mechanism as `/advice`), and forward it — the lead form to `/api/leads`
(which now writes `leads.gclid` — previously dropped, see below), the chat
to `/api/workpermit-chat` → `create_lead` → `leads.gclid`.

**Prerequisite this campaign's launch fixed:** `/api/leads/route.ts`
silently dropped `gclid` from every submission — only the `/advice` chat
path wrote it. That's fixed as part of this page (see the diff to
`src/app/api/leads/route.ts`), so form-submitted work-permit leads can now be
offline-imported like advice-chat leads. If any *other* lead form is later
put behind paid traffic, confirm it also sends `gclid` in its POST body —
the column and the route both accept it now, but nothing forces a caller to
populate it.

## Conversion actions to configure

Create these as **native Google Ads conversion actions** (Goals →
Conversions → New → Website), same pattern as `/advice` — they do not
require GA4 to have seen the event first:

| Internal event | Fires when | Suggested Ads action |
|---|---|---|
| `workpermit_lead` | Lead form submitted successfully | `ads_conversion_Contact_Us_1` (Primary) |
| `workpermit_chat_lead` | Bot's `create_lead` tool succeeds | `ads_conversion_Contact_Us_1` (Primary) |
| `workpermit_call_click` | Any โทร button tapped | `ads_conversion_Contact_Us_1` (Secondary) |
| `workpermit_line_click` | Any แอดไลน์ button tapped | `ads_conversion_Contact_Us_1` (Secondary) |

All four are already mapped in `ADS_CONVERSIONS`
(`src/lib/analytics/track.ts`) — `track()` fires the paired Ads event
automatically. `workpermit_chat_start` is deliberately **not** mapped —
opening the chat is engagement, not contact.

Set **Count = One** per conversion action — a visitor who calls and also
taps LINE should count once, not twice.

`NEXT_PUBLIC_GOOGLE_ADS_ID` must already be set on Vercel for these to reach
Google Ads (it is, per `/advice`'s launch — confirm before assuming).

## Offline conversion import

Once a work-permit lead actually books a checkup:

```sql
select gclid, created_at, service, status
from leads
where source in ('workpermit-landing', 'workpermit-chat')
  and gclid is not null
  and status in ('booked', 'customer')
order by created_at desc;
```

Upload via Google Ads → Conversions → Uploads, same as the `/advice` SOP.

## Ad copy — words that get disapproved

| Never write | Write instead |
|---|---|
| ตรวจฟรี / ไม่มีค่าใช้จ่าย | เริ่มต้น 500 บาท/คน |
| รับรองผ่าน / อนุมัติแน่นอน | ตรวจตามมาตรฐานกรมการจัดหางาน |
| ยื่นเรื่องให้ / ดำเนินการต่ออายุให้ | ตรวจสุขภาพและออกใบรับรองแพทย์ (ยื่นต่ออายุผ่าน eworkpermit.doe.go.th) |
| รพ. ทุกแห่งใช้ได้ | รพ. ที่เชื่อมข้อมูลกับกรมการจัดหางานแล้วเท่านั้น |

The first row matters most: `foreign` is a non-free pillar and Google Ads
healthcare policy treats a false "free" claim as both a policy violation and
a Quality Score problem once users report the mismatch.

## Sales team SOP

Leads with `source in ('workpermit-landing', 'workpermit-chat')` are paid
traffic on a hard deadline — call back same-day, ahead of organic `/foreign`
leads. `notifyLine: true` pings the sales LINE group immediately on both
paths (form submit and bot-captured lead), same as `/advice`.

`note` on a chat-captured lead is bot-written from what the visitor actually
asked (document question, nationality, worker count) — read it before
calling. `note` on a form-submitted lead carries company/worker-count/
nationality fields directly.

## Safety layer — do not relax

`src/lib/workpermit/prompt.ts`'s bot reuses `triage()` from
`src/lib/advice/triage.ts` unchanged — a physical emergency or self-harm
disclosure typed into this box gets the same hardcoded 1669/1323 reply as
`/advice`, never an LLM-generated one. The bot also answers **only** from a
fixed FACTS block (dates/fees/steps verified against the DOE's own
announcement) and refuses to rule on case-specific questions (overstay,
blacklist, "will I make it in time") — those route to a phone call instead
of a guess. Do not loosen either constraint to make the bot sound more
helpful; a wrong deadline or fee stated confidently is worse than routing to
a human.
