# FB Page Access Token — Runbook

วิธีแก้เมื่อ cron ของ Facebook (`fb_story.yml`, `fb_caption.yml`) พังเพราะ auth error
และวิธีออก token ใหม่ให้ไม่ต้องมาแก้บ่อย

ค่าอ้างอิงของโปรเจกต์:

| ค่า | ค่าที่ใช้ |
| --- | --- |
| Page | รู้ก่อนดี — `1042552638945974` |
| Meta App | RooGonDee AutoPost — `1840096433337980` |
| Secret ที่ cron ใช้ | `FB_PAGE_ACCESS_TOKEN` (GitHub Secrets) |
| Scope ที่ต้องมี | `pages_manage_posts`, `pages_read_engagement` |

---

## 1. อ่าน error ให้ออกก่อน

ตั้งแต่ PR นี้เป็นต้นไป alert จะบอกประเภทของ error มาให้แล้ว ไม่ต้องเดาจาก JSON ดิบ

| อาการใน alert | แปลว่า | ต้องทำ |
| --- | --- | --- |
| `🔑 FB Page Access Token ใช้ไม่ได้` (code 190) | token หมดอายุ / ถูก revoke / บัญชีหลุด role / เป็น user token | ออก token ใหม่ตามข้อ 3 |
| `🙅 แอปยังไม่ได้รับสิทธิ์บนเพจ` (code 190) | consent ไม่ครบ — ติ๊กเพจผิด, scope ไม่ครบ, หรือคนละแอป | ข้อ 2B (**ออก token ใหม่เฉย ๆ ไม่หาย**) |
| `🚫 token ใช้ได้ แต่ขาดสิทธิ์` (code 200/10/3) | scope ไม่ครบ หรือ App Review ยังไม่ผ่าน | ข้อ 4 |
| `⏳ ติด rate limit ของเพจ` (code 4/17/32/613) | ยิงถี่เกินโควตาเพจ | ไม่ต้องทำอะไร รอ cron รอบหน้า |
| `❌ ขาด env …` | secret หาย / ชื่อผิด | ตั้ง secret ใน GitHub และ Vercel |

เช็ค token ตอนไหนก็ได้โดยไม่ต้องรอ cron:

```bash
# เครื่องตัวเอง
FB_PAGE_ID=… FB_PAGE_ACCESS_TOKEN=… python scripts/fb_graph.py

# หรือกด Run workflow ที่ Actions → 🔑 RuGonDee Facebook Token Check
```

สคริปต์จะบอกว่า token เป็นของเพจไหน ตรงกับ `FB_PAGE_ID` ไหม เหลืออายุกี่วัน และ scope ครบไหม
(อายุ + scope ต้องตั้ง `FB_APP_ID` และ `FB_APP_SECRET` ด้วยถึงจะเช็คได้)

ตั้งแต่รอบ 2026-09-03 เป็นต้นไป **ตอน preflight พังก็จะเรียก `/debug_token` ให้ด้วย**
(ยิงด้วย app token เลยยังตอบได้แม้ Page token จะใช้ไม่ได้แล้ว) alert จึงมีบรรทัด `🔍 /debug_token:`
บอก `type` / `app` / `profile_id` / scope / วันหมดอายุ ติดมาเสมอ — ไม่ต้องเดาว่า token เป็นตัวไหน

---

## 2. error 190 "must be an administrator, editor, or moderator"

ข้อความเต็ม:

> The user must be an administrator, editor, or moderator of the page in order to impersonate it.
> If the page business requires Two Factor Authentication, the user also needs to enable Two Factor Authentication.

Facebook ใช้ข้อความเดียวกันนี้กับหลายสาเหตุ ไล่เช็คตามลำดับ:

1. **บัญชีที่ออก token หลุด role บนเพจ** — เปิด
   [Page → Settings → Page access](https://www.facebook.com/1042552638945974/settings/?tab=admin_roles)
   ดูว่าบัญชีนั้นยังเป็น Admin/Editor/Moderator อยู่ไหม
2. **Business บังคับ 2FA แต่บัญชีนั้นยังไม่เปิด** — เปิด
   [Business Settings → Security Center](https://business.facebook.com/settings/security)
   ถ้า "Two-factor authentication" ถูกบังคับ บัญชีต้องเปิด 2FA **แล้วออก token ใหม่** (ของเดิมใช้ต่อไม่ได้)
3. **token ถูก revoke** — เกิดเองเมื่อเปลี่ยนรหัสผ่าน Facebook, ถอดแอปออกจากบัญชี, หรือ reset App Secret
4. **ใส่ user token แทน Page token** — ได้ error 190 เหมือนกันเป๊ะ
   `python scripts/fb_graph.py` จะแยกเคสนี้ให้ (บอกว่า "เป็น user token ของ …")
5. **token หมดอายุ** — user token สั้น ๆ อายุ ~1-2 ชม., long-lived user token ~60 วัน

> เคสที่เจอบ่อยที่สุดคือ token ที่ออกมาจาก long-lived **user** token — พอ user token ครบ 60 วัน
> Page token ที่แตกออกมาก็ตายตาม วิธีกันคือใช้ System User token (ข้อ 3B) ซึ่งไม่มีวันหมดอายุ

---

## 2B. error 190 "must be granted before impersonating a user's page"

ข้อความเต็ม:

> Any of the pages_read_engagement, pages_manage_metadata, pages_read_user_content,
> pages_manage_ads, pages_show_list or pages_messaging permission(s) must be granted
> before impersonating a user's page.

**คนละเรื่องกับข้อ 2** ถึงจะเป็น code 190 เหมือนกัน — ข้อ 2 คือ "บัญชีไม่มีสิทธิ์บนเพจ",
ข้อนี้คือ "**แอป**ไม่ได้รับสิทธิ์บนเพจ" token ยังไม่หมดอายุด้วยซ้ำ
เพราะฉะนั้น **ออก token ใหม่ด้วยวิธีเดิมจะได้ token ที่พังแบบเดิม** ต้องกลับไปแก้ที่หน้า consent

สาเหตุ เรียงจากที่เจอบ่อยที่สุด:

1. **ตอน consent ไม่ได้ติ๊กเพจนี้** — Facebook ให้เลือกทีละเพจ กด "ดำเนินการต่อ" รวดเดียว
   มักได้แค่เพจ default `python scripts/fb_graph.py` จะฟ้องบรรทัด
   `⚠️  pages_manage_posts ถูกให้กับเพจ … ไม่รวมเพจ …` ให้เห็นชัด ๆ (อ่านจาก `granular_scopes`)
2. **token ออกจากคนละแอป** — `app` ในบรรทัด `🔍 /debug_token:` ต้องเป็น `1840096433337980`
   ถ้าไม่ใช่ แปลว่าไปออกจากแอปอื่นที่ยังไม่ผ่าน App Review สิทธิ์เลยไม่ติดมา
   (fingerprint ขึ้นต้นต่างกัน เช่น `EAAG…` เป็น `EAAa…` ก็เป็นสัญญาณเดียวกัน — 4 ตัวแรกเข้ารหัส App ID)
3. **บัญชีถอนสิทธิ์แอปทีหลัง** — [Settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools)
   → RooGonDee AutoPost → ดูว่าเพจยังถูกติ๊กอยู่ไหม
4. **ขาด `pages_show_list`** — ไม่ได้ใช้ตอนโพสต์ แต่ถ้าไม่มี `/me/accounts` จะไม่คืนเพจ
   เลยแตก Page token ไม่ได้ตั้งแต่ต้น

### วิธีแก้

```bash
# 1) ลิงก์ consent ที่ scope ครบ + auth_type=rerequest (บังคับให้แสดงหน้าเลือกเพจใหม่)
python scripts/fb_page_token.py --consent-url

# 2) เอา user token จาก URL bar มาแลก long-lived แล้วแตกเป็น Page token
python scripts/fb_page_token.py --user-token "EAA…"

# 3) เห็นค่าจริงเพื่อเอาไปวาง secret (ปกติพิมพ์แค่ fingerprint)
python scripts/fb_page_token.py --user-token "EAA…" --show-token
```

ขั้นตอนที่ 2 จะเช็คให้ครบเลยว่า scope มาครบไหม เพจอยู่ใน `/me/accounts` ไหม
บัญชีมี task `CREATE_CONTENT` บนเพจไหม และยิง `GET /me` ด้วย token ใหม่ให้ดูก่อนว่าโพสต์ได้จริง
ถ้าเพจไม่โผล่ในลิสต์ = ข้อ 1 ด้านบน กลับไปกด consent ใหม่แล้วติ๊กเพจให้ถูก

> วิธีตัดปัญหาถาวรยังเป็น System User token (ข้อ 3B) — สิทธิ์ผูกกับ Business ไม่ใช่หน้า consent ของคน

---

## 3. ออก Page token ใหม่

### 3A. ทางเร็ว — Graph API Explorer (อายุ ~60 วัน)

1. เปิด [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Meta App = **RooGonDee AutoPost**, User or Page = **Page: รู้ก่อนดี**
3. ติ๊ก permission: `pages_manage_posts`, `pages_read_engagement` → **Generate Access Token**
4. แลกเป็น long-lived (ทำในเครื่อง — อย่าวางค่าจริงลงแชทหรือ commit):

```bash
curl -sG "https://graph.facebook.com/v19.0/oauth/access_token" \
  -d grant_type=fb_exchange_token \
  -d client_id="$FB_APP_ID" \
  -d client_secret="$FB_APP_SECRET" \
  -d fb_exchange_token="$SHORT_LIVED_TOKEN"
```

5. เอา long-lived user token ที่ได้ไปดึง Page token:

```bash
curl -sG "https://graph.facebook.com/v19.0/me/accounts" \
  -d access_token="$LONG_LIVED_USER_TOKEN"
```

หา entry ที่ `id` = `1042552638945974` แล้วใช้ค่า `access_token` ของ entry นั้น

> ข้อ 4-5 ทำรวดเดียวได้ด้วย `python scripts/fb_page_token.py --user-token "$SHORT_LIVED_TOKEN"`
> ซึ่งตรวจ scope/เพจ/task ให้ด้วย แทนที่จะรู้ว่าพังตอน cron รอบถัดไป

### 3B. ทางที่ควรทำ — System User token (ไม่หมดอายุ)

ทำครั้งเดียวจบ ไม่ผูกกับบัญชีคน ไม่ตายเวลาคนเปลี่ยนรหัสผ่านหรือลาออก

1. [Business Settings → Users → System users](https://business.facebook.com/settings/system-users) → **Add**
   (ตั้งชื่อเช่น `roogondee-autopost`, role = Admin)
2. **Add Assets** → Pages → เลือกเพจ รู้ก่อนดี → เปิดสิทธิ์ **Manage Page**
3. **Generate new token** → เลือก App = RooGonDee AutoPost →
   ติ๊ก `pages_manage_posts` + `pages_read_engagement` → Token expiration = **Never**
4. คัดลอกไปวางใน secret (ข้อ 5) — token นี้จะไม่หมดอายุ แต่ยัง revoke ได้ถ้า System User ถูกลบ

> System User ที่ออก token ก็ต้องอยู่ภายใต้ Business ที่เปิด 2FA เรียบร้อยแล้วเหมือนกัน

---

## 4. error 200/10/3 — ขาดสิทธิ์

- เช็คสถานะ App Review ที่
  [developers.facebook.com/apps/1840096433337980/app-review](https://developers.facebook.com/apps/1840096433337980/app-review/)
- `pages_manage_posts` + `pages_read_engagement` ได้รับอนุมัติแล้ว (autopost ใช้อยู่)
- `pages_messaging` + `pages_messaging_subscriptions` ยัง pending — กระทบเฉพาะบอท Messenger ไม่กระทบ autopost
- ถ้า scope ครบแต่ยังโดน 200: token ตัวที่ใช้อยู่ถูกออกมาก่อนได้ permission → ออกใหม่ตามข้อ 3

---

## 5. อัปเดต secret ให้ครบทุกที่

token ใหม่ต้องไปวางสองที่ ไม่งั้นจะเป็นสภาพ "cron ผ่าน แต่เว็บพัง" หรือกลับกัน

| ที่ | ใช้ทำอะไร | ตั้งตรงไหน |
| --- | --- | --- |
| GitHub Secrets | cron ของ story/caption | Repo → Settings → Secrets and variables → Actions → `FB_PAGE_ACCESS_TOKEN` |
| Vercel | `src/lib/fb/graph.ts`, `/api/fb-webhook`, `/api/ig-webhook` | Project → Settings → Environment Variables → `FB_PAGE_ACCESS_TOKEN` (แล้ว redeploy) |

ตั้ง `FB_APP_ID` และ `FB_APP_SECRET` ใน GitHub Secrets ด้วย — ไม่ใช่ของบังคับ
แต่ถ้ามี workflow token check จะเตือนล่วงหน้า 7 วันก่อน token หมดอายุ แทนที่จะรู้ตอน cron พังไปแล้ว

เช็คว่า token ทั้งสองที่เป็นตัวเดียวกันได้จาก fingerprint ที่สคริปต์พิมพ์ออกมา
(`EAAG…len=203 sha256:xxxxxxxx`) — ค่าตรงกันแปลว่า token เดียวกัน โดยไม่ต้องเอา token จริงมาเทียบ

---

## 6. ยืนยันว่าแก้แล้วจริง

```bash
# 1. token ใช้ได้และเป็นของเพจที่ถูกต้อง
FB_PAGE_ID=… FB_PAGE_ACCESS_TOKEN=… python scripts/fb_graph.py

# 2. ซ้อมโพสต์ Story โดยไม่ยิง Graph API จริง
Actions → 📸 RuGonDee Facebook Daily Story → Run workflow → dry_run = true

# 3. โพสต์จริง
Actions → 📸 RuGonDee Facebook Daily Story → Run workflow → dry_run = false
```

`fb_caption.py` และ `fb_story.py` จะเช็ค token ก่อนเรียก Claude/FLUX เสมอ
ดังนั้นถ้า token พัง job จะจบเร็วพร้อมข้อความบอกวิธีแก้ โดยไม่เสีย quota ของ AI ไปฟรี ๆ

---

## ห้ามทำ

- อย่า commit token ลง repo หรือวางในแชท/issue/PR — ถ้าหลุด ให้ถือว่าโดน revoke แล้ว ออกใหม่ทันที
- อย่าใช้ user token แทน Page token
- อย่าปิดการเช็ค preflight เพื่อ "ให้ cron ผ่าน" — มันไม่ได้ทำให้โพสต์สำเร็จ แค่ทำให้พังเงียบ
