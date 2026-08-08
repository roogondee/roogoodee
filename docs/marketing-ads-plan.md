# แผนการตลาด & ยิง Ads — ดึงลูกค้าเข้า W Medical Hospital

**วันที่:** 2026-07-31 — **แก้ไข 2026-08-08 (ดูข้อ 0 ก่อน)**
**สถานะ:** แผนปฏิบัติการ 90 วัน (อิงข้อมูลจริงจากบัญชีโฆษณา ไม่ใช่สมมุติฐาน)
**บัญชีโฆษณา:** `roogondee` (act_1690150755770426, Business "Roogondee-รู้งี้", THB, ผูกบัตรแล้ว)
**เอกสารเกี่ยวข้อง:** `fb-ads-brief.md` (copy + audience ราย service), `launch-playbook.md` (SOP), `mens-vertical-plan.md` (compliance), `foreign-worker-tiein.md` (MOU/B2B)

---

## 0. อัปเดต 2026-08-08 — funnel ย้ายเข้า LINE แล้ว (อ่านก่อนข้อ 3–5)

แผนนี้เขียนตอน quiz ยังอยู่บนเว็บ **ตั้งแต่ 2026-08-07 (PR #139) quiz บนเว็บถูกปิดไปแล้ว** — `/quiz/{service}`
กลายเป็นหน้า gate ที่มี CTA เดียวคือเปิด LIFF quiz ใน LINE และเพราะ bot-link ของ LIFF ตั้งเป็น Aggressive
LINE จะบังคับ add friend ก่อน quiz จะ render **ข้อ 3, 4, 5 ของแผนเดิมต้องอ่านทับด้วยข้อนี้**

### 0.1 event `Lead` บนเว็บไม่มีอีกแล้ว — แกนวัดผลเดิมใช้ไม่ได้

แผนเดิมให้ optimize ที่ `Lead` ซึ่งยิงตอนทำ quiz จบบนเว็บ ตอนนี้ quiz จบ **ใน LINE ที่ Meta Pixel มองไม่เห็น**
ถ้าสร้าง Pixel แล้วตั้งแคมเปญให้ optimize `Lead` ตามแผนเดิม จะได้ 0 conversion ตลอดกาล แคมเปญจะออกจาก
learning phase ไม่ได้ และงบจะไหลทิ้งโดยไม่มีสัญญาณกลับมาเลย

สิ่งที่ Pixel ยังเห็นได้บนหน้า gate — มีในโค้ดอยู่แล้ว (`src/components/quiz/QuizGateActions.tsx`):

| event | ยิงเมื่อ | ใช้ทำอะไร |
|---|---|---|
| `quiz_gate_view` (custom) | เปิดหน้า gate | วัด landing view |
| `Contact` (standard) | กดปุ่ม "เพิ่มเพื่อน LINE แล้วเริ่มประเมิน" | **event ที่ optimize ได้จริงในตอนนี้** |
| `quiz_gate_call_click` (custom) | กดปุ่มโทร | นับ lead ทางโทรศัพท์ |

→ **ทุกแคมเปญต้อง optimize ที่ `Contact`** ไม่ใช่ `Lead` จนกว่าข้อ 0.2 จะเสร็จ
`Contact` เป็น standard event อยู่แล้ว ไม่ต้องแก้โค้ด — ขาดแค่ Pixel ID

ข้อจำกัดที่ต้องรู้: `Contact` = "กดออกไป LINE" ไม่ใช่ "ได้ lead" คนที่กดแล้วไม่ add friend / add แล้วไม่ทำ quiz
จะถูกนับด้วย ดังนั้นต้องกระทบยอดกับ `leads` ใน Supabase ทุกสัปดาห์ และดู ratio `Contact` → lead จริง
ถ้า ratio ต่ำแปลว่าปัญหาอยู่ที่ตัว gate หรือขั้น add friend ไม่ใช่ที่ ad

### 0.2 ของจริงคือ Conversions API — ตอนนี้ attribution ขาดตรงรอยต่อเข้า LINE

`src/lib/liff-links.ts` ส่งต่อแค่ `utm_source` / `utm_medium` / `utm_campaign` เข้า LIFF
**ไม่ได้ส่ง `fbclid` และ `_fbp`** → lead ที่เกิดใน LINE จึงผูกกลับไปหา ad ที่คลิกมาไม่ได้
รู้ได้แค่ระดับแคมเปญจาก utm เท่านั้น (ยัง optimize ไม่ได้ เพราะ Meta ต้องการ click id ราย event)

งานที่ต้องทำ — เดินตามรอยเดิมที่ TikTok ทำสำเร็จแล้ว (`src/lib/tiktok-events.ts` ใช้ `ttclid` + `_ttp` + dedup ด้วย `event_id = voucher.code`):

1. `liffQuizUrl()` ส่ง `fbclid` + `_fbp` ต่อเข้า LIFF เพิ่มจาก utm 3 ตัวที่ส่งอยู่แล้ว (เส้นทางเดิม พิสูจน์แล้วว่าผ่าน)
2. `LiffQuiz` อ่านค่าสองตัวนี้แล้วส่งไปกับ payload ของ `/api/quiz/claim-line` — route นี้รับและเก็บ utm ลง `leads` อยู่แล้ว เพิ่ม 2 คอลัมน์
3. `src/lib/meta-events.ts` ใหม่ — ก๊อปโครงจาก `tiktok-events.ts` ยิง `Lead` เข้า CAPI พร้อม `fbc` / `fbp` และ hash เบอร์/อีเมลด้วย SHA-256
4. ใช้ `event_id = voucher.code` เหมือน TikTok เพื่อ dedup กับ Pixel ฝั่ง client

ขนาดงาน: เล็ก (แพตเทิร์นมีครบแล้ว) แต่ **ต้องเสร็จก่อนจะ scale งบ** ไม่งั้นจะ optimize ได้แค่ proxy event ตลอดไป
ระหว่างรอ: ยิงด้วย `Contact` ตามข้อ 0.1 ได้เลย ไม่ต้องรอ CAPI

### 0.3 ตัวเลขเป้าต้อง re-baseline และ metric หลักควรเปลี่ยน

gate เพิ่มขั้นตอน (สลับแอป + ขอ add friend) → conversion rate จาก landing → lead จะ **ต่ำกว่า** quiz บนเว็บแน่นอน
CPL เป้า ฿80 ในข้อ 3 จึงยังใช้ตัดสินใจไม่ได้ **ห้ามใช้ตัวเลขในข้อ 3 ตัดสินเปิด/ปิด ad set จนกว่าจะมีข้อมูลจริง 2 สัปดาห์**
สองสัปดาห์แรกถือเป็นการเก็บ baseline ไม่ใช่การ optimize

สิ่งที่แลกมาคือ **lead ทุกคนกลายเป็น LINE follower** — ติดต่อซ้ำได้ฟรีไม่จำกัด ไม่ต้องจ่ายค่า retarget
lead ที่แพงขึ้นแต่ re-contact ฟรีอาจถูกกว่า lead ถูกที่ติดต่อกลับไม่ได้ ต้องดูที่ปลายทาง ไม่ใช่ที่ CPL

→ metric หลัก: **ต้นทุนต่อ LINE follower ที่ทำ quiz จบ** และยังยึด **ต้นทุนต่อคนที่มาถึง รพ.** เป็นตัวตัดสินงบเหมือนเดิม (ข้อ 3 แถวสุดท้ายยังใช้ได้)

### 0.4 ตัวติดที่ต้องปลดก่อน — เรียงตามลำดับ

| # | เรื่อง | สถานะ 2026-08-08 | บล็อกอะไร |
|---|---|---|---|
| 1 | **Pixel / dataset** | **ยังไม่มี** — `ads_get_datasets` ของบัญชี act_1690150755770426 คืนค่าว่าง (ตรงกับ audit 31 ก.ค.) | บล็อกทุกอย่างที่เป็น conversion campaign |
| 2 | **FB Page token** | **ตายแล้ว** (error 190) — autopost/story หยุด, organic warm audience หยุดโต | ไม่บล็อก ads โดยตรง แต่ทำให้ retargeting pool ไม่โต ดู `docs/fb-token-runbook.md` |
| 3 | `NEXT_PUBLIC_META_PIXEL_ID` ใน Vercel | ต้องเช็ค — ถ้า Pixel ยังไม่มี ค่านี้ก็ยังว่าง | Pixel ไม่ยิงเลยแม้แต่ `PageView` |
| 4 | `pages_messaging` App Review | pending มาตั้งแต่ เม.ย. | บล็อก Click-to-Messenger ของแทร็ก MOU (ข้อ 7.2) |

ข้อ 1 คือ priority เดียวที่แท้จริงของสัปดาห์นี้ — มันค้างมาตั้งแต่แผนเดิมเมื่อ 1 สัปดาห์ก่อน
และเป็นงานที่ Claude ทำแทนไม่ได้ (ต้องกดใน Events Manager UI)

### 0.5 ลำดับงานที่แก้แล้ว

**สัปดาห์นี้ — ปลดล็อก (ยังไม่ต้องเติมงบ)**
1. สร้าง Pixel ใน Events Manager → ใส่ `NEXT_PUBLIC_META_PIXEL_ID` ใน Vercel → redeploy
2. ทดสอบด้วย Test Events: เปิด `/quiz/glp1` ต้องเห็น `PageView` + `quiz_gate_view`, กดปุ่ม LINE ต้องเห็น `Contact`
3. Domain verification `roogondee.com` + AEM: **`Contact` = priority 1** (ไม่ใช่ `Lead` ตามแผนเดิม — ยังไม่มี `Lead` ให้จัดลำดับ)
4. ออก Page token ใหม่ตาม `docs/fb-token-runbook.md` เพื่อให้ organic กลับมาเดิน
5. ปิด `RGD-Followers-5Pillars-Reach` (ตามข้อ 4.6 เดิม ยังใช้ได้)

**สัปดาห์หน้า — เปิดยิงเก็บ baseline**
6. เปิดแคมเปญเดียวก่อน (GLP-1) optimize `Contact` งบ ฿300–500/วัน — อย่าเปิด 4 แคมเปญพร้อมกันตามแผนเดิม เพราะยังไม่รู้ว่า gate แปลงได้แค่ไหน
7. ทุกวันกระทบยอด `Contact` ใน Ads Manager กับ lead ใหม่ใน Supabase → ได้ ratio จริงของ gate
8. งาน dev ข้อ 0.2 (fbclid passthrough + CAPI) เดินคู่ขนานไป

**สัปดาห์ที่ 3 เป็นต้นไป**
9. ได้ baseline แล้วค่อยตั้งเป้า CPL จริง แล้วขยายตามโครงสร้างข้อ 5 (โดยเปลี่ยน optimize event เป็น `Lead` ผ่าน CAPI เมื่อข้อ 0.2 เสร็จ)

### 0.6 ต้องตัดสินใจ: ชื่อ รพ. ในโฆษณา

PR #140 (2026-08-08) เอาชื่อโรงพยาบาลพันธมิตรออกจาก public copy ทั้งเว็บ เหลือคำว่า "โรงพยาบาลพันธมิตร"
**ข้อนี้ชนกับแกน creative ของแทร็ก MOU ในข้อ 7 โดยตรง** — จุดขายทั้งแทร็กคือ "รพ. ได้รับอนุญาตตรวจคนต่างด้าว
ตรวจสอบรายชื่อได้ที่เว็บ สบส." ซึ่งพิสูจน์ไม่ได้เลยถ้าไม่บอกชื่อ รพ. (นายจ้าง/HR ต้องเอาชื่อไปเช็คทะเบียน)

สองทางเลือก — เป็นการตัดสินใจเชิงธุรกิจ ไม่ใช่เชิงเทคนิค:

- **ก) ยกเว้นแทร็ก MOU ให้ระบุชื่อได้** — เก็บจุดแข็งไว้ครบ แต่ต้องเคาะกับ รพ. เรื่องใบอนุญาตโฆษณา สบส.
  สำหรับข้อความที่อ้างชื่อ (ข้อ 11 บรรทัดสุดท้ายเตือนไว้แล้ว) **แนะนำทางนี้** — ตลาด B2B ซื้อด้วยการตรวจสอบได้
- **ข) ไม่ระบุชื่อทุกช่องทาง** — ต้องหา proof แบบอื่นแทน (เลขใบอนุญาต 001/2569 โดยไม่ผูกชื่อ, รูปสถานที่จริง,
  ให้ HR ที่สนใจได้ชื่อทางแชท) — ปลอดภัยกว่าแต่ conversion ฝั่ง B2B จะตกแน่นอน

จนกว่าจะเคาะ: **หยุดใช้ copy block ที่มีชื่อ รพ. ใน `docs/foreign-worker-tiein.md` กับโฆษณา** และแทร็ก B2C
(ราคา/ขั้นตอน/แผนที่/เบอร์โทร) ยิงต่อได้ตามปกติ เพราะไม่ได้พึ่งชื่อ

---

## 1. สรุปผู้บริหาร

เป้าหมายคือ **คนไข้เดินเข้า รพ. (voucher redemption / มาตรวจจริง)** ไม่ใช่ยอด like/follower
จาก audit บัญชีจริง (ข้อ 2) ปัญหาไม่ใช่ "ยิงแล้วไม่เวิร์ก" แต่คือ **ยังไม่เคยยิงแบบ optimize เพื่อ lead ได้เลย** เพราะไม่มี Pixel — และแคมเปญที่ตัวเลขดีที่สุดกลับถูกปิดไป ขณะที่งบไหลไปแคมเปญ awareness ที่ไม่สร้าง lead

ลำดับความสำคัญ 4 ข้อ:

1. **ติด Meta Pixel + ตั้ง Conversion ให้เสร็จก่อนเติมงบแม้แต่บาทเดียว** (สัปดาห์ที่ 1)
2. **ย้ายงบจาก awareness → Lead conversion campaign** 3 บริการหลัก (GLP-1 / STD / CKD) ที่ funnel quiz + voucher พร้อมอยู่แล้ว
3. **เปิดแนวรบตรวจ MOU แรงงานพม่า/ลาว** (ข้อ 7) — จุดแข็งเชิงใบอนุญาตที่คู่แข่งเลียนแบบยาก + ลูกค้าอยู่รอบ รพ. อยู่แล้ว
4. **วัดผลถึง "มาถึง รพ. จริง"** ผ่าน redemption ใน `/admin/redeem` แล้วใช้ตัวเลขนั้นตัดสินการเพิ่ม/ลดงบทุกสัปดาห์

เป้า 90 วัน: CPL ≤ ฿80, redemption ≥ 30%, **ต้นทุนต่อคนไข้ที่มาถึง รพ. ≤ ฿270**

---

## 2. Audit บัญชีโฆษณาจริง (มิ.ย.–ก.ค. 2026)

ใช้จ่ายรวมประมาณ ฿6,100 ใน ~6 สัปดาห์:

| แคมเปญ | Objective | สถานะ | ใช้ไป | CTR | CPC | หมายเหตุ |
|---|---|---|---|---|---|---|
| RGD-Followers-5Pillars-Reach | Awareness | **ACTIVE** | ฿3,260 | 0.23% | ฿3.49 | กินงบครึ่งหนึ่งของทั้งหมด ไม่สร้าง lead |
| roogondee_STD_LINE | Traffic → LINE | PAUSED | ฿1,111 | **2.42%** | **฿1.03** | ดีที่สุดในบัญชี — landing view ฿1.49 |
| CKD_Lead_Quiz_Jun2026 | Leads | PAUSED | ฿1,124 | **2.33%** | ฿1.27 | ดีมากเช่นกัน — landing view ฿2.07 |
| MenHealth_Lead_WMedical | Leads (native form) | PAUSED | ฿244 | 1.01% | ฿12.22 | แพง + native form ขัดกับ funnel เรา |
| Boosted posts ×3 | Engagement/Clicks | ACTIVE | ~฿360 | 0.8–8% | ฿1.7–21.5 | กระจัดกระจาย ไม่มีเป้า conversion |

**ปัญหาเชิงโครงสร้างที่พบ:**

- **ไม่มี Pixel/Dataset ผูกกับบัญชีหรือ business เลย** — ทั้งที่โค้ดเว็บรองรับ `NEXT_PUBLIC_META_PIXEL_ID` และยิง event `Lead`, `CompleteRegistration`, `quiz_start`, `quiz_complete` พร้อมอยู่แล้ว ทุกแคมเปญที่ผ่านมาจึง optimize เพื่อคลิก ไม่ใช่เพื่อ lead
- Objective ปนกันหมด (awareness / engagement / traffic / native leads) ไม่มีแคมเปญไหน optimize ที่ event `Lead` บนเว็บ
- แคมเปญที่ CTR สูงสุด 2 ตัว (STD, CKD) ถูก pause — ควรชุบชีวิตในรูปแบบ conversion campaign
- ไม่มี retargeting audience (คนเริ่ม quiz แล้วทิ้ง = กลุ่มที่ถูกที่สุดที่จะปิด)

---

## 3. เป้าหมาย & KPI

> ⚠️ **ข้อนี้เขียนก่อน funnel เปลี่ยน — อ่านข้อ 0 ก่อนใช้ตัวเลขในตารางนี้**
> funnel จริงตั้งแต่ 2026-08-07 คือ **Ad → `/quiz/{service}` (gate) → กด `Contact` → add LINE →
> ทำ quiz ใน LIFF → รับ voucher (Lead เกิดใน LINE) → ทีมขายนัด → มาถึง รพ. (redeem)**
> — `add LINE` ย้ายมาอยู่ **ก่อน** quiz และ `Lead` ไม่ได้เกิดบนเว็บอีกแล้ว

Funnel เดิม (เลิกใช้): ~~Ad → /quiz/{service} → กรอกเสร็จรับ voucher (Lead) → add LINE → ทีมขายนัด → มาถึง รพ. (redeem)~~

| ขั้น | Metric | เป้า | วัดจาก |
|---|---|---|---|
| Ad → Landing | Cost per landing view | ≤ ฿3 | Ads Manager |
| Landing → Lead | CPL (event `Lead`) | ≤ ฿80 (learning ≤ ฿150) | Pixel + Supabase ต้องตรงกัน |
| คุณภาพ lead | tier ≥ warm | ≥ 50% | quiz scoring ใน `/admin` |
| Lead → ติดต่อได้ | ภายใน 24 ชม. | ≥ 90% | ทีมขาย W Medical |
| Lead → มา รพ. | Voucher redemption | ≥ 30% | `/admin/redeem` |
| **รวม** | **ต้นทุนต่อคนไข้ถึง รพ.** | **≤ ฿270** | CPL ÷ redemption rate |

ประมาณการจากข้อมูลจริง: landing view ฿1.5–2 → ถ้า quiz completion 10–20% ของผู้เข้าชม จะได้ CPL ราว ฿15–40 ซึ่งต่ำกว่าเป้ามาก — เป้า ฿80 จึงตั้งแบบเผื่อแล้ว

ฝั่ง MOU (ข้อ 7) วัดคนละแบบ: **ต้นทุนต่อหัวที่มาตรวจ** และ **จำนวนดีล B2B (นายจ้าง/นายหน้า)** เพราะ 1 ดีล = 50–500 หัว

---

## 4. Foundation ที่ต้องเสร็จก่อนเติมงบ (สัปดาห์ 1)

> ⚠️ ข้อ 1–2 และ 4 ถูกแทนที่ด้วยข้อ 0.5 แล้ว (event เปลี่ยนจาก `Lead` เป็น `Contact`) — ข้อ 3, 5, 6, 7 ยังใช้ได้ตามเดิม

เรียงตามลำดับ ทำให้ครบทุกข้อ:

1. **สร้าง Pixel** ใน Events Manager (Business "Roogondee-รู้งี้") → เอา ID ใส่ Vercel env `NEXT_PUBLIC_META_PIXEL_ID` → redeploy
2. ~~**ทดสอบ event:** ทำ quiz จบ 1 ครั้ง → เช็คว่า `Lead` ขึ้นใน Events Manager~~ → **ใช้ข้อ 0.5 ข้อย่อย 2 แทน** (ทดสอบ `Contact` บนหน้า gate)
3. **Domain verification** `roogondee.com` ใน Business Settings (จำเป็นสำหรับ iOS 14.5+)
4. ~~**AEM:** `Lead` = priority 1~~ → **`Contact` = priority 1** จนกว่า CAPI (ข้อ 0.2) จะเสร็จ แล้วค่อยสลับ `Lead` ขึ้นเป็น priority 1
5. **Custom audiences เตรียม retargeting:**
   - Website: ผู้ชมทุกหน้า 30 วัน / เริ่ม quiz (`quiz_start`) แต่ไม่มี `Lead` 14 วัน / ผู้อ่าน blog 30 วัน
   - Engagement: FB Page + IG engagers 90 วัน (มีคน engage จากงบ followers เดิม ~310k reach — ใช้ต่อยอดได้)
   - Lookalike 1% จาก `Lead` (สร้างเมื่อมี lead สะสม ≥ 100)
6. **จัดการแคมเปญเดิม:**
   - `RGD-Followers-5Pillars-Reach` → **ปิด** (CTR 0.23% ไม่คุ้ม เก็บงบไว้ยิง conversion; ถ้าอยากคง awareness ให้เหลือเพดาน ≤ ฿50/วัน)
   - Boosted posts → ปล่อยหมดอายุ ไม่ต่อ ยกเว้นโพสต์ CTR 8% ตัวนั้นเก็บ creative ไว้ทำ ad จริง
   - STD / CKD เดิม → ไม่ต้อง un-pause ให้สร้างใหม่เป็น conversion campaign (ข้อ 5)
7. (แนะนำ แต่ไม่ block) **Conversions API** ฝั่ง server เหมือนที่ทำ TikTok Events API ไว้แล้ว — ใช้ `event_id = voucher.code` dedup แบบเดียวกัน ช่วยกัน signal หายจาก ad blocker/iOS

---

## 5. โครงสร้างแคมเปญ Phase 1 (สัปดาห์ 2–5) — Meta (FB + IG)

> ⚠️ **โครงสร้างในตารางนี้ยังใช้ได้ แต่ (ก) optimize event เปลี่ยนเป็น `Contact` ตามข้อ 0.1
> (ข) อย่าเปิดพร้อมกัน 4 แคมเปญ ให้เปิด GLP-1 ตัวเดียวก่อนเก็บ baseline ตามข้อ 0.5
> (ค) ad set retargeting "quiz เริ่มแต่ไม่จบ" สร้างไม่ได้แล้ว เพราะ `quiz_start` ไม่เกิดบนเว็บ —
> ใช้ "เข้าหน้า gate แต่ไม่กด `Contact` 14 วัน" แทน ซึ่งเป็นกลุ่มที่ตรงกว่าเดิมด้วยซ้ำ**

หลักการ: **1 บริการ = 1 CBO campaign, objective = OUTCOME_LEADS → optimize ที่ `Contact` (ชั่วคราว) แล้วสลับเป็น `Lead` ผ่าน CAPI เมื่อข้อ 0.2 เสร็จ** (ไม่ใช้ native lead form — เหตุผลตาม `fb-ads-brief.md`: ต้อง score lead, PDPA, และ push voucher เข้า LINE)
Placement: Advantage+ (ปิด Audience Network) | Bid: lowest cost ช่วง learning
UTM ทุกตัว: `utm_source=facebook&utm_medium=cpc&utm_campaign={service}_{angle}_{audience}`

| Campaign | งบ/วัน | Ad sets | Creative เริ่มต้น |
|---|---|---|---|
| `RGD_GLP1_Lead_CBO` | ฿700 | (1) Interest: weight loss/IF/Ozempic, 28–55 กทม.+ปริมณฑล (2) Broad Advantage+ | copy A/B/C จาก brief ข้อ 4.1 — ห้าม before/after |
| `RGD_STD_Lead_CBO` | ฿500 | (1) Interest: sexual health/PrEP/dating apps, 18–45 (2) Broad | privacy-led จาก brief ข้อ 4.2 — โทน "รู้ก่อนสบายใจ" |
| `RGD_CKD_Lead_CBO` | ฿400 | (1) Interest: diabetes/hypertension/elderly care, 40+ (2) ผู้ดูแลผู้ป่วย | family-led จาก brief ข้อ 4.3 |
| `RGD_Retarget_AllServices` | ฿200 | quiz เริ่มแต่ไม่จบ 14 วัน + page engagers 90 วัน | "ทำต่ออีก 1 นาที รับสิทธิ์ตรวจฟรี" + carousel รวม 3 บริการ |

**รวม ฿1,800/วัน ≈ ฿54,000/เดือน** (ปรับลงได้ตามงบจริง — ขั้นต่ำที่ยังเรียนรู้ได้คือ ~฿300/วัน/แคมเปญ)

กติกา learning phase (14 วันแรก):
- ห้ามแก้ ad set ก่อนครบ 50 conversions หรือ 7 วัน (รีเซ็ต learning)
- CPL > ฿150 หลังวันที่ 5 → เปลี่ยน creative ก่อน อย่าเพิ่งเปลี่ยน audience
- CPL > ฿300 → pause ad set นั้น
- Frequency > 3 → เปลี่ยน creative

---

## 6. Phase 2 ขยาย vertical สุขภาพ (สัปดาห์ 6–12)

เปิดเมื่อ Phase 1 ทำ CPL ≤ ฿80 ต่อเนื่อง 2 สัปดาห์:

- **Women** (`/quiz/women`) — เปิดเป็นแคมเปญที่ 4 ได้เลย funnel พร้อมแล้ว Angle: ตรวจภายใน/HPV เป็นเรื่องปกติ ไม่น่ากลัว หมอผู้หญิงคุยง่าย งบเริ่ม ฿400/วัน
- **Mens** — ยิงได้เฉพาะ **Pillar A (สุขภาพรวม/ฮอร์โมน/andropause)** ตาม risk matrix ใน `mens-vertical-plan.md`: **ห้ามยิง Pillar B (ED) บน Meta เด็ดขาด** (เสี่ยง ad ban + ผิด พ.ร.บ.ยา) ใช้ wording "ปรึกษาแพทย์เฉพาะทางฟรี" เท่านั้น งบเริ่ม ฿300/วัน ผ่าน compliance gate ก่อนทุกชิ้น
- **Mind — ยังไม่ยิง paid** จนกว่า Phase 2 in-house team จะ live (ตอนนี้ waitlist mode สัญญา callback 1–2 สัปดาห์ — จ่ายเงินซื้อ lead มาเข้าคิวรอไม่คุ้ม และ sensitive) ใช้ organic + article quiz ไปก่อน
- **Lookalike 1–3%** จาก lead ที่ redeem แล้ว (seed คุณภาพสูงสุด) เมื่อมีครบ 100 คน
- **Scale งบ:** เพิ่มทีละ ≤ 20% ทุก 3–4 วัน เฉพาะแคมเปญที่ CPL ผ่านเป้า

---

## 7. ตลาดตรวจ MOU / Work Permit — แรงงานพม่า & ลาว (เริ่มได้ทันที ไม่ต้องรอ Pixel)

### 7.1 ทำไมตลาดนี้ต้องรีบเอา

- **สิทธิ์ที่คู่แข่งเลียนแบบยาก:** W Medical เป็น รพ. ที่ได้รับอนุญาตตรวจสุขภาพคนต่างด้าวอย่างเป็นทางการ (ใบอนุญาต สมุทรสาคร 001/2569, ห้องแล็บมาตรฐาน MOPH LAB, ทีมผ่านอบรม Iris Scan จากกรมควบคุมโรค) — รายชื่อตรวจสอบได้ในเว็บ สบส. ใช้เป็นแกน creative ทุกชิ้น
- **ลูกค้าอยู่รอบ รพ. อยู่แล้ว:** สมุทรสาคร/มหาชัยคือชุมชนแรงงานเมียนมาใหญ่ที่สุดในประเทศ + แรงงานลาวจำนวนมาก และตรวจ MOU เป็น **ตรวจภาคบังคับ** (ทำ/ต่อ Work Permit, ใบรับรองอายุ 90 วัน) — ไม่ต้อง "สร้าง demand" แค่ต้องชนะการเลือก รพ.
- **ดีลใหญ่ต่อครั้ง:** ตรวจหมู่ ≥ 50 คน/รอบ ราคาเริ่ม 500฿/หัว → ดีล B2B เดียว = รายได้เท่า lead รายย่อยหลายร้อยคน
- เว็บ **รองรับภาษาพม่า (my) / ลาว (lo) / เขมร (km) อยู่แล้ว** และ chatbot ก็ auto-detect ภาษาผู้ใช้อยู่แล้ว — ต้นทุนเปิดตลาดนี้ต่ำมาก

### 7.2 ยิงสองแทร็กพร้อมกัน

**แทร็ก A — B2B: นายจ้าง / HR / บริษัทนำเข้าแรงงาน MOU (แรงหลัก ~70% ของงบแทร็กนี้)**
คนตัดสินใจว่าแรงงานทั้งโรงงานไปตรวจที่ไหนคือ HR กับนายหน้า ไม่ใช่ตัวแรงงาน:

1. FB conversion/message ads ภาษาไทย → target: จ.สมุทรสาคร + interest HR/manufacturing/โรงงาน, age 25–55 — copy ชู "ตรวจหมู่ถึงที่ นัดคิวเป็นรอบ ใบรับรองแพทย์ 1.5–2 ชม. รพ. ได้รับอนุญาตถูกต้อง ตรวจสอบรายชื่อได้ที่เว็บ สบส." → ลง `/quiz/foreign` (quiz ฝั่งนี้ออกแบบมาสำหรับ HR อยู่แล้ว)
2. **Outreach ตรง (ฟรี):** ดึงรายชื่อบริษัทนำคนต่างด้าวมาทำงานที่ขึ้นทะเบียนกับกรมการจัดหางาน + โรงงานใหญ่ในสมุทรสาคร → โทร/LINE ส่ง one-pager จาก `foreign-worker-tiein.md` (มี copy block พร้อมใช้แล้ว)
3. ข้อเสนอ B2B ที่ควรเคาะกับ รพ.: เรทตรวจหมู่ตามจำนวนหัว, รับผลวันรุ่งขึ้นสำหรับกลุ่ม ≥ 50 คน, มีเจ้าหน้าที่สื่อสารภาษาเมียนมา

**แทร็ก B — B2C: ตัวแรงงานพม่า/ลาว (ต่อใบอนุญาต/ย้ายนายจ้าง/walk-in)**

การตั้งค่า ad ที่ใช้ได้จริงบน Meta (ห้าม target ตามเชื้อชาติ — ใช้ 3 อย่างนี้แทน ซึ่งถูก policy):
- **Location:** radius 15–25 กม. รอบ รพ. (ต.บางน้ำจืด อ.เมืองสมุทรสาคร) + อ้อมน้อย/กระทุ่มแบน/บางบอน
- **Language ใน ad set:** Burmese สำหรับชุดพม่า / Lao สำหรับชุดลาว (Meta ยังให้ target ตามภาษาของผู้ใช้ได้)
- **Creative เป็นภาษาพม่า/ลาวล้วน** — เป็น self-selection ที่แรงที่สุด คนไทยเลื่อนผ่านเอง

สาระใน creative (แปลจาก 7 ขั้นตอนใน `foreign-worker-tiein.md`):
ตรวจสุขภาพทำ Work Permit เริ่ม 500฿ · รอผล 1.5–2 ชม. · มีเจ้าหน้าที่พูดภาษาเมียนมา · รพ. ได้รับอนุญาตถูกต้อง (โชว์ตราตรวจสอบ สบส.) · แผนที่ + เบอร์โทร 0 2453 6121 · เอกสารที่ต้องเตรียม (Passport + เอกสารนายจ้าง)

**Destination อย่าใช้ quiz ภาษาไทย:** แรงงานส่วนใหญ่ไม่กรอกฟอร์มเว็บไทย ให้เรียงตามนี้
1. **Click-to-Messenger** (ดีสุด — แรงงานเมียนมาใช้ Messenger เป็นหลัก และ bot เรา auto-detect ภาษาอยู่แล้ว) — **ติดเงื่อนไข `pages_messaging` ยัง pending App Review → เร่งให้ผ่านเป็น priority ของแทร็กนี้**
2. ระหว่างรอ: **Call ads** (กดโทรเลย) + ads พาไปหน้า landing ภาษาพม่า/ลาว ที่มีปุ่มโทร + แผนที่ + Messenger link
3. สร้างหน้า `/mou` แบบเบา ๆ render ด้วย locale my/lo (มี i18n อยู่แล้ว) — ไม่ต้องมี quiz มีแค่ ราคา/ขั้นตอน/เอกสาร/แผนที่/ปุ่มโทร/ปุ่ม Messenger — งาน dev ครึ่งวัน

**TikTok:** แรงงานเมียนมา/ลาวใช้ TikTok หนักมาก — วิดีโอ 15–30 วิ ภาษาพม่า พาทัวร์ขั้นตอนตรวจ 7 ขั้นตอนในรพ.จริง ยิง location สมุทรสาคร งบทดลอง ฿150–200/วัน (Pixel TikTok พร้อมแล้ว)

### 7.3 จังหวะเวลา (สำคัญมากในตลาดนี้)

ดีมานด์ MOU วิ่งเป็นรอบตามประกาศ ครม./กรมการจัดหางาน (ช่วงเปิดขึ้นทะเบียน/ต่ออายุ ดีมานด์พุ่งเป็นสิบเท่า):
- ให้ทีมขายเฝ้าประกาศกรมการจัดหางาน + มติ ครม. เรื่องต่ออายุแรงงานต่างด้าว แล้ว **อัดงบ ×3–5 ในช่วง 30–45 วันก่อน deadline**
- นอกช่วงพีค คงงบ minimum (฿150–200/วัน) เพื่อกินตลาด ต่อใบครบ 90 วัน + คนย้ายนายจ้าง ที่มีต่อเนื่องทั้งปี

### 7.4 การวัดผลแทร็กนี้

Pixel วัดได้ไม่หมด (conversion เกิดที่โทร/Messenger/walk-in) ให้วัดแบบนี้:
- ฝั่ง ads: cost per call / cost per messaging conversation / cost per แผนที่คลิก
- ฝั่ง รพ.: **ถามทุกคนที่มาตรวจว่ารู้จักจากช่องทางไหน** (แบบฟอร์มหน้าเคาน์เตอร์ 1 ข้อ: Facebook พม่า / Facebook ลาว / TikTok / นายจ้างส่งมา / เพื่อนแนะนำ) — บันทึกรายวัน ส่งเข้า LINE group ทีมขาย
- B2B: จำนวนบริษัทที่ติดต่อ / นัด demo / ปิดดีล / จำนวนหัวต่อดีล
- เป้าเดือนแรก: B2C walk-in จาก ads ≥ 30 หัว/เดือน, B2B ปิด ≥ 2 ดีล (≥ 100 หัวรวม)

### 7.5 งบแทร็ก MOU (เดือนแรก)

| รายการ | งบ/วัน | งบ/เดือน |
|---|---|---|
| B2B FB ads (HR สมุทรสาคร, ไทย) | ฿150 | ฿4,500 |
| B2C FB ads ชุดภาษาพม่า | ฿250 | ฿7,500 |
| B2C FB ads ชุดภาษาลาว | ฿100 | ฿3,000 |
| TikTok ภาษาพม่า (ทดลอง) | ฿150 | ฿4,500 |
| ค่าแปล/ตรวจภาษา creative (พม่า+ลาว, native speaker) | — | ~฿3,000 ครั้งเดียว |
| **รวม** | **฿650** | **~฿22,500** |

ที่ 500฿/หัวและตรวจหมู่เป็นรอบ ดีล B2B เดียว 100 หัว = ฿50,000 → แทร็กนี้คืนทุนด้วยดีลเดียว

### 7.6 ข้อควรระวังเฉพาะแทร็กนี้

- **ห้าม target เชื้อชาติ/สัญชาติบน Meta** — ใช้ location + language + ภาษาของ creative เท่านั้น (ทั้งหมดถูก policy)
- ห้ามสื่อภาพเชิงลบเกี่ยวกับ 6 โรคต้องห้าม หรือ imply ว่าผู้ชม "อาจติดโรค" — โฟกัส "ทำเอกสารผ่าน เร็ว ถูกต้อง"
- เลขใบอนุญาตราชการห้ามแก้/ห้ามตัดต่อ ใช้ตามที่บันทึกใน `foreign-worker-tiein.md` และแนบลิงก์ตรวจสอบ สบส. เสมอ
- ให้ native speaker ตรวจคำแปลก่อนยิงทุกชิ้น — คำแปลเพี้ยนในตลาดนี้ทำลายความน่าเชื่อถือแรงกว่าตลาดไทย

---

## 8. ช่องทางเสริมนอก Meta

| ช่องทาง | สถานะระบบ | แผน |
|---|---|---|
| **TikTok Ads** | Pixel + Events API **พร้อมแล้ว** (`InitiateCheckout`/`CompleteRegistration`, dedup ด้วย voucher code) | เดือนที่ 2: GLP-1 ฿300/วัน วิดีโอ 15 วิ 9:16 + MOU ภาษาพม่าตามข้อ 7; STD บน TikTok policy เข้มกว่า เลี่ยงไปก่อน |
| **LINE OA** | bot + push พร้อม | ไม่ใช่ acquisition แต่เป็น **conversion engine**: broadcast เตือน voucher ใกล้หมดอายุ (14 วัน), follow-up lead ที่ยังไม่จอง — ฟรี/ถูกมาก ทำก่อนเพิ่มงบ ads |
| **FB Messenger bot** | โค้ดพร้อม รอ `pages_messaging` ผ่าน App Review | **เร่ง follow-up App Review** — เป็นคอขวดของแทร็ก MOU B2C (ข้อ 7.2) |
| **Organic FB/IG** | Stories autopost รันอยู่ (9:00 ทุกวัน) + blog + article quiz | คงไว้ — ทำหน้าที่ warm audience ให้ retargeting; โพสต์ไหน engagement สูงค่อยแปลงเป็น ad (เหมือนโพสต์ CTR 8% ที่เจอ) |
| **Google Search** | ยังไม่ทำ | เดือนที่ 3 ค่อยพิจารณา: search intent สูง ("ตรวจ hiv ฟรี กรุงเทพ", "ตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร") แต่ CPC สายสุขภาพแพง เริ่มเมื่อ Meta อิ่มตัว |

---

## 9. งบประมาณรวม 90 วัน

| เดือน | Meta (สุขภาพ) | MOU (ข้อ 7) | TikTok | อื่น ๆ | รวม |
|---|---|---|---|---|---|
| 1 (learning) | ฿40,000–54,000 | ฿22,500 | – | – | ~฿70,000 |
| 2 (optimize + women/mens) | ฿60,000 | ฿20,000–60,000* | ฿9,000 | – | ฿90,000–130,000 |
| 3 (scale ตัวที่ผ่านเป้า) | ฿80,000–100,000 | ตามรอบประกาศ* | ฿15,000 | Google ทดลอง ฿10,000 | ~฿120,000+ |

\* งบ MOU ผันตามรอบประกาศต่ออายุแรงงาน (ข้อ 7.3) — ช่วงพีคอัด ×3–5, นอกพีคถือ minimum

เป้าเดือนที่ 3: lead สายสุขภาพ ~1,300–1,800/เดือน → คนไข้เข้า รพ. ~100–150 คน/เดือน + ฝั่ง MOU อีก 100+ หัว/เดือนจาก B2B และ walk-in
เงื่อนไขหยุด (rollback ตาม `launch-playbook.md`): lead→customer < 2% หลัง 2 สัปดาห์ / รพ. รับไม่ทัน / PDPA complaint / quiz error > 1%

---

## 10. จังหวะวัดผล

- **ทุกวัน (10 นาที):** CPL, spend, จำนวน lead ใน Ads Manager vs Supabase ตรงกันไหม + ยอด walk-in MOU จากแบบฟอร์มหน้าเคาน์เตอร์
- **ทุกสัปดาห์ (จันทร์):** tier breakdown (urgent/hot/warm/cold ≥ 50% warm+), redemption จาก `/admin/redeem`, frequency, สรุปกับทีมขาย W Medical (ติดต่อทันไหม คุณภาพ lead โอเคไหม), pipeline ดีล B2B MOU
- **ทุก 2 สัปดาห์:** ตัดสินเพิ่ม/ลดงบราย ad set จาก **ต้นทุนต่อคนที่มา รพ.** ไม่ใช่ CPL อย่างเดียว — lead ถูกแต่ไม่มาถึง รพ. = แพง
- **รายเดือน:** ทบทวน creative ทั้งชุด, อัปเดตแผนนี้ด้วยตัวเลขจริง

---

## 11. Compliance (สรุปสั้น — รายละเอียดใน brief + mens plan + ข้อ 7.6)

- ห้าม before/after, ห้ามระบุผลลัพธ์เป็นตัวเลข, ห้าม implicate ตัวผู้ใช้ ("คุณอ้วน/คุณติดเชื้อ")
- STD: ภาษาเชิงบวก ไม่ตัดสิน, ห้ามภาพเข็ม/เลือด, ห้ามคำว่า AIDS ตรง ๆ
- Mens: ห้ามชื่อยา, ห้ามคำเชิงเพศ, ต้องมี "ภายใต้การดูแลของแพทย์" — ผ่าน forbidden-words linter ก่อนทุกชิ้น
- Mind: ห้ามยิง paid ช่วง waitlist; ทุก creative ต้องไม่แตะประเด็น self-harm
- MOU: ห้าม target เชื้อชาติ, ห้าม imply โรคต้องห้าม, เลขใบอนุญาตราชการใช้ตามจริงเท่านั้น
- ทุก landing มี PDPA consent + Privacy Policy แล้ว (พร้อมใช้)
- โฆษณาสถานพยาบาล: เช็คกับ รพ. พันธมิตร เรื่องใบอนุญาตโฆษณา สบส. สำหรับข้อความที่อ้างชื่อ รพ.
- **ชื่อ รพ. ใน creative:** PR #140 เอาชื่อออกจาก public copy ทั้งเว็บแล้ว — โฆษณาต้องรอผลตัดสินใจตามข้อ 0.6 ก่อน

---

## 12. Checklist ลงมือ

**สัปดาห์ 1 — Foundation**
- [ ] สร้าง Pixel + ใส่ `NEXT_PUBLIC_META_PIXEL_ID` ใน Vercel + ทดสอบ `Lead` event
- [ ] Domain verification + AEM priority
- [ ] สร้าง custom audiences (เว็บ + engagement)
- [ ] ปิด `RGD-Followers-5Pillars-Reach` และ boosted posts
- [ ] เตรียม creative: GLP-1 ×3, STD ×3, CKD ×2, retarget ×2 (ผ่าน compliance checklist)
- [ ] MOU: แปล creative พม่า/ลาว + หา native speaker ตรวจ, เคาะเรทตรวจหมู่ B2B กับ รพ., เริ่มลิสต์บริษัทนำเข้าแรงงาน/โรงงานเป้าหมาย
- [ ] เช็คสถานะ App Review `pages_messaging` แล้วเร่งให้ผ่าน

**สัปดาห์ 2 — เปิดยิง**
- [ ] สร้าง 4 แคมเปญสุขภาพตามข้อ 5 (เปิด GLP-1 ก่อน 2–3 วัน แล้วตามด้วย STD, CKD)
- [ ] เปิดแทร็ก MOU: B2B ไทย + B2C พม่า (call ads ก่อน ถ้า Messenger ยังไม่ผ่าน review)
- [ ] วางแบบฟอร์ม "รู้จักจากช่องทางไหน" ที่เคาน์เตอร์ รพ.
- [ ] ตั้ง LINE broadcast เตือน voucher หมดอายุ
- [ ] นัด standup รายวันกับทีมขาย W Medical ช่วง 2 สัปดาห์แรก

**สัปดาห์ 3–5 — Optimize** | **สัปดาห์ 6+ — Phase 2** (ตามข้อ 6) + สร้างหน้า `/mou` locale my/lo

---

## 13. สิ่งที่สั่งให้ Claude ทำต่อได้ทันที

ระบบเชื่อมกับบัญชีโฆษณาแล้ว สั่งได้เลยในแชท:
- สร้างแคมเปญ/ad set/ad ตามข้อ 5 และข้อ 7 (สร้างสถานะ PAUSED ให้รีวิวก่อนเปิด)
- สร้าง custom audiences ตามข้อ 4
- ปิดแคมเปญ awareness เดิม
- ดึงรายงานผล/เทียบ benchmark รายสัปดาห์อัตโนมัติ
- เขียน ad copy ทุก variation รวมถึง **ร่างภาษาพม่า/ลาว** (ให้ native speaker ตรวจก่อนยิง) + gen ภาพ 1:1/9:16 ตาม brand (mint `#52B788`)
- สร้างหน้า `/mou` ภาษาพม่า/ลาว (i18n มี my/lo อยู่แล้ว — งานสั้น)

- งาน dev ข้อ 0.2 (ส่ง `fbclid`/`_fbp` เข้า LIFF + `src/lib/meta-events.ts` สำหรับ CAPI) — สั่งได้เลย ไม่ต้องรอ Pixel

สิ่งเดียวที่ Claude ทำแทนไม่ได้: สร้าง Pixel ใน Events Manager (ต้องกดใน UI) — สร้างเสร็จส่ง ID มา เดี๋ยวจัดการ env + verify ให้

**หมายเหตุ 2026-08-08:** เครื่องมือต่อบัญชีโฆษณา (Meta Ads MCP) ตอนนี้เรียกได้บ้างไม่ได้บ้าง
(`ads_get_ad_accounts` / `ads_get_ad_entities` คืน error `GraphMethodException` code 100 ส่วน `ads_get_datasets` ยังตอบปกติ)
อาการเข้ากันได้กับปัญหา token/สิทธิ์ฝั่ง Meta ตัวเดียวกับที่ทำให้ Page token ตาย — เคลียร์ข้อ 0.4 แถว 2 แล้วน่าจะกลับมาใช้ได้
ระหว่างนี้ตัวเลขบัญชีให้ดูจาก Ads Manager โดยตรง
