# Facebook Boost Post Playbook (สำหรับเจ้าของเพจ)

คู่มือยิง ads ผ่านปุ่ม **Boost Post** บนเพจโดยตรง — ไม่ต้องเข้า Ads Manager

> **ก่อนเริ่ม:** ดู `docs/fb-ads-brief.md` สำหรับ KPI/budget เป้า, และ `scripts/fb_feed.py` คือสคริปต์ที่โพสต์ feed รายวัน 11:00 (ทุกโพสต์ boost ได้ทันที)

---

## 1. โพสต์ไหน boost ได้?

| ประเภทโพสต์ | Boost ได้? | หมายเหตุ |
|------------|------------|----------|
| **Feed photo + caption + link** | ✅ | สคริปต์ `fb_feed.py` ทำให้อัตโนมัติ 11:00 ทุกวัน |
| Story (24 ชม.) | ❌ | สคริปต์ `fb_story.py` 9:00 — ไว้ engagement organic เท่านั้น |
| Reel | ✅ | ยังไม่มี autopost — manual upload |
| Live | ✅ หลังจบ | ไม่ใช่ flow ปัจจุบัน |

> **กฎทอง:** boost เฉพาะโพสต์ที่มีลิงก์ไป `/quiz/{service}` เพราะ Pixel + CAPI ติดตั้งบนหน้า quiz เท่านั้น

---

## 2. เลือก Objective ให้ถูก (สำคัญสุด)

เมื่อกด **Boost post** ใต้โพสต์ → จะเจอหน้า "What results would you like from this ad?"

### ❌ อย่าเลือก
- **"Automatic"** — Facebook จะเลือก Engagement ให้ → ได้ likes แต่ไม่ได้ lead
- **"Get more post engagement"** — เหมือนกัน เผาเงินกับ reactions

### ✅ ให้เลือก
- **"Get more website visitors"** — สำหรับโพสต์ที่มีลิงก์ไปเว็บ (default ของเรา)
- **"Get more leads"** — ถ้าโพสต์มี Instant Form (เฉพาะ foreign B2B)
- **"Get more messages"** — ถ้าอยากให้คนทักไลน์/Messenger (สำหรับ STD ที่ส่วนตัว)

---

## 3. ขั้นตอน Boost ทีละขั้น

### Step 1 — เข้าโพสต์ที่อยาก boost
- เปิด Facebook → เพจ **รู้ก่อนดี** → เลือกโพสต์ที่มีลิงก์ไป quiz
- ดูได้จาก Supabase: `SELECT fb_post_id, service, link_url FROM fb_posts WHERE posted_date >= current_date - 7 ORDER BY posted_date DESC;`

### Step 2 — กด "Boost post" สีน้ำเงิน

### Step 3 — Goal: เลือก **Get more website visitors**

### Step 4 — Button: ตรวจว่า CTA ปุ่มเป็น **"Learn More"** หรือ **"Sign Up"**
- ลิงก์ต้องเป็น `https://roogondee.com/quiz/{service}?utm_source=facebook&utm_medium=boost&...`
- ถ้าลิงก์เพี้ยน → กลับไปแก้ caption ในโพสต์ก่อน

### Step 5 — Audience: เลือก Saved Audience (ดูข้อ 4 ด้านล่าง)

### Step 6 — Duration & Budget
| Service | Daily | Days | Total |
|---------|-------|------|-------|
| GLP-1   | 100฿  | 5    | 500฿  |
| STD     | 100฿  | 5    | 500฿  |
| CKD     | 80฿   | 5    | 400฿  |
| Foreign | 150฿  | 5    | 750฿  |

> เริ่ม boost ต่อโพสต์เล็ก ๆ ก่อน (500-750฿) — โพสต์ไหน CPL ดี ค่อย boost ซ้ำเพิ่ม

### Step 7 — Payment → Promote
- ครั้งแรกต้องผูกบัตร/QR PromptPay
- หลังจากนั้นคลิกเดียวจบ

---

## 4. ตั้ง Saved Audience ครั้งเดียว (ใช้ตลอด)

เข้า **Meta Ads Manager** → Audiences → Create Audience → Saved Audience

### Audience A — "RGD GLP-1 หญิงลดน้ำหนัก"
- Location: Thailand
- Age: 28–55
- Gender: Female
- Detailed targeting: weight loss, intermittent fasting, healthy eating, Ozempic, low carb diet
- Language: Thai

### Audience B — "RGD STD เมืองใหญ่"
- Location: Bangkok, Chonburi, Phuket, Chiang Mai (25km radius each)
- Age: 18–40
- Gender: All
- Detailed targeting: sexual health, LGBTQ+, dating apps, HIV awareness
- Language: Thai, English

### Audience C — "RGD CKD ผู้ใหญ่เสี่ยงไต"
- Location: Thailand
- Age: 40+
- Gender: All
- Detailed targeting: diabetes, hypertension, kidney disease, dialysis
- Language: Thai

### Audience D — "RGD Foreign HR สมุทรสาคร"
- Location: Samut Sakhon + 25km radius
- Age: 25–55
- Job titles: HR Manager, Human Resources, ฝ่ายบุคคล, HR Officer
- Language: Thai, English, Burmese, Khmer

→ เวลา boost เลือก saved audience ตรง vertical → จบใน 3 คลิก

---

## 5. ตรวจผลหลัง boost (KPI)

### หลัง boost 24 ชม. ไปดูที่:
- **Page → Insights → Posts** → คลิกโพสต์ที่ boost → ดู Link Clicks
- **Supabase**: `SELECT count(*), utm_campaign FROM leads WHERE utm_source='facebook' AND created_at >= current_date - 1 GROUP BY utm_campaign;`
- คำนวณ CPL: `งบ ÷ จำนวน lead`

### KPI ตามเป้า

| Metric | เป้า | ต้องทำอะไร |
|--------|------|-----------|
| CPL ≤ 80฿ | ✅ ดี | boost ต่อ / เพิ่มงบ +20% |
| CPL 80–150฿ | ⚠️ ปกติ | รอครบ 7 วัน learning ก่อนตัดสิน |
| CPL > 150฿ | ❌ แพง | หยุด boost โพสต์นี้ — เปลี่ยน creative |
| Link CTR < 1% | ❌ creative อ่อน | เปลี่ยน headline/รูป |
| Link CTR > 2% | ✅ ดี | scale งบ |

### Boost ที่ "ห้าม"
- ❌ boost โพสต์ที่พูดถึง mens vertical จาก main pixel
- ❌ boost โพสต์ที่มีคำว่า "รักษาหายขาด" "100%" "การันตี"
- ❌ boost โพสต์ที่ไม่มีลิงก์เว็บ (Pixel/CAPI fire ไม่ได้)
- ❌ boost ตอนวันแรกของโพสต์ — รอ 4-6 ชม. ให้มี organic baseline ก่อน

---

## 6. Quick Reference — เช็คผลรายวัน

```sql
-- โพสต์ที่ boost ไปแล้ว 7 วันล่าสุด + lead ที่ได้
SELECT
  p.posted_date,
  p.service,
  p.headline,
  p.boost_spent,
  count(l.id) AS leads,
  ROUND(p.boost_spent / NULLIF(count(l.id), 0), 2) AS cpl
FROM fb_posts p
LEFT JOIN leads l
  ON l.utm_source = 'facebook'
 AND l.utm_campaign = 'feed_' || p.service || '_' || p.posted_date::text
WHERE p.posted_date >= current_date - 7
  AND p.boosted = true
GROUP BY p.id
ORDER BY p.posted_date DESC;
```

หลัง boost จบให้กลับมา update column:
```sql
UPDATE fb_posts
SET boosted = true, boost_spent = 500, boost_leads = 6
WHERE fb_post_id = 'XXX';
```

---

## 7. ติดต่อ / ปัญหา
- Pixel ไม่ติด → เช็ค `NEXT_PUBLIC_META_PIXEL_ID` ใน Vercel
- CAPI ไม่ส่ง event → เช็ค `FB_ACCESS_TOKEN` หมดอายุหรือยัง (System User token = never expire)
- โพสต์ feed ไม่ขึ้น → เช็ค GitHub Actions tab `📰 RuGonDee Facebook Daily Feed Post`
- Lead ไม่มา utm tag → เช็ค `link_url` ใน `fb_posts` ว่ามี `?utm_source=facebook` หรือไม่
