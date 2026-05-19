# Meta Awareness Playbook — รู้ก่อนดี (Roogondee)

**Last updated:** 2026-05-19
**Owner:** Marketing
**Status:** Ready to brief agency / in-house buyer
**Companion docs:** `fb-ads-brief.md` (Lead campaign), `fb-boost-playbook.md`, `fb-ad-copy.md`

---

## 1. ทำไมต้องยิง Awareness ก่อน

แบรนด์ "รู้ก่อนดี" ยังใหม่ — คนยังไม่เคยได้ยินชื่อ → ยิง Lead Ads ตรงเลย CPL จะแพง

| Objective | CPM ไทย (healthcare) | เป้าหมาย | เหมาะกับเฟส |
| --- | --- | --- | --- |
| **Awareness** | 30–80 ฿ | คนเห็น brand, จดจำชื่อ | เดือน 1–2 (← เราอยู่ตรงนี้) |
| **Traffic** | 100–300 ฿ | คนคลิกเข้าเว็บ | เทสต์ landing |
| **Leads** | 50–200 ฿/lead | คนทำ quiz จบ | เดือน 2+ (retarget) |

**Rule of 7:** คนต้องเห็น brand เฉลี่ย 7 ครั้งก่อนตัดสินใจ click/lead
→ Awareness สร้าง audience pool → Retargeting แปลงเป็น lead ที่ CPL ถูกลง 30–50%

---

## 2. Prerequisites (ทำให้ครบก่อนยิง)

| Item | Status | Action |
| --- | --- | --- |
| Meta Pixel ติดบนเว็บ | ✅ | `NEXT_PUBLIC_META_PIXEL_ID` (`src/app/layout.tsx`) |
| Meta Conversions API (server-side) | ✅ | `src/lib/facebook-events.ts` → fire ที่ `src/app/api/quiz/route.ts` |
| Event Match Quality ≥ 6 | ⏳ | เช็คใน Events Manager → Diagnostics |
| FB Page verified | ✅ | Page ID `1042552638945974` |
| Domain verified ใน Business Manager | ❓ | ต้องเช็ค — บังคับสำหรับ iOS 14.5+ |
| Aggregated Event Measurement (8 events priority) | ❓ | ตั้งใน Events Manager: 1=Lead, 2=CompleteRegistration, 3=InitiateCheckout, 4=ViewContent... |
| Conversion API test events | ⏳ | ตั้ง `FB_TEST_EVENT_CODE` env → verify ใน Test Events tab |
| Ad account billing | ❓ | ต้องเช็ค limit + payment method |

---

## 3. Custom Audiences ที่ต้องสร้างก่อน (Source pools)

ใน **Ads Manager → Audiences → Create Audience → Custom Audience**:

| # | Audience | Source | Retention | ใช้สำหรับ |
| --- | --- | --- | --- | --- |
| 1 | Website — All visitors | Pixel: All site visitors | 180d | Retarget + LAL source |
| 2 | Quiz starters | Pixel: `InitiateCheckout` | 180d | Retarget (dropped off) |
| 3 | Quiz completers | Pixel: `CompleteRegistration` | 180d | **LAL seed (best)** |
| 4 | FB Page engagers | Page: anyone engaged | 365d | LAL source |
| 5 | IG engagers | IG: anyone engaged | 365d | LAL source |
| 6 | Video viewers 75% | Video: ThruPlay 75%+ | 180d | Warm retarget |

**Lookalike Audiences (Phase 2 — เมื่อ #3 มี ≥100 คน):**

- LAL 1% ไทย จาก Quiz completers — ใช้เป็น "warm" audience สำหรับ Awareness
- LAL 1–3% ไทย จาก Website visitors — ใหญ่กว่า, ใช้ scale

---

## 4. Audience Targeting (แยกตาม service)

### 4.1 GLP-1 (ลดน้ำหนัก)

```
Location:    ไทย (Tier 1: กทม, ปริมณฑล, เชียงใหม่, ภูเก็ต)
Age:         25–55
Gender:      All (skew หญิง 70%)
Interests:   ลดน้ำหนัก, Intermittent Fasting, Keto diet, ฟิตเนส,
             Ozempic, Wegovy, Mounjaro, สุขภาพดี, โยคะ
Behaviors:   Engaged shoppers (health & beauty)
Exclude:     Custom audiences #1–3 (เคยรู้แล้ว ไม่ต้องยิง awareness)
```

### 4.2 STD / PrEP HIV

```
Location:    ไทย — กทม + เมืองท่องเที่ยว (ภูเก็ต, พัทยา, เชียงใหม่)
Age:         18–40
Gender:      All
Interests:   PrEP, HIV awareness, LGBTQ community, สุขภาพทางเพศ,
             Grindr, Blued (เป็น apps — target ผ่าน interest)
Languages:   Thai, English
Exclude:     Custom audiences #1–3
```

**Sensitivity flag:** Meta จำกัด targeting health condition — **ห้ามใส่ "HIV"** ตรง ๆ ใน detailed targeting (จะโดน reject) → ใช้คำกว้าง: "Sexual health", "PrEP", "LGBTQ awareness"

### 4.3 CKD (โรคไต)

```
Location:    ไทย ทั้งประเทศ (เน้นต่างจังหวัด: อีสาน, เหนือ)
Age:         40–65
Gender:      All (skew ชาย 55%)
Interests:   โรคเบาหวาน, ความดันโลหิตสูง, สุขภาพผู้สูงอายุ,
             อาหารคลีน, น้ำเปล่า, การออกกำลังกายผู้สูงวัย
Exclude:     Custom audiences #1–3
```

### 4.4 Foreign worker (B2B — HR targeting)

```
Location:    สมุทรสาคร + อ้อมน้อย + พระประแดง + บางบอน (radius 25km)
Age:         28–55
Job titles:  HR Manager, HR Officer, Factory Manager, Owner,
             Plant Manager, ผู้จัดการโรงงาน, ฝ่ายบุคคล
Industries:  Manufacturing, Food processing, Seafood, Fishery
Exclude:     Custom audiences #1–3
```

→ **B2B = ใช้ LinkedIn คู่ขนานด้วย** (Meta targeting ฝ่ายบุคคลในไทยยังไม่แม่น)

---

## 5. Campaign Structure (ABO เริ่มต้น)

ใช้ **Ad Set Budget Optimization (ABO)** ตอนเริ่ม เพื่อเทสต์ audience ทีละกลุ่ม
หลัง 14 วัน → ย้าย winner ไป **CBO (Campaign Budget Optimization)** เพื่อ scale

```
Campaign: AWARE - {service} - {YYYY-MM}
Objective: Awareness
Performance goal: Maximize reach OR Ad recall lift
Buying type: Auction
Special ad categories: None (healthcare ไม่ entry restricted ในไทย — แต่เช็ค copy ห้าม claim)

├─ Ad Set A: LAL 1% (seed=Quiz completers)         งบ 200 ฿/วัน
├─ Ad Set B: Interest stack (ดู section 4)         งบ 200 ฿/วัน
├─ Ad Set C: Broad (age + gender + location only)  งบ 100 ฿/วัน
└─ Ad Set D: FB/IG engagers (warm)                 งบ 100 ฿/วัน

แต่ละ Ad Set: 3–5 creatives (รูป + caption ต่างกัน)
```

→ **1 campaign per service** = 4 campaigns
→ งบรวมขั้นต่ำ: 600 ฿/วัน × 4 service = **2,400 ฿/วัน = 72,000 ฿/เดือน**
→ ถ้างบจำกัด เริ่มแค่ **GLP-1 + STD** ก่อน = 1,200 ฿/วัน = 36,000 ฿/เดือน

---

## 6. Creative Strategy

### 6.1 Awareness creative ≠ Lead creative

| Element | Lead Ad | Awareness Ad |
| --- | --- | --- |
| Hook | "รับ voucher ฟรี" | "คุณรู้ไหมว่า…" / ตั้งคำถาม |
| Tone | ขายตรง | Educate / surprise / empathy |
| CTA | "ทำแบบทดสอบ" / "Sign Up" | "เรียนรู้เพิ่มเติม" / "Learn More" |
| Brand visibility | กลาง | **เด่นมากตลอด 3 วินาทีแรก** |
| KPI | CPL, conversion rate | CPM, reach, ad recall, frequency |

### 6.2 Format Priority

1. **Reels / Stories video 9:16** (15–30 วิ) — reach ถูกสุด, CPM 30–50 ฿
2. **In-feed video 1:1 หรือ 4:5** (30–60 วิ) — engagement สูง
3. **Carousel 1:1** (3–5 cards) — explain service step by step
4. **Single image 1:1** — backup / static testing

### 6.3 Creative angles (เริ่มเทสต์ 3 angles/service)

**GLP-1:**
- A. Myth-busting — "ลดน้ำหนัก ≠ อดอาหาร"
- B. Patient story — "ลด 12 กก ใน 4 เดือน ที่บ้านโดยไม่ออกกำลัง"
- C. Quiz hook — "ตอบ 2 นาที รู้ว่าคุณเหมาะ GLP-1 ไหม"

**STD/PrEP:**
- A. Stigma break — "PrEP กินทุกวัน = ป้องกัน HIV 99%"
- B. Free test angle — "ตรวจ HIV+Syphilis ฟรี ผล 1 ชม"
- C. Anonymous reassurance — "ไม่มีชื่อในระบบ ไม่บอกใคร"

**CKD:**
- A. Silent disease — "โรคไตไม่มีอาการ จนสาย"
- B. Free urine test — "ตรวจฟรี รู้ผลทันที"
- C. Diabetic crossover — "เบาหวาน 10 ปี = 30% เป็นโรคไต"

**Foreign:**
- A. Compliance — "ใบรับรองสุขภาพแรงงานต่างด้าว ครบ 9 จุด"
- B. Bulk discount — "ตรวจ 50 คน ส่วนลด 30%"
- C. On-site — "ทีมไปตรวจที่โรงงาน ไม่ต้องหยุดงาน"

### 6.4 Brand consistency rules

- โลโก้ "รู้ก่อนดี" มุมบน-ซ้าย ทุก creative
- Mint green `#52B788` เป็น accent color หลัก
- Sarabun font (ในรูปที่มี text overlay)
- Disclaimer "ปรึกษาแพทย์ก่อนใช้ยา" สำหรับ GLP-1/PrEP

---

## 7. Optimization Settings

```yaml
Campaign objective:    Awareness
Performance goal:      Maximize reach   (เริ่ม)
                       → Ad recall lift (Phase 2 หลัง 7 วัน)
Bid strategy:          Highest volume (no cap)
Budget:                Daily (ไม่ใช่ lifetime — ปรับง่ายกว่า)
Schedule:              ตลอดวัน
Placements:            Advantage+ (Meta auto)
                       → exclude: Audience Network, Right column
Attribution window:    7-day click / 1-day view
Frequency cap:         2 per 7 days (Awareness only)
```

---

## 8. KPI Dashboard

ดูทุก 3 วัน, ตัดสินใจทุก 7 วัน:

| Metric | Target | Threshold ปรับ |
| --- | --- | --- |
| **CPM** | < 80 ฿ | > 120 ฿ = เปลี่ยน audience |
| **Reach** | > 50K/wk/service | < 20K = เพิ่มงบ 50% |
| **Frequency** | 2–4 | > 5 = refresh creative |
| **CTR (link)** | > 0.8% | < 0.5% = เปลี่ยน hook |
| **CPC** | < 5 ฿ | > 10 ฿ = creative ไม่ resonate |
| **Page like growth** | +500/mo | — |
| **Branded search lift** | +20% in 60d | check Google Trends "รู้ก่อนดี" |
| **Direct + organic traffic** | +30% in 60d | check GA4 |

**Kill criteria (หยุด ad ทันที):**
- CPM > 200 ฿ หลัง 3 วัน + spend > 1,500 ฿
- Frequency > 7 + CTR ตก > 50%
- CTR < 0.3% หลัง 5,000 impressions

---

## 9. Phased Rollout

### Phase 1 — Awareness Only (สัปดาห์ 1–4)

- Spend: 30,000–40,000 ฿/เดือน
- 2 service (GLP-1 + STD)
- เป้าหมาย: build Custom Audiences #1 + #6 (video viewers) ให้ใหญ่
- ห้ามวัด leads ในเฟสนี้ — KPI = reach + frequency

### Phase 2 — เพิ่ม Retargeting (สัปดาห์ 5–8)

```
Existing:  AWARE-GLP1, AWARE-STD                    งบ 30,000 ฿/เดือน
NEW:       RETARGET-GLP1-CONV (Conversion: Lead)    งบ 10,000 ฿/เดือน
NEW:       RETARGET-STD-CONV  (Conversion: Lead)    งบ 10,000 ฿/เดือน

Retargeting audience: Custom #1 + #2 + #6 — exclude #3 (เคยทำ quiz จบแล้ว)
Creative: ขายตรง + voucher offer
Goal:     CPL < 100 ฿
```

รวม 50,000 ฿/เดือน → คาด 200–400 leads → effective CPL 125–250 ฿
(สูงกว่าเป้า fb-ads-brief 80 ฿ เพราะรวมงบ awareness — เฉพาะ retargeting จะ < 80 ฿)

### Phase 3 — Scale + 4 services (สัปดาห์ 9–12)

- เพิ่ม CKD + Foreign campaign
- ย้าย winner ad set ไป CBO
- งบ 80,000–120,000 ฿/เดือน
- เป้า: 600–1,200 leads/เดือน

---

## 10. Compliance / Policy Risks

| Risk | Mitigation |
| --- | --- |
| Meta reject "HIV" targeting | ใช้ "Sexual health" / "PrEP" |
| Health claims ใน copy | ห้ามคำว่า "รักษาหาย", "100%" — ใช้ "ลดความเสี่ยง", "ป้องกัน" |
| Before/after photos (GLP-1) | ห้าม — Meta policy ban ตั้งแต่ 2019 |
| Personal attributes targeting | ห้ามคำ "you are…" ใน copy (เช่น "you are overweight") |
| PDPA (ไทย) | quiz มี consent screen แล้ว ✅ |
| FDA/อย. | ห้ามอ้างเป็น "ผู้จัดจำหน่ายยา" — เราเป็น lead-gen → ส่งต่อแพทย์ |

---

## 11. ทีม Marketing ทำตามนี้ได้เลย

1. **Day 0:** verify Pixel + CAPI test events
2. **Day 1:** สร้าง Custom Audiences #1–6
3. **Day 2:** สร้าง 4 campaigns (1/service) — ABO setup
4. **Day 3–4:** Upload creative (3 angles × 4 services = 12 creative อย่างน้อย)
5. **Day 5:** Launch — งบ test mode (200 ฿/ad set/วัน)
6. **Day 12:** Review → kill loser ad sets → double งบ winner
7. **Day 28:** Build LAL audiences (ต้องมี seed ≥100)
8. **Day 30:** Phase 2 — เปิด Retargeting layer

---

## 12. Related files

- `docs/fb-ads-brief.md` — Lead campaign spec (Phase 2 conversion)
- `docs/fb-ad-copy.md` — copy templates พร้อมใช้
- `docs/fb-boost-playbook.md` — boost organic post (cheaper than ads)
- `docs/ads-samples.md` — sample creatives
- `src/lib/facebook-events.ts` — Meta CAPI server-side
- `src/app/admin/ads/page.tsx` — internal ad draft approval
