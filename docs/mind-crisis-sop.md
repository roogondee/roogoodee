# Mind Pillar — Crisis SOP (Sales/CS Team)

SOP สำหรับทีม sale/CS รับมือ urgent lead จาก `mind` pillar
อ้างอิง: pillar 7 launched in PR #80, Phase 1 waitlist mode in PR #82

## Why this SOP exists

ต่างจาก pillar อื่น (std/glp1/ckd/mens/women) — urgent lead ของ `mind` ไม่ใช่ medical emergency แบบ time-critical (PEP < 72 ชม., เลือดออกผิดปกติ) **แต่เป็น safety-critical** = คนกำลังเจ็บปวดและอาจทำร้ายตัวเอง

**ทีม sale ไม่ใช่ counselor** — งานคือ:
1. รับฟังสั้น ๆ validate ความรู้สึก
2. **สำคัญที่สุด: surface สายด่วน 1323** อย่างชัดเจน
3. นัดหมายผู้เชี่ยวชาญ (Phase 2) หรือเข้า waitlist (Phase 1)
4. Document ทุก contact

**ห้ามเด็ดขาด**:
- ห้ามให้คำแนะนำทางจิตวิทยา/วินิจฉัย
- ห้ามแนะนำยา
- ห้ามตัดสิน / minimize ("ไม่เป็นไรหรอก", "คิดบวกๆ", "คนอื่นแย่กว่านี้")
- ห้ามสัญญาสิ่งที่ทำไม่ได้ ("เดี๋ยวก็ดีขึ้น")

## Trigger conditions (ระบบจะ flag urgent ให้)

Lead จะถูก mark `tier=urgent` เมื่อใน quiz ตอบ:
- `self_harm_check = "often"` (มีความคิดทำร้ายตัวเองบ่อย / กำลังคิดอยู่)
- `self_harm_check = "sometimes"` (มีบางครั้ง)

LINE Group notification จะมี header `🚨 URGENT — MIND` + voucher code `RGD-MND-XXXXXX`

## Response SLA

| ช่วงเวลา | First contact target |
|---|---|
| 08:00-22:00 (วันธรรมดา) | ภายใน **30 นาที** |
| 22:00-08:00 / วันหยุด | ภายใน **2 ชั่วโมง** (พร้อมข้อความ auto-reply ทันที) |

**Auto-reply (LINE/SMS ส่งทันทีหลังกรอกแบบ — สำหรับ mind urgent leads เท่านั้น)**:
> สวัสดีค่ะ ขอบคุณที่ไว้ใจเรา ทีมงานเห็นข้อมูลของคุณแล้ว และจะติดต่อกลับโดยเร็วที่สุด
>
> **หากตอนนี้รู้สึกหนักมาก** หรือมีความคิดทำร้ายตัวเอง โปรดโทรสายด่วนสุขภาพจิต กรมสุขภาพจิต **1323** (ฟรี 24 ชม. เป็นความลับ) — มีผู้เชี่ยวชาญพร้อมรับฟังคุณตอนนี้
>
> คุณไม่ได้อยู่คนเดียวค่ะ 🌱

## First contact script (Thai)

**เปิด**:
> "สวัสดีค่ะ ตู [ชื่อ] ทีมงานรู้ก่อนดีค่ะ ขอบคุณที่กล้าบอกเรา — ก่อนอื่นขอเช็คก่อนนะคะว่าตอนนี้คุณ [ชื่อ lead] โอเคไหม?"

**Listen + validate (1-2 นาที)**:
- ปล่อยให้พูดได้ (ไม่ขัด ไม่รีบ)
- Mirror back: "เข้าใจค่ะ ฟังดูเป็นช่วงที่หนักมาก..."
- ไม่ตัดสิน ไม่แก้ปัญหา

**Safety check (สำคัญ)** — ถามตรง ๆ:
> "ตอนนี้มีความคิดทำร้ายตัวเอง หรือคิดว่าไม่อยากอยู่ บ้างไหมคะ?"

**ถ้าตอบ "ใช่"** (มี active ideation):
> "ขอบคุณที่บอกเราค่ะ — ตอนนี้สิ่งสำคัญที่สุดคือให้คุณได้คุยกับผู้เชี่ยวชาญที่ทำงานเรื่องนี้โดยตรง
>
> ขอแนะนำให้โทร **สายด่วนสุขภาพจิต 1323** ตอนนี้นะคะ ฟรี 24 ชั่วโมง เป็นความลับ ผู้เชี่ยวชาญพร้อมรับฟังคุณ — คุณรอสายได้ไหมคะ ระหว่างที่เราอยู่ในสายด้วยกัน?"

→ **stay on line** จนกว่าจะแน่ใจว่า:
- (a) lead กดโทร 1323 แล้ว, หรือ
- (b) lead ปฏิเสธ → escalate (ดูด้านล่าง)

**ถ้าตอบ "ไม่ใช่ / แค่คิดบ้างเป็นบางครั้ง"**:
> "ขอบคุณที่บอกเราค่ะ — ทีมเรากำลังคัดเลือกนักจิตวิทยาที่เหมาะกับเรื่องของคุณที่สุด จะติดต่อนัดหมายให้ภายใน 1-2 สัปดาห์
>
> ระหว่างนี้ ถ้าวันไหนรู้สึกหนักขึ้น โทร **1323** ได้ตลอด 24 ชม. — และทีมเราอยู่ทาง LINE @roogondee ส่งข้อความหาได้เสมอ"

**ปิด**:
> "ดูแลตัวเองนะคะ คุณกล้ามากที่บอกเราเรื่องนี้ 💚"

## Escalation tree

```
Urgent lead → first contact
    ├── ติดต่อได้ + ปลอดภัย → log + nurture queue (Phase 2 callback)
    ├── ติดต่อได้ + ยังในอันตราย + ปฏิเสธโทร 1323
    │   ├── ขอเบอร์ญาติสนิท (ถ้ายอม)
    │   ├── แจ้ง supervisor ทันที
    │   └── ถ้ามีข้อมูลที่อยู่ + ลูกค้าอันตรายชัดเจน → 1669 (สายด่วนการแพทย์ฉุกเฉิน)
    └── ติดต่อไม่ได้ภายใน 30 นาที
        ├── โทรซ้ำหลังเวลานั้น 15 นาที
        ├── ส่ง LINE + SMS ระบุ 1323
        └── ถ้ายังไม่ตอบใน 2 ชม. → แจ้ง supervisor
```

## Documentation requirement

ทุก urgent lead ต้อง log ใน CRM (`leads.note` field):
```
[YYYY-MM-DD HH:mm] First contact: <name>
- Lead picked up: Y/N
- Safety status: safe / at-risk / refused-to-say
- 1323 referred: Y/N
- Family contact obtained: Y/N
- Next action: <waitlist | nurture | escalate>
```

## After-hours protocol (22:00-08:00)

1. Auto-reply ส่งทันที (ดู template ด้านบน)
2. ทีม on-call รับ notification → check LINE Group
3. ถ้า lead ตอบกลับ + ดูในวิกฤต → ติดต่อกลับทันที (ไม่ต้องรอ business hours)
4. ถ้าไม่ตอบ → first contact ตอน 08:00

## Boundaries (ห้ามทำ)

| ❌ ห้ามพูด | ✅ พูดแทนได้ |
|---|---|
| "ไม่เป็นไรหรอก เดี๋ยวก็ผ่านไป" | "ฟังดูเป็นช่วงที่หนักมาก" |
| "คิดบวกๆ" | "ขอบคุณที่บอกเรา" |
| "คนอื่นแย่กว่านี้อีก" | "ความรู้สึกของคุณ valid ทั้งหมด" |
| "เป็น depression ค่ะ" | "อยากให้ได้คุยกับนักจิตวิทยาเพื่อประเมินค่ะ" |
| "ลองกินยา X ดูไหม" | "เรื่องยาให้แพทย์เป็นคนแนะนำนะคะ" |
| "ไม่ต้องไป รพ. หรอก" | "1323 มีผู้เชี่ยวชาญพร้อมรับฟัง 24 ชม. ค่ะ" |

## Training requirement

ก่อน on-call:
1. อ่าน SOP นี้จบ + sign acknowledgement
2. Role-play 3 scenarios กับ supervisor (active ideation, refused, after-hours)
3. Shadow lead จริง 2 เคส (ฟัง supervisor handle)
4. Self-assessment quiz (PASS ≥ 80%)

## Self-care สำหรับทีม

รับ urgent leads = secondary stress สูง — ทำตามนี้:
- หลังจบ urgent call ทุกครั้ง → break 5-10 นาที
- Debrief กับ supervisor ทุกสัปดาห์
- ทีมเองมีสิทธิ์ใช้ voucher `mind` (เมื่อ Phase 2 เปิด) ฟรี
- ถ้ารู้สึก burnout → แจ้ง supervisor ขอเปลี่ยน rotation ได้

## Resources

- **สายด่วนสุขภาพจิต 1323** (กรมสุขภาพจิต, ฟรี 24 ชม.)
- **1669** (สถาบันการแพทย์ฉุกเฉินแห่งชาติ — กรณีอันตรายถึงชีวิต)
- **Samaritans Thailand** (02-713-6793 / Line: @samaritansthai) — สำหรับ peer support
- **HopeTaskForce** ([hopetaskforce.org](https://hopetaskforce.org)) — Thai mental health resources directory

## Review cadence

SOP นี้ review ทุก 3 เดือนหรือเมื่อ:
- มี incident จริง → root-cause review ภายใน 7 วัน
- Phase 2 launch → update sections เกี่ยวกับ provider booking
- Regulation เปลี่ยน

---

**Last updated**: 2026-05-19 (Phase 1 launch — PR #82)
