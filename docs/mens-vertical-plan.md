# Men's Health Vertical — Implementation Plan

Vertical ที่ 5 ของ roogondee.com — สุขภาพชายวัย 40+ (Andropause + Sexual Wellness)
อ้างอิง CONTEXT.md ที่ส่งจาก W Medical (2026-04-28) + decisions จากการคุยรอบนี้

## สรุป Decisions

| ประเด็น | ตัดสิน |
|---|---|
| Voucher framing | "ปรึกษาแพทย์ฟรี + ตรวจประเมิน" (ห้ามคำว่า "แจกยา") |
| Bundle ของแจก | ปรึกษาแพทย์ 15 นาที + InBody/วัดสัดส่วน + AI Health Report (ต้นทุน รพ. ~200฿/เคส แทน Total T 600-1,200฿) |
| Quiz | 6 step, tap-only ทั้งหมด (ไม่ต้องพิมพ์ตัวเลข) |
| ADAM/IIEF-5 ละเอียด | ตัดออกจาก screening — ให้แพทย์ถามตอน consult |
| Stock images | curated 30 รูป แทน FLUX gen (ลดความเสี่ยง ad policy) |
| Draft mode เดือนแรก | mens posts เข้า DB เป็น `status='draft'` รอ admin + W Medical sign-off ก่อน publish |
| Frequency | 1 บท / 4 วัน เท่ากับ vertical อื่น |
| TikTok auto | defer (รอ Pillar A ของ GLP-1 ก่อน) |
| Compliance gate | system prompt + forbidden-words linter + retry (3 ครั้ง) |
| Sub-routes | defer ถึง phase 2 (`/mens/andropause`, `/mens/sexual-wellness`) |

## Quiz Design (6 step tap-only)

```
1. age_range (radio)         < 40 / 40-49 / 50-59 / 60+
2. comorbid (multi)          DM/HT/dyslipidemia/หัวใจ*/มะเร็งต่อมลูกหมาก*/ไม่มี
                             (* = red flag → refer ออก)
3. symptoms (multi)          อ่อนเพลีย/อารมณ์แปรปรวน/มวลกล้ามเนื้อลด/นอนไม่หลับ/
                             สมรรถภาพหรือความต้องการลดลง/ไม่มี
4. lifestyle (multi)         นอนน้อย/ไม่ออกกำลัง/ดื่ม-สูบ/เครียด/น้ำหนักขึ้นเร็ว/ไม่มี
5. interest (radio)          สุขภาพรวม / lifestyle / สมรรถภาพ / ฮอร์โมน / ยังไม่แน่ใจ
6. start_when (radio)        ทันที / 1 เดือน / 1-3 เดือน / ไม่แน่ใจ
```

จำนวน tap รวม: 8-13 tap | เวลา: 30-45 วินาที

### Scoring Logic

- Red flag (heart/prostate cancer) → `refer = true`, ไม่ออก voucher
- ADAM proxy = symptoms count (sexual symptom = +2)
- Metabolic comorbid (DM/HT/dyslipidemia) = +2
- Age 40-49 +1, 50-59 +2, 60+ +3
- Readiness `now` = +3, `1m` = +2
- Tier: urgent (sexual + now) | hot (≥9) | warm (≥5) | cold

## Compliance Framework

### Forbidden Words (linter)
```
ชื่อยา:    Viagra, Cialis, Levitra, sildenafil, tadalafil, vardenafil,
          Nebido, Sustanon, Testogel, AndroGel
คำเกินจริง: รักษาหายขาด, การันตี, 100%, ดีที่สุด, อันดับ 1, ปลอดภัย 100%
คำเชิงเพศ: เพิ่มขนาด, ขยายขนาด, อึด, ทน X นาที, แข็งทน, ปลุกเซ็กส์
```

### Required Phrases (ต้องมีในบทความ mens)
- "ภายใต้การดูแลของแพทย์" หรือใกล้เคียง
- Disclaimer ท้ายบทความ + footer

### Wording ที่ใช้ได้ (Voucher / Programs)
- "ปรึกษาแพทย์เฉพาะทางฟรี"
- "ตรวจประเมินสาเหตุ"
- "ภายใต้การดูแลของแพทย์ W Medical Hospital"
- "ค่ายาและการรักษาตามดุลยพินิจของแพทย์"
- "ผลลัพธ์แตกต่างกันในแต่ละบุคคล"

## File Changes (PR 1 — Mens Core)

### Frontend
```
[NEW]  src/components/pages/MensClient.tsx
[NEW]  src/app/mens/page.tsx
[NEW]  src/app/quiz/mens/page.tsx
[NEW]  src/lib/quiz/mens-scoring.ts (หรือ inline ใน scoring.ts)
[EDIT] src/types/index.ts                +'mens' Service + SERVICES entry
[EDIT] src/lib/quiz/voucher.ts            +mens: 'MENS' prefix
[EDIT] src/lib/quiz/questions.ts          +MENS_QUESTIONS
[EDIT] src/lib/quiz/scoring.ts            +case 'mens'
[EDIT] src/lib/quiz/insight.ts            +mens branch
[EDIT] src/lib/quiz/summary.ts            +mens branch
[EDIT] src/components/pages/HomeClient.tsx  +5th card + 4th voucher
[EDIT] src/components/ui/FooterFull.tsx     +mens link
[EDIT] src/lib/i18n/locales/th.ts (+9 ภาษา) +mens keys (TH fallback)
[EDIT] src/app/sitemap.ts                  +/mens, /quiz/mens
```

### Content Pipeline (Python)
```
[NEW]  scripts/compliance.py              forbidden words checker
[EDIT] scripts/gen_content_plan.py        +mens cycle + compliance rules
[EDIT] scripts/autopost.py                +mens labels + draft mode + check
[EDIT] scripts/fb_caption.py              +mens hashtags + compliance gate
[EDIT] scripts/seo_keywords.py            +Pillar A keywords
[EDIT] scripts/line_broadcast.py          +mens label
[EDIT] scripts/tiktok_scripts.py          +guard rail (defer activation)
```

### Stock Images
```
[NEW]  public/mens-stock/*.jpg (30 รูป curated)
       ผู้ชาย 40-55 lifestyle, office, outdoor, no shirtless, no couples
```

## Pending จาก W Medical (block production)

- [ ] ราคา consultation + program tiers (basic/standard/comprehensive)
- [ ] แพทย์ผู้รับเคส (ชื่อ + เลขใบประกอบ)
- [ ] ผู้รับผิดชอบสถานพยาบาล (โชว์ footer /mens ตามมาตรา 38 พ.ร.บ.สถานพยาบาล)
- [ ] Telemedicine consent flow
- [ ] Sign-off batch บทความ 8 บท
- [ ] Cut-off Low T (ng/dL) สำหรับใช้ในบทความ
- [ ] Contraindication list ที่ต้อง refer ออก
- [ ] ขอใบอนุญาตโฆษณา สบส. (ถ้าต้อง)

## Risk Matrix

```
เขียนโค้ด deploy staging                = ปลอดภัย ทำได้เลย
เปิด production ไม่มี รพ. sign-off       = ห้าม (legal)
เปิด production มี sign-off แต่ติด pixel = ระวัง (อาจกระทบ ad ของเดิม)
ยิงโฆษณา Pillar B (ED) บน Meta/TikTok    = อย่าทำ (ad ban risk)
แจกยา ED ตรงๆ                          = ผิด พ.ร.บ.ยา 2510 ม.90(4)
```

## Future Enhancements (PR 2-3 — หลัง mens core)

### Critical (block scaling)
1. Booking / นัดหมายอัตโนมัติ (Cal.com integration)
2. Hospital Dashboard / Doctor Portal (`/admin/hospital`)
3. Outcome / Conversion Tracking (milestone updates: contacted → booked → visited → treatment)
4. Telemedicine Platform (Doxy.me เริ่มต้น หรือ on-site only)

### High-value
5. AI Chatbot fine-tuned สำหรับ mens (knowledge base + safe escalation)
6. Long-term Follow-up automation (3mo/6mo cadence สำหรับ TRT)
7. Email automation (Resend/Postmark drip)
8. Pixel separation per service (ลด risk ban ข้าม vertical)
9. A/B Testing infra (GrowthBook)
10. Voucher Fraud Prevention (rate limit per phone, OTP)

### Nice-to-have
11. Multilingual content auto-translate (Claude → 9 ภาษา)
12. Symptom Tracker / Progress Journal
13. User Account / Patient Portal (LINE Login)
14. Audio / Voice content (TTS)
15. Affiliate / Referral program
16. WhatsApp / Instagram autopost
17. Google Business Profile autopost
18. Meta Conversion API (offline conversions)
19. Webinar / Event registration
20. Monitoring / Alerting (Sentry, BetterStack)

## Roadmap

### Sprint 1 (week 1-2) — Mens Core
- Implement diff frontend + Python ทั้งหมด
- Stock images ขึ้น 30 รูป
- Quiz e2e test
- Deploy staging → UAT
- Generate batch 8 บทความ → draft → ส่ง รพ.

### Sprint 2 (week 2-3) — รอ รพ.
- W Medical review batch + sign-off
- เคาะราคา programs / lab / consultation
- เซ็น MOU compliance review cycle
- Production deploy ทันทีที่ sign-off เสร็จ

### Sprint 3 (week 3-4) — Operational backbone
- Booking integration
- Hospital dashboard
- Outcome tracking

### Sprint 4 (week 4+) — Marketing safety
- Pixel separation
- AI chatbot mens-tuned
- Open FB autopost (organic) — Pillar A only

## Compliance Reference

- พ.ร.บ.ยา 2510 ม.88, 89, 90(4) — ห้ามโฆษณายาควบคุม / แจกยาเป็นรางวัล
- พ.ร.บ.สถานพยาบาล 2541 ม.38, 62 — ต้องมีผู้รับผิดชอบ + ห้ามโฆษณาเกินจริง
- ข้อบังคับแพทยสภาว่าด้วยจริยธรรม (ฉบับโฆษณา) — ห้ามรีวิว / รับรองผล
- PDPA 2562 ม.26 — ข้อมูลสุขภาพต้องมี explicit consent
- ประกาศ สบส. โฆษณาสถานพยาบาล — ขออนุญาตในบางกรณี
