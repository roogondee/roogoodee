# Facebook Autopost — Implementation Spec

สเปกสำหรับสร้าง/รื้อ Facebook autopost ของ Roogondee (รู้ก่อนดี) ตั้งแต่ศูนย์
ใช้เป็น brief ส่งต่อให้ AI/dev คนอื่นได้ตรง ๆ

---

## 1. ภาพรวมระบบ

มี 3 ตัวที่รันแยกกันบน GitHub Actions cron:

| ตัวรัน | สคริปต์ | Workflow | Cron (UTC) | เวลา BKK |
|---|---|---|---|---|
| Feed autopost (บทความ + ลิงก์) | `scripts/autopost.py` | `.github/workflows/autopost.yml` | ดูในไฟล์ workflow | — |
| **Daily Story** | `scripts/fb_story.py` | `.github/workflows/fb_story.yml` | `0 2 * * *` | 09:00 ทุกวัน |
| Caption gen (ใช้ภายใน) | `scripts/fb_caption.py` | `.github/workflows/fb_caption.yml` | — | — |

โฟกัสของสเปกนี้คือ **Daily Story** เพราะใช้ permission ที่ approved แล้ว
(`pages_manage_posts`) — feed autopost ใช้ permission เดียวกัน แต่ต้องคุย caption
ผ่าน compliance gate

---

## 2. Stack ที่ใช้

- **Runtime:** Python 3.11 บน GitHub Actions (ubuntu-latest)
- **AI:** Anthropic SDK — `claude-haiku-4-5-20251001` สำหรับ caption
- **Image gen (optional):** Together AI — `black-forest-labs/FLUX.1-schnell`
  (1080x1920, 4 steps); ถ้าไม่มี key → fallback เป็น linear gradient
- **Image render:** Pillow + ฟอนต์ Sarabun (SIL OFL 1.1) ดาวน์โหลดจาก
  `github.com/google/fonts/ofl/sarabun` ตอนรัน → cache ที่ `scripts/fonts/`
  (ไม่ commit TTF เข้า repo)
- **Storage:** Supabase Storage bucket `images/fb-stories/`
- **State:** Supabase table `fb_stories` พร้อม unique index `(posted_date, service)`
- **Posting:** Facebook Graph API v19 — 2-step (`/photos?published=false` →
  `/photo_stories?photo_id=…`)

---

## 3. Environment variables

### Required
```
ANTHROPIC_API_KEY              # Claude (caption gen)
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
SUPABASE_SECRET                # Service role key
FB_PAGE_ID                     # 1042552638945974
FB_PAGE_ACCESS_TOKEN           # Page Access Token (มี pages_manage_posts)
```

### Optional
```
TOGETHER_API_KEY               # FLUX image gen; ถ้าไม่มีใช้ gradient
SITE_BASE_URL                  # default https://www.roogondee.com
STORY_INCLUDE_MENS=1           # เปิด vertical สุขภาพชาย (default ปิด)
STORY_FORCE_SERVICE=glp1|std|ckd|mens   # override การหมุนวัน
STORY_DRY_RUN=1                # gen + compose แต่ไม่ยิง Graph API
```

### Notify (optional)
`DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `LINE_CHANNEL_ACCESS_TOKEN`,
`LINE_TARGET_ID` — ใช้กับ `scripts/notify.py` แจ้งผลโพสต์

---

## 4. Facebook App requirements

- **App:** "RooGonDee AutoPost", App ID `1840096433337980`
- **Page ID:** `1042552638945974`
- **Permissions ที่ approved แล้ว (ใช้ได้):**
  - `pages_manage_posts`
  - `pages_read_engagement`
- **Permissions ที่ยัง PENDING App Review (ห้ามใช้):**
  - `pages_messaging`, `pages_messaging_subscriptions` — สำหรับ bot Messenger
- ใช้ **Page Access Token แบบ long-lived** เก็บใน GitHub Secret
  `FB_PAGE_ACCESS_TOKEN` (อายุยาว ~60 วัน → ต่ออายุ manually หรือ refresh script)

---

## 5. การหมุน service + story type

```python
ROTATION = ["glp1", "std", "ckd"]            # foreign B2B ไม่เข้า Story
if STORY_INCLUDE_MENS:
    ROTATION.append("mens")

service    = ROTATION[date.toordinal() % len(ROTATION)]
story_type = STORY_TYPES[date.toordinal() % 5]
# STORY_TYPES = ["fact", "question", "tip", "voucher", "myth"]
```

| Service | Voucher hint | Sample color (top → bottom) |
|---|---|---|
| `glp1` | ตรวจ FBS+HbA1c ฟรี (มูลค่า 500฿) | `#52B788` → `#1B4332` |
| `std` | ตรวจ HIV+ซิฟิลิส ฟรี รู้ผล 1 ชม. | `#4285A5` → `#1C434F` |
| `ckd` | ตรวจปัสสาวะวัดโปรตีนรั่ว ฟรี | `#5A89D1` → `#1B3250` |
| `mens` | ตรวจฮอร์โมนชายภายใต้แพทย์ | `#3D547C` → `#182035` |

---

## 6. Caption gen (Claude)

- Model: `claude-haiku-4-5-20251001`, `max_tokens=900`
- Output JSON เท่านั้น schema:
  ```json
  {
    "headline": "ข้อความใหญ่ในสตอรี่ 4-8 คำ",
    "subline":  "ขยายความ 1 ประโยค 8-16 คำ",
    "caption":  "caption ฉบับเต็ม 2-4 บรรทัด ≤320 ตัวอักษร",
    "cta":      "ประโยค CTA ≤6 คำ"
  }
  ```
- **กฎภาษา:**
  - headline/subline จะ render บนรูป → **ห้าม emoji**
  - caption ใช้ emoji ได้ ≤ 2 ตัว
  - ห้าม markdown (`**`, `##`, `-`, `*`)
  - ห้ามคำตัดสินรูปร่าง (อ้วน, พุงยื่น, ฯลฯ)
  - ลิงก์ใช้ `roogondee.com` หรือ `@roogondee` เท่านั้น
- **Compliance gate สำหรับ `mens`** (เรียก `scripts/compliance.py`):
  - บล็อกคำ ED / แข็งตัว / สมรรถภาพ / เพิ่มขนาด / ชื่อยา (sildenafil, tadalafil,
    Viagra, Cialis, Nebido, Sustanon)
  - บล็อกคำการันตี (รักษาหายขาด, 100%, แจกยาฟรี)
  - บังคับมีประโยค "ภายใต้การดูแลของแพทย์ที่ W Medical Hospital" ใน caption
- **Retry policy:** ลอง gen 3 ครั้ง ถ้า JSON parse fail หรือ compliance fail
  ให้ลองใหม่ (exponential backoff 1s/2s/4s)

---

## 7. Image composition (1080x1920)

ลำดับชั้นจากบนลงล่าง:

1. **Background** — FLUX 1080x1920 (blur radius 2) + overlay alpha 130
   หรือ linear gradient + overlay alpha 60
2. **Brand pill** (`y≈110`) — pill สี mint `#52B788`, ข้อความ "รู้ก่อนดี"
   font Sarabun-Bold 46
3. **Service badge** (`y≈236`) — pill สีขาว, ข้อความ `SERVICE_META[service].label`
   font Sarabun-Bold 38, ตัวอักษรสี forest `#1B4332`
4. **Headline** (`y≈720`, centered) — Sarabun-ExtraBold 92, white + drop shadow,
   wrap max 3 lines, max width 960
5. **Subline** (ใต้ headline) — Sarabun-Regular 44, off-white, wrap max 3 lines
6. **CTA pill** (`y≈1620`) — pill สีขาว, Sarabun-Bold 52, text สี forest
7. **URL footer** (`y≈1770`) — "roogondee.com  •  LINE @roogondee",
   Sarabun-Regular 34, white

**Thai word-wrap:** greedy space-wrap ก่อน ถ้าหาเส้นไม่ได้ fallback เป็น
char-by-char (ภาษาไทยไม่มีช่องว่างระหว่างคำ)

Output: JPEG quality 88, optimized

---

## 8. Posting flow (Graph API v19)

```python
# Step 1 — upload unpublished
POST https://graph.facebook.com/v19.0/{FB_PAGE_ID}/photos
  url=<public_url_to_jpg>
  published=false
  access_token=<page_token>
→ { "id": "<photo_id>" }

# Step 2 — publish เป็น Story
POST https://graph.facebook.com/v19.0/{FB_PAGE_ID}/photo_stories
  photo_id=<photo_id>
  access_token=<page_token>
→ { "post_id": "<story_id>" }
```

`public_url` ได้จาก Supabase Storage `images/fb-stories/{date}-{service}-{ts}.jpg`
(ต้อง public bucket หรือ signed URL)

---

## 9. Supabase schema

```sql
create table fb_stories (
  id           bigint generated always as identity primary key,
  posted_date  date         not null,
  service      text         not null,
  story_type   text         not null,
  fb_photo_id  text,
  fb_story_id  text,
  headline     text,
  subline      text,
  caption      text,
  image_url    text,
  link_url     text,
  status       text         not null default 'posted',
  created_at   timestamptz  not null default now(),
  unique (posted_date, service)
);
```

`already_posted_today(service)` query: `select id from fb_stories where
posted_date=$today and service=$service and status='posted' limit 1` — ถ้ามี
→ skip ทั้ง run (idempotent ต่อ workflow re-trigger)

---

## 10. GitHub Actions workflow

```yaml
name: RuGonDee Facebook Daily Story
on:
  schedule:
    - cron: "0 2 * * *"          # 09:00 BKK ทุกวัน
  workflow_dispatch:
    inputs:
      service:   { description: "Override service", default: "" }
      dry_run:   { description: "Dry run",          default: "false" }

jobs:
  fb_story:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11", cache: "pip" }
      - run: pip install -r requirements.txt
      - env:
          ANTHROPIC_API_KEY:        ${{ secrets.ANTHROPIC_API_KEY }}
          TOGETHER_API_KEY:         ${{ secrets.TOGETHER_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SECRET:          ${{ secrets.SUPABASE_SECRET }}
          FB_PAGE_ID:               ${{ secrets.FB_PAGE_ID }}
          FB_PAGE_ACCESS_TOKEN:     ${{ secrets.FB_PAGE_ACCESS_TOKEN }}
          STORY_FORCE_SERVICE:      ${{ inputs.service }}
          STORY_DRY_RUN:            ${{ inputs.dry_run == 'true' && '1' || '0' }}
        run: python scripts/fb_story.py
```

---

## 11. Brand guidelines

- ชื่อ: **รู้ก่อนดี(รู้งี้)** / Roogondee / RuGonDee
- สีหลัก: mint `#52B788`, ฐาน forest `#1B4332`
- ภาษาเริ่มต้น: ไทย
- **ห้าม emoji** ใน code, commit messages, headline บนรูป
- caption ใส่ emoji ได้ ≤ 2 ตัว
- โทน: คุยเป็นกันเอง ไม่ขายตรง ไม่ตัดสิน
- partner: W Medical Hospital สมุทรสาคร — credentials ดูได้ที่
  `docs/foreign-worker-tiein.md` (สบส. 001/2569, LA 7044P/2568)

---

## 12. Single-paragraph brief

> สร้าง Facebook Page Story autopost ด้วย Python 3.11 รันบน GitHub Actions cron
> 02:00 UTC ทุกวัน หมุน service `glp1 → std → ckd` ตาม day-of-year หมุนสไตล์
> `fact → question → tip → voucher → myth` ตาม 5-day cycle gen caption ด้วย
> Claude Haiku 4.5 เป็น JSON `{headline, subline, caption, cta}` ภาษาไทย ห้าม
> emoji ใน headline/subline เรนเดอร์รูป 1080x1920 ด้วย Pillow + ฟอนต์ Sarabun
> (ดาวน์โหลดตอนรัน) FLUX background ถ้ามี `TOGETHER_API_KEY` ไม่งั้น gradient
> อัปโหลดเข้า Supabase Storage แล้วโพสต์ผ่าน Graph API v19 (2-step:
> `/photos?published=false` → `/photo_stories?photo_id=…`) ใช้ permission
> `pages_manage_posts` กันโพสต์ซ้ำด้วย Supabase table `fb_stories` ที่มี
> unique `(posted_date, service)` รองรับ manual override
> `STORY_FORCE_SERVICE` และ `STORY_DRY_RUN`
