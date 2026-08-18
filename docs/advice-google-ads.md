# Advice AI — Google Ads brief

`/advice` is a landing page for **general-illness search traffic** — people
searching a symptom ("ปวดท้องข้างขวา", "ไข้ไม่ลด 3 วัน", "ปัสสาวะแสบขัด"),
not people shopping for one of our eight named services. It puts an AI chat
above the fold that gives real, useful advice (never a diagnosis), screens
for medical emergencies before the model ever runs, and then offers to
continue on LINE or leave a phone number.

Code: `src/app/advice/page.tsx`, `src/components/pages/AdviceClient.tsx`,
`src/components/ui/AdviceChat.tsx`, `src/app/api/advice/route.ts`,
`src/lib/advice/*`.

---

# Part 1 — Launch walkthrough (do these in order)

The rest of this file is the strategy brief. This part is the operational
order of work. **The order matters**: two of these steps silently fail if
done early, and one of them wastes budget.

## The configuration this campaign actually launches with

Decided 2026-08-17. These numbers override the generic ranges further down
in Step 4 and Step 5 — where they differ, this section wins.

| Setting | Value |
|---|---|
| Daily budget | **THB 100/day** (~THB 3,000/month) |
| Location | **5 km radius** around the partner hospital — 99/26 หมู่ 5 ต.บางน้ำจืด อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000 |
| Campaign type | Search, objective Leads |
| Networks | Google Search only — Search Partners OFF, Display OFF |
| Language | Thai |
| Bidding | Maximize clicks with a **Max CPC cap of THB 15** |
| Final URL | `https://roogondee.com/advice` |
| Status at build time | **Paused** until Step 3 and the copy review are done |

### Two settings that will quietly waste this budget if left on defaults

1. **Location option must be "Presence: People in or regularly in your
   targeted locations."** Google's default is *Presence or interest*, which
   also shows the ad to someone in another province who merely searched
   about Samut Sakhon. On a 5 km radius that default defeats the entire
   point of the radius. Campaign settings → Locations → Location options.
2. **Max CPC cap.** Without a cap, three expensive clicks can consume the
   whole THB 100. At a 15 THB cap the budget buys roughly 7–12 clicks/day,
   which is what makes daily search-terms review (Step 5) possible at all.

### What THB 100/day inside a 5 km radius realistically buys

Be honest about the arithmetic before judging the campaign:

- ~7–12 clicks/day, so ~200–350 clicks/month.
- A 5 km radius around บางน้ำจืด does reach a genuinely populated area — it
  covers industrial Samut Sakhon plus the edge of เขตบางบอน/บางขุนเทียน in
  Bangkok — but it is still a small slice of national search volume. Expect
  **low impression counts, not zero**; "Limited by budget" or thin
  impression share is the expected state here, not a misconfiguration.
- **Do not spread this budget across nine ad groups.** THB 100 split nine
  ways is ~11 THB each — most ad groups would serve almost never and none
  would accumulate enough data to judge. At this budget run **two ad
  groups**, then add more only when the budget goes up:

| Launch ad group | Why it goes first |
|---|---|
| **ปรึกษา / ใกล้ฉัน** (`"ปรึกษาหมอออนไลน์ฟรี"`, `"ถามอาการออนไลน์"`, `"เช็คอาการ"`, `"คลินิกใกล้ฉัน"`, `"หาหมอใกล้ฉัน"`) | Highest intent, and "ใกล้ฉัน" queries pair naturally with a radius — these people can actually reach the hospital. |
| **อาการยอดนิยม** (`"ปวดท้องข้างขวา"`, `"ปวดท้องน้อย"`, `"ไข้ไม่ลด"`, `"ปวดหัวบ่อย"`, `"ปัสสาวะแสบขัด"`) | The highest-volume symptom clusters, kept in one group so the spend concentrates. |

Hold the remaining clusters (ผื่น, เหนื่อยง่าย, นอนไม่หลับ, น้ำหนักลด,
and the broad single-word terms like `"ปวดท้อง"` / `"ไม่สบาย"`) as a
written backlog. Broad terms cost more per click and need volume to sort
themselves out — they are a budget-increase decision, not a launch one.

### Conversion tracking: use the native Ads conversion, not the GA4 import

There are two ways to get conversions into Google Ads, and only one of them
is blocked.

**Blocked — importing a GA4 key event** (Step 1 → Step 2). GA4 must have
already observed `advice_lead` before it can be marked as a key event and
imported. It never has, so this path cannot start yet.

**Not blocked — a Google Ads native conversion action.** Creating one in
Google Ads (Goals → Conversions → New → Website) gives you an event name
like `ads_conversion_Contact_Us_1` and asks you to install a snippet.
Google Ads does not need to have seen that event beforehand; the conversion
action exists the moment you create it and starts counting on the first
fire. **This is the path that unblocks launching**, and it is already wired
up in the code.

Two things make it work:

1. `ADS_CONVERSIONS` in `src/lib/analytics/track.ts` maps the internal
   events that mean a real contact — `advice_lead`,
   `advice_followup_call_click`, `advice_followup_line_click` — to the Ads
   event name. `track()` fires the paired Ads event automatically, so the
   snippet runs at the moment of conversion.
2. `NEXT_PUBLIC_GOOGLE_ADS_ID` (`AW-XXXXXXXXX`, from Google Ads → the tag's
   setup screen) must be set on Vercel so the tag carries an Ads
   destination. Without it the events fire into GA4 only and Google Ads
   records nothing.

> **Do not paste Google's snippet into `<head>` as its setup screen
> instructs.** In `<head>` it runs on every page load, so every pageview —
> blog posts, the 404, two-second bounces — is reported as a Contact, and
> Smart Bidding learns to buy pageviews. The mapping above exists precisely
> to avoid that.

In the Google Ads conversion action, set **Count = One** (not Every). A
visitor who leaves a phone number and then taps LINE fires the event twice;
"One" collapses that to a single conversion per click.

Even with this working, Google Ads will under-report — Consent Mode keeps
`ad_storage` denied until the PDPA banner is accepted. Judge the channel on
Supabase:

```sql
select date_trunc('day', created_at) as day, count(*)
from leads
where source = 'advice-chat'
group by 1 order by 1 desc;
```

At THB 100/day a single real lead per week already beats most paid channels
on cost per lead — set expectations accordingly, and don't switch bidding
strategies before Step 2 is unblocked.

### Before spending a single baht — the LINE push quota

As of 2026-08-17 the LINE OA push API is returning **429 "monthly limit
reached"**. `notifyLineGroup` is how a new `advice-chat` lead reaches the
sales team (see the Sales team SOP below), so while the quota is exhausted a
paid lead can arrive and nobody is told. Fix the quota — upgrade the OA plan
or wait for the monthly reset — or agree that someone checks the `leads`
table manually every day. Do not enable the campaign without one of those
two in place.

## Step 0 — Generate real conversion events FIRST

**This is the step everyone skips, and skipping it blocks Step 2 entirely.**

Google Ads can only import a GA4 event that GA4 has *already seen at least
once*. An event that has never fired does not appear in GA4's event list, so
it cannot be marked as a key event, so there is nothing to import. If
`advice_lead` has never fired in production, Step 2 has nothing to select.

Check whether it has ever fired:

```sql
select
  (select count(*) from leads where source = 'advice-chat')            as advice_leads,
  (select count(*) from chat_sessions where advice_phase = 'assessment_done') as assessments;
```

If `advice_leads = 0`, do this first — on the **live** site, not localhost:

1. Open `https://roogondee.com/advice` on a phone.
2. **Accept the PDPA cookie banner.** Consent Mode defaults every storage
   type to `denied` (see `src/app/layout.tsx` `GTAG_INIT`), so a visitor who
   never answers the banner sends no usable analytics hit. Testing without
   accepting will look like the tracking is broken when it isn't.
3. Describe a symptom, answer the intake questions through to the
   assessment, then give a name and phone number when the AI offers the
   follow-up call.
4. Repeat 2–3 times so the events are unambiguous.

Verify immediately in **GA4 → Reports → Realtime** — you should see
`advice_start`, `advice_assessment`, and `advice_lead`. Also re-run the SQL
above and confirm `advice_leads > 0`.

> **Step 0 is not a launch blocker any more.** It is still the right way to
> confirm the funnel works end to end, and the GA4 import path (Steps 1–2)
> still needs it. But a native Google Ads conversion action does not wait on
> GA4 — see "Conversion tracking" above. If the goal is to start spending,
> set `NEXT_PUBLIC_GOOGLE_ADS_ID` and launch; Steps 1–2 can follow later.

## Step 1 — Mark the events as key events in GA4

GA4 → Admin → **Events**. New event names can take up to ~24h to appear in
this list even though Realtime shows them instantly — wait for them rather
than assuming something is wrong.

Toggle **Mark as key event** on:

- `advice_lead`
- `advice_assessment`

## Step 2 — Import into Google Ads

Google Ads → Goals → **Conversions** → **+ New** → **Import** → Google
Analytics 4 → select:

| Event | Setting | Why |
|---|---|---|
| `advice_lead` | **Primary** | The actual business outcome. Smart Bidding optimizes toward this. |
| `advice_assessment` | **Secondary** | Volume signal while lead counts are still small. |

Do **not** create conversions on `advice_start` or `advice_message` — they
fire on ordinary interaction and would train bidding on chattiness instead
of intent.

> Note: an earlier version of this doc named `advice_service_suggested` as
> the secondary. `advice_assessment` is the better early signal because it
> fires whenever an intake completes, not only when the visitor's symptoms
> happen to match one of the eight pillars.

## Step 3 — Check for self-competition with existing campaigns

The account already runs symptom-adjacent campaigns (e.g. **"ตรวจโรคทั่วไป"**).
If those bid on the same symptom queries as `/advice`, the two campaigns
compete in the same auction and bid the CPC up against each other for no
gain.

Before enabling anything: pull the keyword lists of the existing campaigns,
diff them against the `/advice` keyword themes below, and add cross-negatives
in whichever direction you want the traffic to land. Decide deliberately
which page should own each query — do not let the auction decide.

## Step 4 — Build the campaign (leave it PAUSED)

**New Campaign → Objective: Leads → Type: Search.**

- **Networks:** Google Search only. Turn **off** Search Partners and
  **off** Display Network — on a new campaign these spend budget on traffic
  that does not convert here.
- **Location:** the visitor has to be able to physically reach the partner
  hospital for the lead to be worth anything. This launch uses a **5 km
  radius** around the hospital — see the configuration section above,
  including the *Presence* setting that must be changed off its default.
- **Language:** Thai.
- **Bidding:** start on **Maximize clicks** with a Max CPC cap (THB 15 for
  this launch). Smart Bidding needs roughly 15–30 conversions before it has
  anything to learn from; pointed at an empty conversion history it just
  spends.
- Keep the campaign **Paused** until someone has reviewed the ad copy
  against the policy table below.

### Ad groups and keywords

Split by symptom cluster so the ad text can match the query:

| Ad group | Example keywords |
|---|---|
| ปวดท้อง | `"ปวดท้องข้างขวา"`, `"ปวดท้องน้อย"`, `[ปวดท้องแบบไหนอันตราย]` |
| ไข้ | `"ไข้ไม่ลด"`, `"ไข้กี่วันควรไปหาหมอ"` |
| ปัสสาวะ | `"ปัสสาวะแสบขัด"`, `"ปัสสาวะบ่อยผิดปกติ"` |
| ปวดหัว / เวียนหัว | `"ปวดหัวบ่อย"`, `"เวียนหัวคลื่นไส้"` |
| ปรึกษาทั่วไป | `"ปรึกษาหมอออนไลน์ฟรี"`, `"ถามอาการออนไลน์"` |

Use `"phrase match"` as the default and `[exact]` for high-confidence terms.
Avoid broad match at launch — it spends fastest on the least relevant
queries.

### Full keyword backlog (beyond the two launch ad groups)

Everything below is written out so a budget increase is a copy-paste, not a
re-think. Only the two ad groups named in the configuration section run at
THB 100/day. Every keyword here maps to a symptom the chat can actually
handle — they mirror `AdviceChat`'s symptom chips (ไข้ / ปวดท้อง / ปวดหัว /
ผื่น / ปัสสาวะผิดปกติ / เหนื่อยง่าย / นอนไม่หลับ / น้ำหนักลด).

| Ad group | Keywords |
|---|---|
| ปวดท้อง | `"ปวดท้องข้างขวา"` `"ปวดท้องข้างซ้าย"` `"ปวดท้องน้อย"` `"ปวดท้องน้อยผู้หญิง"` `"ปวดท้องหลังกินข้าว"` `"ปวดท้องเรื้อรัง"` `[ปวดท้องแบบไหนอันตราย]` `[ปวดท้องต้องไปโรงพยาบาลไหม]` |
| ไข้ | `"ไข้ไม่ลด"` `"ไข้ไม่ลด 3 วัน"` `"ไข้สูงตอนกลางคืน"` `"ไข้หวัดไม่หาย"` `[ไข้กี่วันควรไปหาหมอ]` `[ไข้ขึ้นๆลงๆ]` |
| ปัสสาวะ | `"ปัสสาวะแสบขัด"` `"ปัสสาวะแสบขัดผู้หญิง"` `"ปัสสาวะบ่อยผิดปกติ"` `"ปัสสาวะมีเลือดปน"` `"ปัสสาวะขุ่น"` `[ปัสสาวะบ่อยตอนกลางคืน]` |
| ปวดหัว / เวียนหัว | `"ปวดหัวบ่อย"` `"ปวดหัวเรื้อรัง"` `"เวียนหัวคลื่นไส้"` `"เวียนหัวบ้านหมุน"` `"ปวดหัวข้างเดียว"` `[ปวดหัวแบบไหนอันตราย]` |
| ผื่น / ผิวหนัง | `"ผื่นขึ้นตามตัว"` `"ผื่นคันไม่ทราบสาเหตุ"` `"ผื่นแดงคัน"` `"ลมพิษขึ้นบ่อย"` `[ผื่นแบบไหนต้องพบแพทย์]` |
| เหนื่อยง่าย | `"เหนื่อยง่ายผิดปกติ"` `"อ่อนเพลียไม่มีแรง"` `"เหนื่อยง่ายทั้งที่ไม่ได้ออกแรง"` `[เหนื่อยง่ายเกิดจากอะไร]` |
| นอนไม่หลับ | `"นอนไม่หลับเรื้อรัง"` `"นอนไม่หลับติดต่อกันหลายวัน"` `[นอนไม่หลับทำไงดี]` |
| น้ำหนักลด | `"น้ำหนักลดโดยไม่ทราบสาเหตุ"` `"น้ำหนักลดเร็วผิดปกติ"` `[น้ำหนักลดโดยไม่ได้ตั้งใจ]` |
| ปรึกษาทั่วไป | `"ปรึกษาหมอออนไลน์ฟรี"` `"ถามอาการออนไลน์"` `"เช็คอาการเบื้องต้น"` `"ปรึกษาอาการฟรีไม่มีค่าใช้จ่าย"` `[ไม่สบายควรทำยังไง]` |
| ใกล้ฉัน (local intent) | `"คลินิกใกล้ฉัน"` `"หาหมอใกล้ฉัน"` `"โรงพยาบาลใกล้ฉัน"` `"ปรึกษาหมอออนไลน์ใกล้ฉัน"` |

**Pillar-adjacent symptom terms.** These stay in this campaign because they
are still symptom searches — the chat routes them onward with
`recommend_service`:

```
"น้ำหนักขึ้นผิดปกติ"  "อ้วนลงพุงเสี่ยงโรค"  [เสี่ยงเบาหวานอาการเป็นยังไง]   -> glp1
"ขาบวมทั้งสองข้าง"  "ปัสสาวะเป็นฟอง"  [ไตทำงานผิดปกติอาการเริ่มต้น]        -> ckd
"ตกขาวผิดปกติ"  "ประจำเดือนมาไม่ปกติ"  "ปวดท้องประจำเดือนรุนแรง"            -> women
"เครียดสะสมนอนไม่หลับ"  "วิตกกังวลบ่อยผิดปกติ"                              -> mind
```

**Broad single-word terms — budget-increase only, not for THB 100/day:**

```
"ปวดท้อง"  "มีไข้"  "ปวดหัว"  "เวียนหัว"  "ปัสสาวะผิดปกติ"
"ผื่นคัน"  "เหนื่อยง่าย"  "อ่อนเพลีย"  "นอนไม่หลับ"  "ไม่สบาย"
"เช็คอาการ"  "ปรึกษาหมอ"  "ปรึกษาหมอฟรี"
```

### Verticals that must NOT go in this campaign

Do not fold these into `/advice` even though the site covers them — each
carries a policy or consent constraint that would put the whole account's
review status at risk if mixed into a general-illness campaign:

| Vertical | Why it needs its own campaign |
|---|---|
| **std / PrEP HIV** | Google's personalized-health policy restricts sexual-health and HIV targeting; some markets require certification first. |
| **mens** (andropause) | Must clear the existing compliance gate — no drug names, no guaranteed results. These queries get flagged easily. |
| **dna** | Deliberately excluded from general marketing (same reason it's out of FB Story rotation and the article quiz) — consent red lines need bespoke messaging. |
| **foreign** (B2B) | Audience is HR/employers, not patients searching symptoms. Belongs with the existing B2B campaigns. |

### Negative keywords (add before enabling, not after)

```
ซื้อยา
ราคายา
สั่งยาออนไลน์
ยาปฏิชีวนะ
Ozempic
Saxenda
pantip
คืออะไร
วิธีทำ
ฟรี ดาวน์โหลด
```

`pantip` / `คืออะไร` are research intent, not care-seeking intent.
Controlled-drug brand names are both wasted spend and a healthcare policy
risk — see the policy section below.

### Tracking template

Campaign settings → Campaign URL options → **Tracking template**:

```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&gclid={gclid}
```

Final URL: `https://roogondee.com/advice`

Without `{gclid}` the offline conversion import below is impossible — the
lead row has no click to tie back to.

### Responsive search ad copy

Headlines (Thai, ≤30 chars each):

```
ปรึกษาอาการเบื้องต้นฟรี
ไม่สบาย ปรึกษาได้ 24 ชม.
ประเมินอาการฟรี ไม่มีค่าใช้จ่าย
ตอบไว ไม่ต้องรอคิว
บอกชัดว่าควรพบแพทย์เมื่อไหร่
ไม่ต้องสมัครสมาชิก
รู้ก่อนดี(รู้งี้)
มีทีมช่วยประสานนัดหมอให้
```

Descriptions (≤90 chars each):

```
เล่าอาการให้ผู้ช่วย AI ฟัง รับคำแนะนำดูแลตัวเอง พร้อมสัญญาณที่ต้องพบแพทย์ ฟรี
ปรึกษาฟรี ไม่มีค่าใช้จ่าย หากอาการไม่ดีขึ้น ทีมงานช่วยประสานนัดแพทย์ให้ได้
```

**Wording that will get the ad disapproved** — the page copy is already
compliant, but ad text is reviewed separately and is the usual failure point:

| Never write | Write instead |
|---|---|
| วินิจฉัยโรค | ประเมินอาการเบื้องต้น |
| รักษาให้หาย / หายขาด | ดูแลอาการ |
| หมอ AI / AI วินิจฉัย | ผู้ช่วยแนะนำสุขภาพ |
| จ่ายยา / สั่งยา | (do not mention medicine at all) |

## Step 5 — Enable, then watch the search terms report

Run for two weeks before judging anything. This launch's budget is THB
100/day (~7–12 clicks/day — see the configuration section); the 20–30
clicks/day figure below is what a scaled-up version of this campaign would
look like, not the starting point. Schedule delivery to hours when the team
can actually answer the phone — a follow-up call placed within minutes
closes far better than one placed the next morning.

**Every day for the first week:** Keywords → **Search terms** → add
irrelevant queries as negatives. This is where budget leaks fastest on a new
campaign.

Once `advice_lead` has accumulated ~30 conversions, switch bidding to
**Maximize conversions**.

## Reading the numbers honestly

Google Ads will **under-report** conversions on this site. Consent Mode
withholds analytics from visitors who don't accept the PDPA banner, and
Google only models part of that gap.

Treat Supabase as the source of truth for how many real leads the campaign
produced:

```sql
select date_trunc('day', created_at) as day, count(*)
from leads
where source = 'advice-chat'
group by 1 order by 1 desc;
```

Use the Google Ads number for *relative* comparisons between keywords and
ads; use the SQL number when deciding whether the channel pays for itself.

---

# Part 2 — Strategy brief

## Campaign setup

**Keyword theme:** symptom + concern phrases, not service or drug names.
Good: "ปวดท้องขวาล่าง", "ไข้ไม่ลดกี่วันควรไปหาหมอ", "ปัสสาวะแสบขัดผู้หญิง",
"เหนื่อยง่ายผิดปกติ", "ปรึกษาหมอออนไลน์ฟรี". This traffic is meant to land
here — the eight service landing pages (`/glp1`, `/std`, `/ckd`, `/mens`,
`/women`, `/mind`, `/dna`, `/foreign`) already have their own campaigns for
people who already know what they want.

**Negative keywords (required):**
- Any controlled/prescription drug name (Ozempic, Saxenda, PrEP brand names,
  hormone brand names, etc.) — this page must never look like it's selling
  medicine, and Google Ads healthcare policy will flag it.
- "ซื้อยา", "ราคายา", "สั่งยาออนไลน์" — we don't sell or prescribe over chat.
- Anything in the `mens` compliance blocklist (`src/lib/agent/prompts.ts` /
  `docs/` — ad-policy trigger words for the andropause vertical apply here
  too if traffic overlaps).

**Final URL + tracking template:** the landing URL MUST carry `{gclid}` and
UTM params so a lead created in chat can be tied back to the click:

```
https://roogondee.com/advice?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&gclid={gclid}
```

`AdviceChat` reads `gclid`/`utm_*` from the URL on mount, persists `gclid`
in a cookie (`persistClickId`, 30 days — same mechanism as the TikTok
`ttclid` capture) so a lead created several messages in still carries it, and
sends it with every `/api/advice` request. It lands on `leads.gclid` and
`leads.utm_*` via `create_lead` / `book_appointment`-equivalent tool calls.

## What each tracked event means

Setup instructions live in Part 1, Step 2 — this is just what the events are.
All of them fire client-side through `track()` in `src/lib/analytics/track.ts`.

| Event | Fires when | Use |
|---|---|---|
| `advice_start` | The chat mounts | Funnel top. Never a conversion. |
| `advice_message` | Visitor sends a message | Engagement only. Never a conversion. |
| `advice_assessment` | Intake completes and the assessment is delivered (once per session) | Secondary conversion / mid-funnel |
| `advice_service_suggested` | AI routes to a specific pillar via `recommend_service` | Diagnostic only — fires only when symptoms match one of the eight pillars, so it under-counts general illness |
| `advice_lead` | `create_lead` succeeds | **Primary conversion** |
| `advice_emergency` / `advice_urgent` | Triage escalates | Safety monitoring, not marketing |

`advice_start` → `advice_assessment` → `advice_lead` is the funnel to watch:
a drop between the first two means the intake is asking too much, a drop
between the last two means the follow-up-call offer isn't landing.

## Offline conversion import

Once a lead from `/advice` books an actual appointment or converts, upload it
back to Google Ads as an offline conversion using `leads.gclid`:

```sql
select gclid, created_at, service, status
from leads
where source = 'advice-chat' and gclid is not null and status in ('booked','customer')
order by created_at desc;
```

Export this and use Google Ads' offline conversion import (Conversions →
Uploads) so Smart Bidding learns which symptom keywords produce real
patients, not just chat replies.

## Healthcare ad policy — do not violate

Google Ads healthcare & medicines policy prohibits pages that claim to
diagnose or treat. `/advice` is built to comply structurally, not just in
copy:

- The AI system prompt (`src/lib/advice/prompt.ts`) hard-bans diagnosis,
  prescription drug names/doses, and cure claims — see the "HARD RULES"
  section there.
- Every reply must end with red-flag guidance (when to go to hospital), not
  just self-care tips.
- The page copy says "ประเมินเบื้องต้น" (initial assessment) throughout, never
  "วินิจฉัย" (diagnose) or "รักษา" (treat) applied to the AI itself.
- If Google flags the page during review, check that the ad creative/keyword
  set doesn't imply the AI diagnoses — that's a policy violation even if the
  page copy is compliant.

## Sales team SOP

Leads with `source = 'advice-chat'` came from a **paid click** — call these
back first, ahead of organic leads, during business hours. The tool call
that creates them also pings the sales LINE group immediately (`notifyLine:
true` in `src/lib/agent/tools.ts`), so treat that ping like the MOU landing's
lead form, not like the passive nightly digest.

`note` on these leads is a short AI-written symptom summary — read it before
calling; it often includes red flags the visitor already disclosed in chat.

## Safety layer — do not relax

`src/lib/advice/triage.ts` runs **before** the model on every message and
returns a hardcoded (never LLM-generated) 1669 reply for anything that reads
like a medical emergency, reusing the same 1323/1300 crisis responses as the
`mind` pillar's self-harm gate. This is a hard requirement, not a tunable
default — see CLAUDE.md "Advice AI" section for the full list of red lines.
