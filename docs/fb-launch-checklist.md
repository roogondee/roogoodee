# Facebook Launch Checklist

**Last updated:** 2026-04-26
**Status:** Pixel ติดแล้ว, Bot code พร้อม, รอ assets/permissions

เอกสารเดียวจบ: ของที่ต้องขอจากทีม FB / Meta admin, App Review package, และ dev setup steps

---

## 1. ของที่ต้องขอจากทีม FB / Meta admin

### A. จาก **Meta Business Manager admin** (คนที่ own บริษัท/Page)

| # | สิ่งที่ขอ | หาที่ไหน | ส่งให้ใคร | ใช้ทำอะไร |
|---|---|---|---|---|
| 1 | **Meta Pixel ID** (ตัวเลข 15-16 หลัก) | Business Manager → Events Manager → Data Sources → Pixels | dev (ตั้ง Vercel env) | Optimize FB Lead Ads |
| 2 | **Domain verification** roogondee.com | Business Manager → Brand Safety → Domains | dev (ใส่ DNS TXT หรือ meta tag) | iOS 14.5+ ads tracking |
| 3 | **Aggregated Event Measurement** ตั้งค่า | Events Manager → AEM | ตั้งเอง | จัดลำดับ event: `Lead`=1, `CompleteRegistration`=2, `PageView`=3 |
| 4 | Add **dev account** เป็น Page admin หรือ Developer ของ App `1840096433337980` | Business Settings → People | คุณ assign | dev ทดสอบ + submit App Review |
| 5 | Add **ทีม FB ads** เป็น Ad Account admin | Business Settings → Ad Accounts | คุณ assign | ทีม ads ยิง campaign ได้ |

### B. จาก **ทีมที่จะยิง ads**

| # | ที่ต้องตอบกลับให้ก่อนยิง | ใครตอบ |
|---|---|---|
| 1 | Campaign objective ใช้ "Leads" (Conversion ad) ตาม brief? | ทีม ads |
| 2 | Daily budget ต่อ service เริ่มที่กี่บาท? (brief แนะนำ 600-800/service) | คุณ approve |
| 3 | A/B test ad copy 3 versions ต่อ service ตาม brief — approve? | คุณ approve |
| 4 | Creative production timeline (รูป/วิดีโอ) | ทีม designer |
| 5 | UTM convention `utm_campaign={service}_{angle}_{audience}` รับได้? | ทีม ads |
| 6 | Reporting cadence (daily / weekly) | คุณ + ทีม ads |

### C. จาก **dev ของฝั่งคุณ** (ภายใน)

- [ ] Set Vercel env `NEXT_PUBLIC_META_PIXEL_ID` (ค่าจากข้อ A.1)
- [ ] Set Vercel env `FB_PAGE_ACCESS_TOKEN` (rotate ตัวที่หลุดในแชทแล้ว)
- [ ] Set Vercel env `FB_PAGE_ID = 1042552638945974`
- [ ] Set Vercel env `FB_VERIFY_TOKEN` (สุ่มเอง เช่น `roogondee-fb-2026-x9k2m`)
- [ ] Set Vercel env `FB_APP_SECRET` (จาก Meta Console → App → Settings → Basic)
- [ ] Verify domain `roogondee.com` ที่ Meta Business
- [ ] Subscribe webhook ที่ Meta App → URL: `https://roogondee.com/api/fb-webhook` + verify token + events: `messages`, `messaging_postbacks`

---

## 2. Meta App Review Package (สำหรับขอ pages_messaging)

ใช้กรอกที่ Meta Developer Console → App → App Review → Permissions and Features

### Permission ที่ขอ
- `pages_messaging` — Standard ❌ → Advanced ✅
- `pages_messaging_subscriptions` — Standard ❌ → Advanced ✅

### App Use Case Description (ใส่ในช่อง Tell us how you'll use this permission)

> **Use case (TH):**
> "รู้ก่อนดี" (Roogondee, roogondee.com) เป็นบริการ telehealth ในไทยร่วมกับ W Medical Hospital สมุทรสาคร ให้คำปรึกษาสุขภาพ 4 ด้าน: STD/PrEP HIV, GLP-1 ลดน้ำหนัก, CKD โรคไตเรื้อรัง, และตรวจสุขภาพแรงงานต่างด้าว
>
> เราต้องการใช้ `pages_messaging` เพื่อให้บริการ AI chatbot บน Facebook Messenger ที่:
> 1. ตอบคำถามเบื้องต้นเกี่ยวกับบริการสุขภาพของเรา
> 2. แนะนำให้ user ปรึกษาแพทย์/พยาบาล (ไม่วินิจฉัย/สั่งยาเอง)
> 3. ส่งลิงก์ลงทะเบียนตรวจฟรีเมื่อเหมาะสม
>
> Bot ตอบทุกภาษา (ไทย/อังกฤษ/พม่า/ลาว/เขมร/จีน/เวียดนาม/ฮินดี/ญี่ปุ่น/เกาหลี) เพื่อรองรับแรงงานต่างด้าวในสมุทรสาคร
>
> **Use case (EN — copy this for the actual review form):**
> Roogondee (roogondee.com) is a Thailand-based telehealth lead service partnering with W Medical Hospital in Samut Sakhon. We provide free consultation across four verticals: STD/PrEP HIV testing, GLP-1 weight loss, chronic kidney disease (CKD) screening, and occupational health screening for migrant workers.
>
> We request `pages_messaging` to operate an AI-assisted Facebook Messenger chatbot that: (1) answers basic questions about our four health services in the user's language, (2) directs users to qualified medical professionals — never diagnoses or prescribes, and (3) shares registration links for free in-person screening when appropriate. The bot supports 10 languages to serve migrant workers in our region. All conversations are logged to our CRM (Supabase) and qualified leads are routed to our sales team via LINE notifications.
>
> All responses end with a clear disclaimer to consult medical professionals; we do not collect medical history without explicit user consent.

### Demo Video Script (Meta ต้องการ 1-2 นาที)

```
0:00 - 0:10  เปิด Facebook Messenger บนมือถือ
              เปิด Page "รู้ก่อนดี" → ทักทายว่า "สวัสดีค่ะ"
0:10 - 0:25  Bot ตอบเป็นภาษาไทย แนะนำตัว + 4 บริการ
0:25 - 0:45  พิมพ์ "อยากตรวจ HIV ฟรี"
              Bot ตอบ → ส่งลิงก์ /quiz/std + บอกขั้นตอน
0:45 - 1:10  เปลี่ยนภาษา: พิมพ์เป็นพม่า "ဆေးကုသမှု လိုချင်တယ်"
              Bot ตอบเป็นพม่า → แสดง multilingual capability
1:10 - 1:30  ทดสอบ "ถ้ามีอาการอ้วน"
              Bot ตอบ → จบด้วย "💚 ปรึกษาฟรี ไม่ตัดสิน" + ลิงก์ /quiz/glp1
1:30 - 1:50  แสดง /privacy + ปุ่ม Get Started ของ Page
              อธิบายว่าทุก convo บันทึก + push lead เข้า CRM
1:50 - 2:00  ปิดด้วย URL: roogondee.com/api/fb-webhook (production webhook)
```

### Privacy Compliance Answers

**Q: Will you store any user data?**
> Yes. We store: (1) user's PSID (Page-scoped ID, anonymous Meta-issued identifier), (2) message text (truncated to 500 chars), (3) detected service interest, (4) timestamp. Stored in Supabase Postgres encrypted at rest. No PII unless user voluntarily provides it.

**Q: How long do you retain data?**
> 90 days for lead conversion tracking. After 90 days, message text is deleted; aggregated metrics retained.

**Q: Do you share data with third parties?**
> Anthropic (Claude API) processes message text for AI response generation, no retention per their TOS. No other third parties.

**Q: Privacy Policy URL**
> https://roogondee.com/privacy

**Q: Data Deletion Instructions URL**
> https://roogondee.com/privacy#delete (ถ้ายังไม่มี ต้องเพิ่ม)

**Q: User-Initiated Messaging only?**
> Yes. Bot only replies to messages user initiates. We will NOT use Sponsored Messages or proactive outreach in v1.

### Submit checklist
- [ ] App มี Privacy Policy URL filled in (App Settings → Basic)
- [ ] App มี Terms of Service URL
- [ ] App icon 1024×1024
- [ ] Demo video uploaded (YouTube unlisted ลิงก์)
- [ ] App-specific test user account ระบุใน review request
- [ ] Reviewer instructions — explain how to test (Page → Send Message → ลองทักไทย/อังกฤษ)

**Expected timeline:** 3-7 business days from Meta

---

## 3. Dev Setup Steps (ลิงก์ bot ขึ้น dev)

### Phase 1: Environment Variables (Vercel)

ที่ Vercel Dashboard → Project `roogoodee` → Settings → Environment Variables

| Var | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | (รอ Pixel ID) | Production + Preview |
| `FB_PAGE_ID` | `1042552638945974` | Production |
| `FB_PAGE_ACCESS_TOKEN` | (rotate ใหม่ — ตัวเดิมหลุด!) | Production |
| `FB_VERIFY_TOKEN` | สุ่มเอง 16+ chars เช่น `roogondee-fb-2026-x9k2m` | Production |
| `FB_APP_SECRET` | จาก Meta Console → App `1840096433337980` → Settings → Basic → Show | Production |
| `ANTHROPIC_API_KEY` | (ตรวจดูว่ามีแล้วหรือยัง) | Production |

หลัง set แล้ว trigger redeploy (Deployments → ⋯ → Redeploy)

### Phase 2: Subscribe Webhook ที่ Meta

1. ไปที่ developers.facebook.com → My Apps → "RooGonDee AutoPost"
2. Products → **Messenger** → Settings (ถ้ายังไม่มี ต้อง Add Product → Messenger)
3. ที่ section **Webhooks** → Edit Callback URL
   - Callback URL: `https://roogondee.com/api/fb-webhook`
   - Verify Token: ใส่ค่าเดียวกับ `FB_VERIFY_TOKEN` ใน Vercel
   - Subscribe to fields: ✅ `messages`, ✅ `messaging_postbacks`, ✅ `message_reads` (optional)
4. Save → Meta จะ POST ที่ webhook เพื่อทดสอบ → ถ้าโค้ดทำงาน return challenge ถูก จะ verified
5. ที่ section **Access Tokens** → เลือก Page "รู้ก่อนดี" → Subscribe

### Phase 3: Test ด้วย Standard Access (ระหว่างรอ App Review)

ระหว่างยังไม่ผ่าน App Review:
- เฉพาะ **Page admin / developer / tester** ของ App ทดสอบได้
- จากบัญชี FB ที่ assign บทบาทแล้ว → เปิด Page → Send Message → พิมพ์ทดสอบ
- ดู Vercel logs (`vercel logs`) ว่า webhook ได้ event และ Claude ตอบ

**ถ้าไม่ทำงาน เช็ค:**
- [ ] Webhook verified แล้ว (เห็น "Subscribed" ที่ Meta Console)
- [ ] Page subscribed กับ App แล้ว
- [ ] `FB_APP_SECRET` ตรงกับ Console (HMAC ผ่าน)
- [ ] `FB_PAGE_ACCESS_TOKEN` ใช้งานได้ (ลองยิง `https://graph.facebook.com/me?access_token=TOKEN` คืน Page object)
- [ ] ANTHROPIC budget เพียงพอ (ถ้า rate limit → bot ตอบไม่ได้แต่ webhook 200 OK)

### Phase 4: Production Launch

หลัง App Review ผ่าน:
- เปิด **Get Started button** ที่ Messenger profile API:
  ```bash
  curl -X POST "https://graph.facebook.com/v19.0/me/messenger_profile?access_token=TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"get_started":{"payload":"GET_STARTED"}}'
  ```
- ตั้ง **Greeting text**:
  ```bash
  curl -X POST "https://graph.facebook.com/v19.0/me/messenger_profile?access_token=TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"greeting":[{"locale":"default","text":"สวัสดี! 💚 ผมคือผู้ช่วยสุขภาพจาก รู้ก่อนดี ปรึกษาฟรี ไม่ตัดสิน — พิมพ์มาได้เลยครับ"}]}'
  ```
- ตั้ง **Persistent menu** (optional) — ปุ่ม "ตรวจ HIV ฟรี" / "GLP-1 ลดน้ำหนัก" / "ตรวจไตฟรี" / "Add LINE"

### Phase 5: Monitoring

Daily ตรวจ:
- Vercel function logs ที่ `/api/fb-webhook` (errors? rate limit? 401 signature?)
- Supabase `leads` table count where `source='facebook-bot'`
- LINE group notifications ขาเข้า

---

## TL;DR — สิ่งที่ต้องขอจากใครบ้าง

**ขอจาก Business Manager admin (1 คน):**
1. Meta Pixel ID
2. Domain verification (roogondee.com)
3. Add dev เป็น Page admin + App Developer
4. Add ทีม ads เป็น Ad Account admin
5. App Secret (ถ้าไม่มี dev access ตรง ๆ)

**ขอจาก dev (ภายใน):**
1. Rotate FB_PAGE_ACCESS_TOKEN ใหม่ (ตัวที่หลุดในแชท)
2. Set Vercel envs ตามตาราง
3. Subscribe webhook ที่ Meta Console
4. ตั้ง Get Started + Greeting (หลัง App Review ผ่าน)

**ขอจากทีม ads:**
1. Approve creative direction + budget split
2. Pixel ID ติดตั้งแล้ว (จาก dev) → setup AEM
3. Launch campaign 3 services ตาม brief
4. Daily/weekly reporting

**Submit App Review** (ผมเตรียมข้อความ + script ให้แล้วในข้อ 2):
- รอ 3-7 วันทำการ
- ระหว่างนั้นทดสอบ bot ด้วย Standard Access ได้
