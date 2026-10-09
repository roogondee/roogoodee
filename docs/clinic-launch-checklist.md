# เช็กลิสต์เปิดแคมเปญ `/clinic` (Google Ads + Meta)

ทำตามลำดับ ติ๊กทีละข้อ ถ้าข้อไหนไม่ผ่านอย่าเพิ่งเปิดแคมเปญ
รายละเอียดข้อความและคีย์เวิร์ด: `docs/clinic-google-ads.md`, `docs/clinic-meta-ads.md`
คู่มือเคาน์เตอร์: `docs/counter-sop.md`

## 0. สิ่งที่ทำเสร็จแล้วในระบบ (ไม่ต้องทำซ้ำ)

- หน้า `/clinic` ขึ้นเว็บจริง อยู่ใน sitemap และลิงก์จาก footer
- event `clinic_call_click`, `clinic_line_click`, `clinic_directions_click` ถูกส่งเข้า Google Ads
  (`ads_conversion_Contact_Us_1`) และ Meta (`Contact`, `FindLocation`) แล้วในโค้ด
- รหัสอ้างอิง `CL-XXXXX` ออกให้ผู้เข้าชมทุกคน พร้อมรับ gclid / `_fbc` / `_fbp` / utm
- ตาราง `site_ref_codes` และการนับคนมาถึงรพ. (ผ่านใบรับรองหรือ `/admin/redeem`) ใช้งานได้
- ค่าโฆษณาที่ชื่อแคมเปญมีคำว่า `CLINIC` จะเข้า `/admin/growth` ในบริการ `/clinic (คลินิกใกล้ฉัน)`

## 1. ต้องยืนยันกับ W Medical ก่อน (ทำเป็นอันดับแรก)

- [ ] **เวลาเปิด-ปิดจริง** ตอนนี้ยืนยันได้แค่ "เปิดทุกวัน" ถ้าจะเปิดแคมเปญที่ตั้งตารางเวลา
      ต้องรู้ช่วงที่มีคนรับโทรศัพท์ เพราะ conversion หลักคือการโทร
- [ ] **สิทธิ์การรักษาที่รับ** (ประกันสังคม บัตรทอง ประกันเอกชน) จนกว่าจะยืนยัน ห้ามพูดถึงในโฆษณา
      และคงคำว่า `ประกันสังคม`, `บัตรทอง` ไว้เป็น negative
- [ ] **ผู้ดูแล Google Business Profile ของโรงพยาบาล** ขอให้กดอนุมัติการเชื่อมกับบัญชี Google Ads
      (ใช้แสดงที่อยู่และระยะทางในโฆษณา) และกับ Page ของ Meta ถ้าต้องการปุ่มนำทาง
- [ ] ยืนยันว่าทีมรับโทรศัพท์ที่ 034-110-988 รู้ว่ามีโฆษณาเปิดแล้ว และถามรหัสอ้างอิงตาม SOP

## 2. ค่าตั้งค่าในระบบ (Vercel)

- [ ] `WMEDICAL_BRIDGE_SECRET` ตั้งแล้ว และ `/admin/employers` ไม่ขึ้นกล่องเตือนสีเหลือง
      (ถ้ายังไม่ตั้ง รหัสที่ใส่ในระบบออกใบรับรองจะไม่ถูกนับเป็นคนมาจริง)
      หมายเหตุ: ไม่ใช่ตัวเดียวกับ `WMEDICAL_WEBHOOK_SECRET` ซึ่งเป็นของการเชื่อมระบบโรงพยาบาลกับ lead
- [ ] `NEXT_PUBLIC_GOOGLE_ADS_ID` (`AW-…`) ตั้งแล้ว ไม่งั้น event ไม่ถูกส่งเข้าบัญชี Ads
- [ ] `NEXT_PUBLIC_META_PIXEL_ID` ตั้งแล้ว และ `META_CAPI_ACCESS_TOKEN` ตั้งแล้ว
      (ตรวจใน Meta Events Manager ว่ามี Pixel จริง ถ้ายังไม่มีต้องสร้างก่อน ผมสร้างแทนไม่ได้)
- [ ] `ADS_OFFLINE_EXPORT_USER` / `ADS_OFFLINE_EXPORT_PASSWORD` ตั้งแล้ว (สำหรับฟีดอัปโหลดผลคนมาถึงรพ.)

## 3. Google Ads

- [ ] สร้างแคมเปญ `RGD_CLINIC_Search_Oct2026` (Search ไม่ใช่ Smart) ตามค่าในตารางของ `docs/clinic-google-ads.md`
- [ ] พื้นที่: รัศมี 10–15 กม. รอบ 13.6286116, 100.3551941 เลือก "Presence: people in or regularly in"
- [ ] ใส่ keywords 3 กลุ่ม (phrase match) และ negative keywords ครบตามเอกสาร
- [ ] ใส่ negative "ใกล้ฉัน" กลุ่ม 1 และ 2 ในแคมเปญ `/advice` เพื่อไม่ให้แย่งกัน
- [ ] Tracking template: `{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&gclid={gclid}`
- [ ] สร้าง RSA จากหัวข้อและคำบรรยายในเอกสาร (ผ่านเกณฑ์ความยาวแล้ว) ปักหัวข้อที่ 1
- [ ] เพิ่ม Call asset 034-110-988 เปิด call reporting และ sitelinks 4 ลิงก์
- [ ] เพิ่ม Location asset (ต้องรอข้อ 1 ผ่านก่อน)
- [ ] Conversion action `Contact_Us_1`: ตั้ง **Count = One**
- [ ] Conversion action `RGD Patient Visit` (นำเข้าออฟไลน์): ตั้ง scheduled upload จาก
      `https://roogondee.com/api/ads/offline-conversions` ตาม `docs/growth-loops.md` ข้อ 1
      ตั้งเป็น Secondary ก่อน จนกว่าจะมีข้อมูลอย่างน้อย 15–30 ครั้งจึงเปลี่ยนเป็น Primary
- [ ] Bidding: Maximize clicks 2 สัปดาห์แรก
- [ ] งบเริ่ม ~100 บาท/วัน ตั้งวันที่เริ่มหลังผ่านการทดสอบในข้อ 5

## 4. Meta (Facebook / Instagram)

- [ ] สร้างแคมเปญ `RGD_CLINIC_Traffic_Oct2026` ตามตารางใน `docs/clinic-meta-ads.md` 2 ad set
- [ ] ใช้ Page ที่เป็นเจ้าของโดย Business "Roogondee-รู้งี้" ตรวจว่าบัญชีโฆษณามีสิทธิ์ลงโฆษณาในนาม Page นั้น
      (เรื่อง token ของ autopost ไม่เกี่ยวกับการลงโฆษณา แต่ถ้าสิทธิ์บน Page ไม่พอ ให้ Business admin แก้ก่อน)
- [ ] ใส่ URL parameters: `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`
- [ ] ภาพและข้อความตรวจตาม red lines (ไม่มีราคา ไม่มีเวลาเปิด ไม่มีสิทธิ์รักษา ไม่พูดถึงโรคของผู้ชมโดยตรง)
- [ ] ตรวจ Events Manager ว่าเห็น `PageView` จาก `/clinic` และ `Contact` เมื่อกดปุ่ม (ต้องกดยอมรับคุกกี้ก่อน)

## 5. ทดสอบก่อนเปิดจริง (ทำบนมือถือ 1 เครื่อง)

เปิด `https://roogondee.com/clinic?gclid=TEST-clinic-001&utm_source=google&utm_medium=cpc`

- [ ] หน้าโหลดเร็ว เห็นปุ่มโทร / นำทาง / LINE และ **รหัส `CL-XXXXX` ใต้ปุ่ม**
- [ ] กดโทร ต้องเปิดแอปโทรศัพท์ที่ 034-110-988
- [ ] กดนำทาง ต้องเปิด Google Maps ปลายทางโรงพยาบาล
- [ ] กด LINE ต้องเปิดแชท @roogondee พร้อมข้อความมีรหัส `CL-XXXXX` ส่งได้ และได้ข้อความตอบกลับ
      (ข้อความนี้สร้าง lead ทดสอบ และแจ้งกลุ่มเซลล์ บอกทีมก่อนว่าเป็นการทดสอบ)
- [ ] GA4 → Realtime เห็น event `clinic_call_click`, `clinic_directions_click`, `clinic_line_click`
- [ ] ที่ `/admin/redeem` พิมพ์รหัสนั้น กด "บันทึกว่าผู้รับบริการมาแล้ว" ได้ข้อความ ✓ บันทึกแล้ว
      และกดซ้ำได้ ⚠ บันทึกไปแล้ว
- [ ] `/admin/growth` เลือก 7 วัน เห็นแถว `/clinic (คลินิกใกล้ฉัน)`

**ล้างข้อมูลทดสอบหลังจบ** (ไม่งั้นนับเป็นคนมาจริงในรายงาน): ใน Supabase ลบแถวที่ `gclid` ขึ้นต้นด้วย `TEST`
ใน `site_ref_codes` และ lead ที่สร้างจากแชททดสอบ (gclid ปลอมจะไม่ถูกนับโดย Google แต่ยังเข้ารายงานในระบบ)

```sql
-- ดูก่อนลบ
select ref_code, lead_id, visited_at from public.site_ref_codes where gclid like 'TEST%';
select id, first_name, note from public.leads where gclid like 'TEST%';
-- แล้วลบเฉพาะแถวที่ดูแล้วว่าเป็นของทดสอบ
```

## 6. สัปดาห์แรกหลังเปิด

- [ ] ทุกวัน: ดู Search terms report ของ Google เพิ่ม negative ทันทีถ้าเจอความงาม ทันตกรรม สัตว์ ฯลฯ
- [ ] ทุกวัน: ถามเคาน์เตอร์ว่ามีคนแจ้งรหัสกี่ราย (ถ้า 0 ตลอดสัปดาห์ ให้ตรวจว่าเคาน์เตอร์ถามจริงไหม)
- [ ] วันที่ 7: ดู `/admin/growth` เทียบ Google กับ Meta ว่าบริการ `/clinic` แหล่งไหนได้คนมาจริงถูกกว่า
- [ ] วันที่ 14: ถ้ามี `Contact` ถึง ~15 ครั้งแล้ว เปลี่ยน Google เป็น Maximize conversions
      และถ้า Meta นับ `Contact` ได้ 50 ครั้ง/สัปดาห์ เปลี่ยน optimize เป็น `Contact`

**หยุดหรือทบทวนแคมเปญทันทีถ้า:** (ตัวเลขด้านล่างเป็นจุดเริ่มต้น ปรับตามงบจริง)
- ใช้งบเกิน 7 วันแล้วไม่มีทั้งการโทร LINE และนำทางเลย (น่าจะเป็นปัญหาการติดตั้ง event หรือคีย์เวิร์ดไม่ตรง)
- Search terms ส่วนใหญ่เป็นคำที่เราไม่ให้บริการ
- มีคนร้องเรียนว่าโฆษณาบอกเรื่องที่โรงพยาบาลไม่ได้ทำ (เวลา ราคา สิทธิ์)
- คอมเมนต์ใต้โฆษณา Meta มีข้อมูลทางการแพทย์หรือข้อมูลส่วนตัว ให้ซ่อนและตอบให้ทัก LINE
