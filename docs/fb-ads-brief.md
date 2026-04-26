# Facebook Lead Ads Brief — รู้ก่อนดี (Roogondee)

**Last updated:** 2026-04-26
**Owner:** Marketing
**Status:** Ready to launch (pending Meta Pixel ID + budget approval)

---

## 1. Objective & KPI

| Metric | Target (รอบแรก 30 วัน) |
| --- | --- |
| **Primary KPI** | Cost per Lead (CPL) ≤ 80 ฿ ต่อ qualified lead |
| **Secondary** | Lead → LINE add rate ≥ 60% |
| **Quality gate** | Lead tier ≥ warm ≥ 50% (จาก quiz scoring) |
| **Spend cap pilot** | 30,000 ฿ split 3 services × 14 วัน |

**Conversion event ที่ optimize:** `Lead` (Meta standard event) — fire เมื่อ user ทำ quiz จบและรับ voucher

---

## 2. Funnel ที่ใช้

**Format: Conversion Ads → Quiz Landing Page** (ไม่ใช่ Native Lead Form)

```
FB/IG Ad
   ↓ (click)
/quiz/{service}?utm_source=fb&utm_medium=cpc&utm_campaign={campaign_id}
   ↓ (ตอบ 6-8 คำถาม + กรอกชื่อ/เบอร์/LINE ID + PDPA consent)
Voucher screen + LINE OA add prompt
   ↓ (auto)
LINE push: voucher code + นัดเวลา (ทีมขายจัดการต่อ)
```

**ทำไมไม่ใช้ FB Native Lead Form:**
- ไม่ได้ score ลูกค้า (เราต้อง qualify ก่อนนัด)
- PDPA consent ใน FB form กฎหมายไทยไม่ครอบคลุม
- ไม่ได้ push voucher อัตโนมัติเข้า LINE

---

## 3. Pixel & Tracking

**Meta Pixel ID:** `_____________` ← ขอจากทีม marketing แล้วใส่ที่ Vercel env `NEXT_PUBLIC_META_PIXEL_ID`

**Events ที่เว็บยิงแล้ว** (ทีม FB ads ตั้ง custom conversion ได้เลย):

| Event | When | Use for |
| --- | --- | --- |
| `PageView` | Auto ทุกหน้า | Retargeting audience |
| `Lead` | quiz เสร็จ + ได้ voucher | **Optimize for ads** |
| `CompleteRegistration` | quiz เสร็จ | Backup conversion |
| `quiz_start` (custom) | เริ่ม quiz | Funnel drop-off analysis |
| `quiz_complete` (custom) | เสร็จ quiz มี `tier`, `score` | High-value audience filter |

**UTM convention** (ใช้ทุก ad):
```
?utm_source=facebook&utm_medium=cpc&utm_campaign={service}_{angle}_{audience}
ตัวอย่าง: utm_campaign=glp1_belly_women3045
```

---

## 4. Service-by-Service Brief

### 4.1 GLP-1 ลดน้ำหนัก

**Landing:** `https://roogondee.com/quiz/glp1`
**Hook:** ตรวจเบาหวาน FBS + HbA1c **ฟรี (มูลค่า 500 ฿)** ก่อนเริ่ม GLP-1 ที่ W Medical Hospital
**Voucher:** `RGD-GLP1-XXXXXX` อายุ 14 วัน

**Audience:**
- เพศ: ชาย+หญิง
- อายุ: 28–55
- สถานที่: กรุงเทพ + ปริมณฑล (Phase 1) → ขยาย Phase 2
- Interests: weight loss, fitness, healthy eating, intermittent fasting, keto, Ozempic, Mounjaro
- Behaviors: ผู้ใช้มือถือสูง, frequent travelers (proxy ราย​ได้)

**Ad Copy (Thai) — A/B test 3 ตัว:**

**A) Pain-led**
> หัวเรื่อง: น้ำหนักลงยาก หิวบ่อย? อาจเป็นสัญญาณดื้ออินซูลิน
> เนื้อ: ก่อนเริ่ม GLP-1 ตรวจเบาหวาน FBS + HbA1c **ฟรี มูลค่า 500 บาท** ที่ W Medical Hospital เพื่อประเมินความเหมาะสมและความปลอดภัย
> CTA: ลงทะเบียนรับสิทธิ์ →

**B) Benefit-led**
> หัวเรื่อง: ตรวจเบาหวานฟรี ก่อนเริ่ม GLP-1
> เนื้อ: รับการตรวจ FBS + HbA1c มูลค่า 500 ฿ ฟรี — ประเมินผลโดยแพทย์ ปรึกษาส่วนตัว ผลรู้เร็ว
> CTA: รับสิทธิ์ →

**C) Social proof**
> หัวเรื่อง: คนกรุงเทพ 200+ คน ลดน้ำหนักด้วย GLP-1 อย่างปลอดภัย
> เนื้อ: ตรวจ FBS + HbA1c ฟรี (มูลค่า 500฿) ก่อนเริ่มยา ที่ W Medical Hospital
> CTA: ทำแบบประเมิน →

**Creative format:**
- Single image 1:1 (1080×1080) — รูปโรงพยาบาล/หมอ ห้ามใช้ before/after ตัวเรือน
- Video 9:16 (1080×1920) 15 วินาที — explainer + free check offer

**⚠️ Meta Policy ระวัง:**
- ห้ามใช้ before/after ภาพ
- ห้าม implicate ว่า user น้ำหนักเกิน ("คุณอ้วนเกินไป" ❌)
- ห้ามอวดอ้างผลลัพธ์ ("ลด 10 กิโลใน 30 วัน" ❌)

---

### 4.2 STD/HIV ตรวจฟรี

**Landing:** `https://roogondee.com/quiz/std`
**Hook:** ตรวจ HIV + Syphilis **ฟรี** ส่วนตัว ไม่ตัดสิน ผลรู้ภายใน 1 ชั่วโมง
**Voucher:** `RGD-STD-XXXXXX` อายุ 14 วัน

**Audience:**
- เพศ: ทุกเพศ
- อายุ: **18–45** (Meta บังคับ 18+ สำหรับ health-related)
- สถานที่: กรุงเทพ + ปริมณฑล
- Interests: sexual health, LGBTQ+, dating apps (Grindr, Tinder), PrEP, harm reduction
- Custom audience: lookalike จาก existing LINE OA followers

**Ad Copy (Thai):**

**A) Privacy-led** (Recommended)
> หัวเรื่อง: ตรวจ HIV + Syphilis ฟรี รู้ผลใน 1 ชั่วโมง
> เนื้อ: บริการส่วนตัว ไม่ตัดสิน — สำหรับทุกเพศ ทุกวัย ปรึกษาผ่าน LINE ส่วนตัวก่อนได้
> CTA: รับสิทธิ์ตรวจฟรี →

**B) PrEP-focused**
> หัวเรื่อง: รู้จัก PrEP ยากันก่อนเสี่ยง? ปรึกษาฟรี
> เนื้อ: ตรวจ HIV + Syphilis ฟรี + ปรึกษา PrEP/PEP ส่วนตัว ผลรู้ใน 1 ชม. ที่ W Medical Hospital
> CTA: ดูรายละเอียด →

**Creative format:**
- รูปคนเดินคู่ / วิวเมือง (avoid showing genitalia, hospital corridors, lab tubes ที่ดูน่ากลัว)
- ใช้สีพาสเทล mint/forest green ตาม brand
- **ห้าม** ใช้ภาพ syringe, blood, or sad/scared faces (Meta จะ reject)

**⚠️ Meta Policy ระวัง:**
- ห้าม imply ว่าผู้ใช้ติด HIV ("ติดเชื้อหรือยัง?" ❌)
- ใช้ inclusive language — ไม่ shame, ไม่ตัดสิน
- ห้ามใช้คำว่า "AIDS" ในเนื้อหาตรง ๆ
- เลี่ยง before/after, เลี่ยง testimonials ที่ระบุชื่อ
- ใช้ภาษาเชิงบวก: "ดูแลสุขภาพ" / "รู้ก่อนสบายใจ"

---

### 4.3 CKD ตรวจไต

**Landing:** `https://roogondee.com/quiz/ckd`
**Hook:** ตรวจโปรตีนในปัสสาวะ **ฟรี** สัญญาณเริ่มต้นของโรคไต
**Voucher:** `RGD-CKD-XXXXXX` อายุ 14 วัน

**Audience:**
- เพศ: ทุกเพศ
- อายุ: **40+** (CKD เกิดมากในวัยนี้)
- Interests: diabetes, hypertension, kidney health, elderly care
- Behaviors: ผู้ดูแลผู้สูงอายุ, ครอบครัวที่มีผู้ป่วยเบาหวาน/ความดัน

**Ad Copy (Thai):**

**A) Family-led**
> หัวเรื่อง: คนในบ้านเป็นเบาหวาน/ความดัน? ตรวจไตฟรี
> เนื้อ: ตรวจโปรตีนในปัสสาวะ — สัญญาณเริ่มต้นโรคไต รู้เร็ว รักษาทัน บริการฟรีที่ W Medical Hospital
> CTA: ลงทะเบียน →

**B) Awareness-led**
> หัวเรื่อง: รู้หรือไม่? โรคไตระยะแรกไม่มีอาการ
> เนื้อ: ตรวจโปรตีนในปัสสาวะฟรี ใช้เวลาไม่นาน ผลรู้เร็ว — เริ่มดูแลก่อนสาย
> CTA: ทำแบบประเมิน →

**Creative format:**
- รูปครอบครัว 3 รุ่น / ผู้สูงอายุยิ้ม
- Soft, warm tones (avoid clinical/scary imagery)

---

## 5. Lead Form Fields (จาก quiz)

ทีมขายจะได้ข้อมูลต่อ lead:
- ชื่อ-นามสกุล (first_name required, last_name optional)
- เบอร์โทร (validated format `0XXXXXXXXX`)
- LINE ID (recommended)
- Email (optional)
- อายุ + เพศ (auto จาก quiz)
- คำตอบ quiz ทั้งหมด → **lead tier**: `urgent` / `hot` / `warm` / `cold` + `score` (0-100)
- UTM source/medium/campaign
- PDPA consent timestamp

**Lead → LINE flow ที่ทำงานอยู่แล้ว:**
1. User กรอกเสร็จ → API `/api/quiz/submit` บันทึก Supabase
2. Voucher push เข้า LINE chat user (ผ่าน Messaging API) — ต้อง Add OA `@roogondee` ก่อน
3. ทีมขาย notify ที่ LINE group `LINE_NOTIFY_GROUP_ID`

---

## 6. Compliance Checklist (Meta)

ก่อน submit ad ตรวจให้ครบ:

- [ ] ไม่มี before/after ภาพ
- [ ] ไม่ implicate user ("คุณ..."— เปลี่ยนเป็น "เรา" / "ใครก็ตาม")
- [ ] ไม่อวดอ้างผลลัพธ์เฉพาะเจาะจง (% / กิโล / วัน)
- [ ] ไม่มี testimonial ที่ระบุชื่อ-รูป
- [ ] อายุ targeting 18+ (CKD: 21+ แนะนำ)
- [ ] ไม่ target by ethnicity, religion, sexual orientation (Meta ห้ามแล้ว)
- [ ] หน้า landing มี Privacy Policy + Terms link (มีแล้วที่ footer)
- [ ] PDPA consent ก่อน submit (มีแล้วที่ quiz)

---

## 7. Budget Plan (รอบแรก 14 วัน)

| Service | Daily | 14-day | Notes |
| --- | --- | --- | --- |
| GLP-1 | 800 ฿ | 11,200 ฿ | Highest LTV — ทุ่มงบสุด |
| STD | 700 ฿ | 9,800 ฿ | Top of funnel + retarget |
| CKD | 600 ฿ | 8,400 ฿ | Niche — เริ่มน้อยก่อน |
| **Total** | **2,100** | **29,400** | + buffer creative production |

**Bid strategy:** Lowest cost (Phase 1, learning) → Cost cap 60฿/Lead (Phase 2)
**Placement:** Advantage+ (FB/IG feed + reels) ปิด Audience Network

---

## 8. Reporting

**Daily check (ทีม FB ads):**
- CPL, CTR, Frequency, Reach
- Lead delivered → Supabase count match?

**Weekly review (ผม + marketing):**
- Lead tier breakdown (urgent/hot/warm/cold) → adjust audience
- Voucher redemption rate (จาก W Medical) → measure true ROI
- Ad fatigue (Frequency > 3 → refresh creative)

---

## 9. ก่อนยิง — สิ่งที่ต้องเตรียม

- [ ] Meta Business Manager + Pixel ID (ส่งให้ผม set Vercel env)
- [ ] Page admin access ให้ทีม FB ads
- [ ] Creative assets:
  - GLP-1: 3 image + 2 video
  - STD: 3 image + 1 video (เน้น privacy/inclusive)
  - CKD: 2 image + 1 video (family theme)
- [ ] Approve ad copy 3 services
- [ ] Aggregated Event Measurement: ตั้งค่า `Lead` priority 1, `CompleteRegistration` priority 2
- [ ] iOS 14.5+ Domain verification ที่ Meta Business

---

## ภาคผนวก — Quiz funnel snapshot

**GLP-1 quiz** (8 ข้อ): BMI → goal → family_dm → symptoms → glucose_test → weight_loss_history → budget → start_when
**STD quiz** (7 ข้อ): basic → last_risk → risk_types → symptoms → test_history → interest → contact_channel
**CKD quiz** (6 ข้อ): basic → for_whom → conditions → symptoms → kidney_test_history → location

ทุก quiz จบที่ **contact form** (ชื่อ + เบอร์ + LINE ID + PDPA consent) → voucher screen.
