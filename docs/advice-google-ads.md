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
- **Location:** Thailand, or narrow to Samut Sakhon + Bangkok +
  Samut Prakan. The visitor has to be able to physically reach the partner
  hospital for the lead to be worth anything.
- **Language:** Thai.
- **Bidding:** start on **Maximize clicks** with a Max CPC cap. Smart
  Bidding needs roughly 15–30 conversions before it has anything to learn
  from; pointed at an empty conversion history it just spends.
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

Set a daily budget that buys roughly 20–30 clicks/day and run for two weeks
before judging anything. Schedule delivery to hours when the team can
actually answer the phone — a follow-up call placed within minutes closes
far better than one placed the next morning.

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
