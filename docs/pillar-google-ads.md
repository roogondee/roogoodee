# Pillar campaigns — Google Ads backlog

Keyword sets, offers, and policy constraints for advertising the eight named
services. **Nothing here is launched.** At the current THB 100/day the only
campaign running is `/advice` (see `docs/advice-google-ads.md`); splitting
that budget nine ways gives each campaign ~11 THB/day, which serves almost
never and produces no data worth reading. This file exists so that raising
the budget is a copy-paste rather than a re-think.

## Why these are separate campaigns, not ad groups inside `/advice`

`/advice` targets people who do **not** know what they need — they search a
symptom and land on an AI chat. The pillars target people who already know
what they want and search the service by name; they land on the pillar page
and go through the LIFF quiz to a voucher. Splitting them buys three things:

1. **Quality Score.** Keyword, ad text, and landing page all match, so CPC
   comes down. A `/advice` ad group bidding "ตรวจ HIV" would send that click
   to a general symptom chat and score badly.
2. **Policy isolation.** If `std` or `mens` gets flagged, it does not take
   `/advice` down with it.
3. **Offer accuracy.** Each pillar's ad copy has to state that pillar's
   actual offer, and they differ — some are genuinely free, two are not.

## Prerequisite: pillar conversions are not tracked yet

`ADS_CONVERSIONS` in `src/lib/analytics/track.ts` currently maps only the
`/advice` chat events. The pillar funnel fires `quiz_start`, `quiz_complete`,
and `voucher_sent` (see `src/components/quiz/QuizRunner.tsx` and
`src/app/api/quiz/route.ts`), none of which are mapped — so a pillar campaign
launched today would report **zero conversions** in Google Ads no matter how
well it performed.

Before spending on any campaign below, add the pillar events to
`ADS_CONVERSIONS`. `voucher_sent` is the right primary — it means a voucher
actually issued, not just that someone started answering questions.

## The offers, verbatim

Ad copy must match `ROUTES` in `src/lib/advice/routes.ts`, which is the
source of truth the AI also reads aloud. Two of these are **not** free, and
advertising them as free is both false and a policy problem:

| Pillar | Offer |
|---|---|
| glp1 | ปรึกษาแพทย์ + ตรวจ FBS/HbA1c ฟรี (มูลค่า 500 บาท) |
| std | ตรวจ HIV และซิฟิลิสฟรี รู้ผลใน 1 ชั่วโมง |
| ckd | ตรวจโปรตีนในปัสสาวะฟรี + ปรึกษาแพทย์ |
| women | ปรึกษาสูตินรีแพทย์ฟรี + ตรวจประเมินเบื้องต้น |
| mens | ปรึกษาแพทย์ฟรี |
| mind | ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที |
| dna | **ปรึกษาฟรี — การตรวจมีค่าใช้จ่าย 6,000–15,000 บาท** |
| foreign | **มีค่าใช้จ่าย เริ่ม 500 บาท/คน** |

---

## glp1 → `/glp1`

```
"ลดน้ำหนักโดยแพทย์"        "คลินิกลดน้ำหนัก สมุทรสาคร"
"ลดความอ้วนโดยแพทย์"       "ตรวจน้ำตาลสะสม"
"ตรวจ HbA1c"              "ตรวจเบาหวานฟรี"
"เสี่ยงเบาหวาน"            "น้ำตาลในเลือดสูง"
"ไขมันพอกตับ"              [ค่าน้ำตาลสะสมสูง]
```

**Never bid on `Ozempic`, `Saxenda`, or any other GLP-1 brand name.**
Prescription drug names violate Google's healthcare policy, and they are
already campaign negatives on `/advice` for the same reason. Target the
condition, not the molecule.

Extra negatives: `ยาลดความอ้วน`, `ซื้อยาลดน้ำหนัก`, `คีโต`, `อาหารเสริม`.

## std → `/std`

```
"ตรวจ HIV ฟรี"            "ตรวจเอชไอวี"
"ตรวจ HIV สมุทรสาคร"      "ตรวจโรคติดต่อทางเพศสัมพันธ์"
"ตรวจซิฟิลิส"             "PrEP ราคา"
"PrEP สมุทรสาคร"          "PEP ฉุกเฉิน"
[ตรวจ HIV รู้ผลเร็ว]
```

Falls under Google's **personalized health** policy: no remarketing or
audience targeting on this campaign, and ad copy must not imply anything
about the individual's status. "บริการตรวจ HIV รู้ผล 1 ชั่วโมง" is fine;
"คุณเสี่ยง HIV ใช่ไหม" is a violation. Some markets also require
certification before HIV-related ads run at all — check before building.

`PEP ฉุกเฉิน` traffic is time-critical (PEP must start within 72 hours).
Only run that keyword during hours the team can respond immediately.

## ckd → `/ckd`

```
"ตรวจไต"                  "ตรวจการทำงานของไต"
"ปัสสาวะเป็นฟอง"           "ค่าไตสูง"
"eGFR ต่ำ"                "โรคไตเรื้อรัง"
"คลินิกโรคไต สมุทรสาคร"    [ไตเสื่อมระยะแรกอาการ]
```

## women → `/women`

```
"ตรวจภายใน"               "ตรวจภายใน สมุทรสาคร"
"ตรวจ HPV"                "แปปสเมียร์"
"ตกขาวผิดปกติ"            "ประจำเดือนมาไม่ปกติ"
"ปวดท้องน้อยผู้หญิง"       "วัยทองผู้หญิง"
[ตรวจมะเร็งปากมดลูก]
```

## mens → `/mens`

```
"ฮอร์โมนเพศชายต่ำ"         "ตรวจฮอร์โมนเพศชาย"
"เทสโทสเตอโรนต่ำ"          "วัยทองผู้ชาย"
[อาการฮอร์โมนเพศชายลดลง]
```

No drug names of any kind and no guaranteed outcomes — the same compliance
gate the `mens` captions go through. Avoid explicit sexual-performance terms;
they get flagged quickly and pull in traffic the pillar is not built for.

## mind → `/mind`

```
"ปรึกษานักจิตวิทยา"        "ปรึกษาจิตแพทย์ออนไลน์"
"เครียดสะสม"              "นอนไม่หลับเรื้อรัง"
"วิตกกังวล"               [ปรึกษาปัญหาความสัมพันธ์]
```

Two constraints, both hard:

1. **Soft launch reality.** `MIND_WAITLIST_MODE` is still on
   (`src/lib/quiz/insight.ts`), so a lead gets a callback in 1–2 weeks, not a
   session today. Ad copy must not promise an immediate consultation. Either
   word it as "ลงชื่อปรึกษา" or hold this campaign until Phase 2 launches.
2. **Never bid on self-harm or suicide terms.** Google restricts them, and
   more importantly we should not be sourcing people in crisis through a paid
   funnel — the safety gate surfaces 1323 for those visitors, which is the
   correct destination and is not an ad.

## dna → `/dna`

```
"ตรวจ DNA พ่อลูก"          "ตรวจ DNA พิสูจน์บิดา"
"ตรวจ DNA ราคา"           "ตรวจ DNA ใช้ทางกฎหมาย"
[ตรวจ DNA พ่อลูก ที่ไหน]
```

Three red lines, all of which are already product policy:

- Ad copy must **never** say the test is free. The consultation is free; the
  test costs 6,000–15,000 THB.
- Never guarantee a legal outcome; accuracy claims belong to the lab.
- **Do not bid on covert-testing intent** — anything along the lines of
  "ตรวจ DNA แบบไม่ให้อีกฝ่ายรู้". Every party must consent, so buying that
  traffic means paying for leads we are obliged to refuse. Add such phrasings
  as negatives instead.

## foreign → `/foreign`

```
"ตรวจสุขภาพแรงงานต่างด้าว"      "ใบรับรองแพทย์ต่างด้าว"
"ตรวจสุขภาพ work permit"       "ตรวจสุขภาพ MOU"
"ตรวจสุขภาพต่างด้าว สมุทรสาคร"   [ใบรับรองแพทย์ 2 ภาษา]
```

B2B: the searcher is an HR officer or employer, not a patient. Ad copy should
lead with group pricing and document handling, and the campaign can run on a
wider radius than `/advice` since employers travel to arrange screening.
Credentials to cite are in `docs/foreign-worker-tiein.md`.

---

## Rollout order when the budget goes up

Each campaign needs roughly THB 100/day of its own to produce readable data,
so add them one at a time rather than splitting a fixed budget further.

1. **glp1** or **ckd** — highest-value offers, no special policy regime, and
   both map to conditions people actively search.
2. **women** — clear intent terms, free offer, no certification requirement.
3. **foreign** — B2B, different budget logic; can run alongside rather than
   competing for the same searchers.
4. **std** — only after confirming the personalized-health requirements.
5. **mens** — only with copy that has cleared the compliance gate.
6. **mind** — only after Phase 2 (in-house team live, waitlist mode off).
7. **dna** — last, and only with bespoke consent-aware messaging.
