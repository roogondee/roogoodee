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

## Conversion actions to configure in Google Ads

- **Primary — `advice_lead`**: fires (client-side, via `track()`) the moment
  the AI successfully calls `create_lead`. This is the action Smart Bidding
  should optimize toward.
- **Secondary — `advice_service_suggested`**: fires when the AI routes the
  visitor to a specific pillar (`recommend_service`). Useful as a leading
  indicator while `advice_lead` volume is still low.
- Do **not** set up a conversion on `advice_start` or `advice_message` —
  those fire on every keystroke-adjacent action and would train Smart
  Bidding on engagement, not intent.

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
