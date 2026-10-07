# Meta Pixel + Conversions API (CAPI) — setup

เป้าหมาย: ให้ Meta เห็น "quiz complete" (มาตรฐาน = `CompleteRegistration`) เป็น
conversion จริง เพื่อสลับ ad set จาก optimize Landing Page Views →
Conversions ได้ ซึ่งจำเป็นเป็นพิเศษกับ funnel ของเราเพราะ quiz จบใน LIFF
(LINE in-app browser) ที่ client pixel แทบไม่มีโอกาสยิง — CAPI ฝั่ง server
คือสัญญาณหลัก ไม่ใช่ตัวเสริม

## สิ่งที่โค้ดทำแล้ว (PR นี้)

- `src/lib/meta-capi.ts` — ส่ง `CompleteRegistration` + `Lead` เข้า
  `graph.facebook.com/{pixel}/events` หลังออก voucher สำเร็จ ทั้งสอง endpoint:
  - `/api/quiz` (form path — มีเบอร์โทร/อีเมล → match quality สูง)
  - `/api/quiz/claim-line` (LIFF path — ไม่มีเบอร์ → match ด้วย fbc + IP + UA)
- Dedup กับ client: `event_id` = voucher code ทั้งสองฝั่ง (client `fbq(...,
  { eventID })` ใน `QuizRunner.fireConversionEvents`)
- Attribution ข้าม LINE: `QuizGateActions` ส่ง `fbclid`/`ttclid` ต่อเข้า LIFF
  URL, `QuizRunner` เก็บเป็นคุกกี้ 30 วัน แล้วส่ง `fbc`/`fbp` มากับ payload
- PDPA: CAPI ยิงเฉพาะหลัง lead ถูกสร้างด้วย `consent_pdpa=true`
- mens แยก pixel ตามนโยบายเดิมของ `Pixels.tsx`/`tiktok-events.ts` — ถ้าไม่ตั้ง
  pixel ของ mens เอง เหตุการณ์ mens จะไม่ยิงอะไรเลย

## ขั้นตอนที่ต้องทำเอง (ครั้งเดียว)

1. **สร้าง Pixel (dataset)**: Meta Events Manager → Connect data → Web →
   ตั้งชื่อ เช่น `Roogondee Web` → ได้ Pixel ID (ตัวเลข ~15-16 หลัก)
   - App "RooGonDee AutoPost" (1840096433337980) ไม่เกี่ยวกับขั้นนี้ —
     pixel ผูกกับ Business ไม่ใช่ app
2. **สร้าง CAPI token**: ใน Events Manager → Settings ของ pixel นั้น →
   Conversions API → "Generate access token"
3. **ตั้ง env ใน Vercel** (Production):
   - `NEXT_PUBLIC_META_PIXEL_ID` = Pixel ID (ใช้ทั้ง client pixel และ CAPI)
   - `META_CAPI_ACCESS_TOKEN` = token จากข้อ 2 (server-only ห้ามมี NEXT_PUBLIC)
   - ชั่วคราวตอนทดสอบ: `META_CAPI_TEST_EVENT_CODE` = โค้ดจากแท็บ Test Events
     (ลบออกเมื่อขึ้นจริง ไม่งั้น event ไม่เข้ารายงานปกติ)
4. **ทดสอบ**: เปิดแท็บ Test Events → ทำ quiz จริงจนได้ voucher →
   ต้องเห็น `CompleteRegistration` + `Lead` โผล่ (server) และถ้าเปิดผ่านเว็บ
   ปกติ+กดรับ PDPA จะเห็นคู่ browser/server ถูก merge (Deduplicated)
5. **ใน Ads Manager**: พอ event เริ่มไหล ให้แก้ ad set ของแคมเปญ
   `RGD_*_Quiz_Traffic_Aug2026` จาก optimize Landing Page Views →
   **Conversions / Maximise conversions** เลือก event `CompleteRegistration`
   - อย่ารีบสลับวันแรก — ให้มี event สะสมพอ (แนวปฏิบัติ ~50/สัปดาห์/ad set)
     ไม่งั้น delivery จะแกว่ง ระหว่างนั้น LPV ยังใช้ได้
6. (แนะนำ) Events Manager → เปิด **Aggregated Event Measurement** ranking ให้
   `CompleteRegistration` สูงกว่า `Lead` สำหรับ iOS

## หมายเหตุ

- คุกกี้ `_fbc`/`_fbp` ไม่มีทางข้ามจากเว็บ → LINE browser ได้เอง ค่า fbc ฝั่ง
  LIFF จึงถูกประกอบใหม่จาก `fbclid` ใน URL (`fb.1.<ts>.<fbclid>`) ซึ่ง Meta
  รองรับอย่างเป็นทางการ
- ถ้าอนาคตแยก pixel ให้ mens: ตั้ง `NEXT_PUBLIC_META_PIXEL_ID_MENS` +
  `META_CAPI_ACCESS_TOKEN_MENS`
- อย่าสับสนกับ `docs/fb-ads-brief.md` (Lead Ads ในตัว FB เอง) — ไฟล์นี้คือ
  conversion tracking ของ funnel เว็บ/LIFF
