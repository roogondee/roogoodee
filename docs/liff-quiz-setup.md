# LIFF Quiz Setup — ควิซใน LINE แบบไม่ต้องกรอกฟอร์ม

คู่มือเปิดใช้ `/liff/quiz` — ควิซเต็มรูปแบบที่รันใน LINE ผ่าน LIFF ลูกค้าทำควิซจบแล้วกดปุ่มเดียว ระบบจะ:

1. ตรวจ id_token กับ LINE ฝั่ง server (ปลอมไม่ได้) → ได้ `line_user_id` + ชื่อโปรไฟล์จริง
2. สร้าง lead ที่**เชื่อม LINE แล้วตั้งแต่วินาทีแรก** (`source: quiz-liff`) + เข้า CRM contact
3. ออก voucher แล้ว **push เข้าแชทของลูกค้าทันที** — ไม่ต้องคัดลอกโค้ด ไม่ต้องส่งอะไรกลับ
4. ทีมขายได้ handoff card ใน LINE group พร้อมชื่อจริง และทักลูกค้าต่อในแชท OA ได้เลย

ต่างจากหน้าเว็บ (`/quiz/*`) ที่ลูกค้าต้องส่งโค้ดกลับใน OA เองก่อนถึงจะติดต่อได้

## ขั้นตอนตั้งค่า (ทำครั้งเดียว ~15 นาที)

### 1. สร้าง LINE Login channel

1. เข้า [LINE Developers Console](https://developers.line.biz/console/) → เลือก **Provider เดียวกับ OA @roogondee**
2. **Create a new channel** → ประเภท **LINE Login**
3. ตั้งชื่อ เช่น "Roogondee LIFF" → Region: Thailand → สร้าง
4. จดค่า **Channel ID** (ตัวเลข) จากแท็บ Basic settings → ใส่ Vercel env `LINE_LOGIN_CHANNEL_ID`

> ต้องเป็น channel ใหม่ประเภท LINE Login — ใช้ Channel ID ของ Messaging API channel เดิมไม่ได้ (ตรวจ id_token ไม่ผ่าน)

### 2. เพิ่ม LIFF app

1. ใน LINE Login channel → แท็บ **LIFF** → **Add**
2. ตั้งค่า:
   - **LIFF app name**: Roogondee Quiz
   - **Size**: `Full`
   - **Endpoint URL**: `https://roogondee.com/liff/quiz`
   - **Scopes**: `profile` + `openid` (ต้องติ๊ก openid ไม่งั้นไม่มี id_token)
   - **Bot link feature**: `On (Aggressive)` — ชวน add เพื่อน OA ตอนเปิดครั้งแรก ทำให้ push voucher ถึงแน่นอน
3. จด **LIFF ID** (รูปแบบ `1234567890-AbcdEfgh`) → ใส่ Vercel env `NEXT_PUBLIC_LIFF_ID`

### 3. เชื่อม OA เข้ากับ Login channel

ในแท็บ Basic settings ของ LINE Login channel → **Linked OA** → เลือก `@roogondee`
(จำเป็นสำหรับ Bot link feature ข้อ 2)

### 4. ตั้ง env บน Vercel แล้ว redeploy

| Env | ค่า |
|---|---|
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID จากข้อ 2 |
| `LINE_LOGIN_CHANNEL_ID` | Channel ID จากข้อ 1 |

`LINE_CHANNEL_ACCESS_TOKEN` (Messaging API เดิม) มีอยู่แล้ว — ใช้ push voucher

### 5. ชี้ rich menu / broadcast เข้า LIFF

URL ที่ใช้ในปุ่ม rich menu, rich message, broadcast:

- เมนูรวมทุกบริการ (มีหน้าเลือก): `https://liff.line.me/{LIFF_ID}`
- เจาะรายบริการ: `https://liff.line.me/{LIFF_ID}?service=glp1` (แทน `glp1` ด้วย `std` / `ckd` / `mens` / `women` / `mind` / `dna` / `foreign`)
- แนบ UTM เพื่อวัดผลใน funnel dashboard ได้ตามปกติ เช่น `?service=glp1&utm_source=line&utm_medium=richmenu`

ตั้ง rich menu ได้ที่ [LINE Official Account Manager](https://manager.line.biz/) → Rich menu → Action type **Link** → วาง URL ด้านบน

## ทดสอบ

1. เปิดลิงก์ `https://liff.line.me/{LIFF_ID}?service=glp1` จากมือถือที่มี LINE
2. ทำควิซจนจบ → หน้าผลควรขึ้นปุ่ม "รับ voucher เลย — ส่งเข้าแชท LINE นี้" (ถ้าขึ้นข้อความแบบเว็บปกติ = LIFF init ไม่ผ่าน เช็ค env)
3. กดรับ → voucher ต้องเด้งเข้าแชท OA ภายใน 2-3 วินาที + LINE group ทีมขายได้ card ที่มีชื่อโปรไฟล์จริง
4. เช็ค `/admin` → lead ใหม่ `source: quiz-liff` มี `line_user_id` ครบ
5. กดรับซ้ำ / เปิดใหม่แล้วรับอีกรอบ → ต้องได้โค้ดเดิม (dedup ต่อ userId ต่อบริการ)

## Fallback behavior

- เปิด `/liff/quiz` จากเบราว์เซอร์ปกติ (ไม่ใช่ใน LINE) → ควิซทำงานเหมือนหน้าเว็บ: ออก voucher ผูก session แล้วให้ส่งโค้ดใน OA เอง
- `LINE_LOGIN_CHANNEL_ID` ไม่ได้ตั้ง / LINE API ล่ม → เหมือนกัน ตกลงมาที่ flow ปกติ ไม่ block ลูกค้า
- SDK โหลดไม่ขึ้นเกิน 5 วินาที → เริ่มควิซแบบไม่เชื่อม LINE

## หมายเหตุความปลอดภัย

- Server ไม่เชื่อ userId ที่ browser ส่งมา — ตรวจ `id_token` กับ `https://api.line.me/oauth2/v2.1/verify` ทุกครั้งก่อนเชื่อม lead
- Safety gate ของ `mind` คงเดิม: tier urgent → แจ้งทีมแบบ crisis + push ข้อความสายด่วน 1323 เข้าแชทลูกค้าโดยตรง (ดีกว่า flow เว็บที่ push ไม่ได้)
