"""
roogondee-autopost: ig_post.py
รู้ก่อนดี (RuGonDee) — Instagram daily poster (feed + story)
หมุน 3 verticals (glp1/std/ckd/+optional mens) — โพสต์ feed 1:1 + story 9:16 ทุกวัน
ผ่าน Instagram Graph API (ใช้ Page Access Token เดียวกับ FB).

Required env:
  ANTHROPIC_API_KEY
  TOGETHER_API_KEY                  (optional — ถ้าว่างจะใช้ gradient background)
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET
  IG_USER_ID                        Instagram Business Account ID (ไม่ใช่ FB Page ID)
  IG_ACCESS_TOKEN                   Page token ที่มี instagram_basic + instagram_content_publish
                                    (ปกติเป็น token เดียวกับ FB_PAGE_ACCESS_TOKEN)
  SITE_BASE_URL                     (default https://www.roogondee.com)

Optional env:
  IG_INCLUDE_MENS=1                 เปิด mens vertical (default ปิด)
  IG_FORCE_SERVICE=glp1|std|ckd     override การหมุนวัน (workflow_dispatch)
  IG_SKIP_FEED=1                    ข้าม feed post (โพสต์เฉพาะ story)
  IG_SKIP_STORY=1                   ข้าม story (โพสต์เฉพาะ feed)
  IG_DRY_RUN=1                      ทำทุกขั้น ยกเว้นยิง Graph API
"""

import os
import io
import json
import re
import sys
import time
import urllib.request
from datetime import date, datetime
from zoneinfo import ZoneInfo

import requests
import anthropic
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from supabase import create_client

from notify import notify as _notify

# ─── CONFIG ────────────────────────────────────────────────────────────────────

ANTHROPIC_KEY    = os.environ["ANTHROPIC_API_KEY"]
TOGETHER_KEY     = os.environ.get("TOGETHER_API_KEY", "").strip()
SUPABASE_URL     = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY     = os.environ["SUPABASE_SECRET"]
IG_USER_ID       = os.environ.get("IG_USER_ID", "").strip()
IG_TOKEN         = os.environ.get("IG_ACCESS_TOKEN", "").strip()
SITE_BASE        = os.environ.get("SITE_BASE_URL", "https://www.roogondee.com").rstrip("/")

INCLUDE_MENS     = os.environ.get("IG_INCLUDE_MENS", "0") == "1"
FORCE_SERVICE    = os.environ.get("IG_FORCE_SERVICE", "").strip().lower()
SKIP_FEED        = os.environ.get("IG_SKIP_FEED", "0") == "1"
SKIP_STORY       = os.environ.get("IG_SKIP_STORY", "0") == "1"
DRY_RUN          = os.environ.get("IG_DRY_RUN", "0") == "1"

BKK_TZ    = ZoneInfo("Asia/Bangkok")
TODAY     = datetime.now(BKK_TZ).date()
TODAY_STR = TODAY.strftime("%Y-%m-%d")

IG_API   = "https://graph.facebook.com/v19.0"
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# ─── SERVICE ROTATION ──────────────────────────────────────────────────────────

# foreign B2B ข้าม IG (target HR องค์กร)
ROTATION = ["glp1", "std", "ckd"]
if INCLUDE_MENS:
    ROTATION.append("mens")

SERVICE_META: dict[str, dict] = {
    "glp1": {
        "label":         "GLP-1 & ลดน้ำหนัก",
        "voucher_hint":  "ตรวจ FBS+HbA1c ฟรี (มูลค่า 500฿)",
        "color_top":     (82, 183, 136),
        "color_bottom":  (27, 67, 50),
        "hashtags":      "#GLP1 #ลดน้ำหนัก #รู้ก่อนดี #roogondee #ตรวจสุขภาพฟรี #เบาหวาน #คุมน้ำหนัก #สุขภาพดี #wmedical #สมุทรสาคร",
        "image_prompt":  ("healthy active Thai woman walking in park, fresh vegetables and fruits on table, "
                           "soft natural light, mint green and white tones, clean minimalist healthcare aesthetic, "
                           "vertical 9:16 framing, professional photo, no text, no logos"),
        "image_prompt_square": ("healthy active Thai woman walking in park, fresh vegetables and fruits on table, "
                           "soft natural light, mint green and white tones, clean minimalist healthcare aesthetic, "
                           "square 1:1 framing, professional photo, no text, no logos"),
    },
    "std": {
        "label":         "ตรวจสุขภาพทางเพศ",
        "voucher_hint":  "ตรวจ HIV+ซิฟิลิส ฟรี รู้ผล 1 ชม.",
        "color_top":     (66, 133, 165),
        "color_bottom":  (28, 67, 79),
        "hashtags":      "#ตรวจHIV #PrEP #STD #รู้ก่อนดี #roogondee #ตรวจฟรี #สุขภาพทางเพศ #ป้องกันHIV #wmedical #สมุทรสาคร",
        "image_prompt":  ("modern medical clinic interior, soft teal and white tones, Thai young adult professional "
                           "looking at phone, calm clean environment, healthcare aesthetic, vertical 9:16 framing, "
                           "professional photo, no text, no logos"),
        "image_prompt_square": ("modern medical clinic interior, soft teal and white tones, Thai young adult professional "
                           "looking at phone, calm clean environment, healthcare aesthetic, square 1:1 framing, "
                           "professional photo, no text, no logos"),
    },
    "ckd": {
        "label":         "ดูแลไต CKD",
        "voucher_hint":  "ตรวจปัสสาวะวัดโปรตีนรั่ว ฟรี",
        "color_top":     (90, 137, 209),
        "color_bottom":  (27, 50, 80),
        "hashtags":      "#โรคไต #CKD #รู้ก่อนดี #roogondee #ตรวจไต #ตรวจฟรี #ความดันสูง #เบาหวาน #wmedical #สมุทรสาคร",
        "image_prompt":  ("calm hospital consultation room, Thai senior holding glass of water, soft blue and white tones, "
                           "kidney health awareness, professional healthcare environment, vertical 9:16 framing, "
                           "professional photo, no text, no logos"),
        "image_prompt_square": ("calm hospital consultation room, Thai senior holding glass of water, soft blue and white tones, "
                           "kidney health awareness, professional healthcare environment, square 1:1 framing, "
                           "professional photo, no text, no logos"),
    },
    "mens": {
        "label":         "สุขภาพชายวัย 40+",
        "voucher_hint":  "ตรวจฮอร์โมนชายภายใต้แพทย์",
        "color_top":     (61, 84, 124),
        "color_bottom":  (24, 32, 53),
        "hashtags":      "#สุขภาพชาย #ฮอร์โมน #รู้ก่อนดี #roogondee #ผู้ชาย40 #ตรวจสุขภาพ #wmedical #สมุทรสาคร",
        "image_prompt":  ("Thai man aged 45-55 in business casual, thoughtful expression looking out window, navy and slate tones, "
                           "professional lifestyle, fully clothed, no shirtless, no couples, vertical 9:16 framing, "
                           "professional photo, no text, no logos"),
        "image_prompt_square": ("Thai man aged 45-55 in business casual, thoughtful expression looking out window, navy and slate tones, "
                           "professional lifestyle, fully clothed, no shirtless, no couples, square 1:1 framing, "
                           "professional photo, no text, no logos"),
    },
}

STORY_TYPES = ["fact", "question", "tip", "voucher", "myth"]

STORY_TYPE_BRIEF = {
    "fact":     "บอกข้อเท็จจริงสุขภาพที่หลายคนไม่รู้ พร้อมตัวเลข/สถิติเป็นจุดเริ่มสะดุดตา",
    "question": "ตั้งคำถามชวนคิดที่กลุ่มเป้าหมายอยากตอบ (เน้น pain point)",
    "tip":      "แนะนำเทคนิค/พฤติกรรมง่าย ๆ ที่ทำได้วันนี้",
    "voucher":  "เน้นโปรของวอเชอร์ฟรี ชวน DM รับโค้ด",
    "myth":     "ชนความเชื่อผิด ๆ ที่พบบ่อยในเรื่องสุขภาพนั้น แล้วแก้ให้ถูกต้อง",
}


def pick_service(d: date) -> str:
    if FORCE_SERVICE and FORCE_SERVICE in ROTATION:
        return FORCE_SERVICE
    return ROTATION[d.toordinal() % len(ROTATION)]


def pick_story_type(d: date) -> str:
    return STORY_TYPES[d.toordinal() % len(STORY_TYPES)]


# ─── SUPABASE ──────────────────────────────────────────────────────────────────

def get_sb():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def already_posted_today(service: str, media_type: str) -> bool:
    try:
        sb = get_sb()
        res = (
            sb.table("ig_posts")
            .select("id")
            .eq("posted_date", TODAY_STR)
            .eq("service", service)
            .eq("media_type", media_type)
            .eq("status", "posted")
            .limit(1)
            .execute()
        )
        return bool(res.data)
    except Exception as e:
        print(f"  ⚠️ ตรวจซ้ำไม่ได้ (สมมติว่ายังไม่โพสต์): {e}")
        return False


def log_post(record: dict) -> None:
    try:
        sb = get_sb()
        sb.table("ig_posts").insert(record).execute()
    except Exception as e:
        print(f"  ⚠️ log post failed: {e}")


def upload_image_to_storage(image_bytes: bytes, key: str) -> str:
    sb = get_sb()
    file_path = f"ig-posts/{key}.jpg"
    sb.storage.from_("images").upload(
        file_path,
        image_bytes,
        {"content-type": "image/jpeg", "upsert": "true"},
    )
    return sb.storage.from_("images").get_public_url(file_path)


# ─── CAPTION GENERATION (CLAUDE) ──────────────────────────────────────────────

MENS_COMPLIANCE_BLOCK = """

⚠️ COMPLIANCE สุขภาพชาย (บังคับ — caption + headline + subline ทุกตัว):
- ห้ามใช้คำ ED / แข็งตัว / สมรรถภาพทางเพศ / เพิ่มขนาด / อึด / ทน X นาที
- ห้ามระบุชื่อยา (sildenafil, tadalafil, Viagra, Cialis, Nebido, Sustanon)
- ห้ามใช้ 'รักษาหายขาด' / '100%' / 'การันตี' / 'แจกยา' / 'ยาฟรี'
- เน้น Pillar A: พลังงาน อารมณ์ คุณภาพชีวิต ฮอร์โมนเชิงให้ความรู้
- tone: ให้ความรู้ ไม่ตัดสิน ไม่ขายของ
- มีประโยค "ภายใต้การดูแลของแพทย์ที่ W Medical Hospital" อย่างน้อย 1 ครั้งใน feed_caption"""

SYSTEM_PROMPT = """คุณเป็นแอดมินเพจ Instagram สุขภาพ "รู้ก่อนดี (รู้งี้)" / @roogondee
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร
เขียน Instagram post ภาษาไทย — สไตล์เพื่อนคุยให้ฟัง ไม่แข็ง ไม่ขายตรง

ส่งคืนเป็น JSON เท่านั้น (ไม่มีคำอธิบาย ไม่มี markdown fence) ตาม schema:
{
  "headline":     "ข้อความใหญ่บนรูป 4-8 คำ ตัวสะดุดตา",
  "subline":      "ขยายความ 1 ประโยค 8-16 คำ",
  "feed_caption": "caption สำหรับโพสต์ feed 3-6 บรรทัด ≤500 ตัวอักษร พร้อม CTA 'DM rec_โค้ด' หรือ 'แตะลิงก์ใน bio'",
  "story_caption":"caption สั้น ๆ ใต้สตอรี่ ≤140 ตัวอักษร 1-2 บรรทัด",
  "cta":          "ประโยค CTA สั้น ๆ ≤6 คำ เช่น 'DM รับโค้ดฟรี'"
}

กฎ:
- headline + subline จะถูก render บนรูป → อย่าใช้ emoji
- feed_caption ใส่ emoji ได้ไม่เกิน 3 ตัว, story_caption ไม่เกิน 1 ตัว
- ห้าม markdown (** ## - *) ทุกฟิลด์
- ห้ามใส่ hashtag ใน feed_caption (จะต่อท้ายเองด้วยชุดมาตรฐาน)
- ห้ามคำตัดสินรูปร่าง (เช่น "อ้วน", "พุงยื่น", "น่าเกลียด")
- ลิงก์ใน caption ใช้ "ลิงก์ใน bio" หรือชื่อ @roogondee เท่านั้น (IG ไม่ฝัง URL ใน caption ได้)"""


def _client():
    return anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def generate_caption(service: str, story_type: str) -> dict:
    meta = SERVICE_META[service]
    brief = STORY_TYPE_BRIEF[story_type]

    system = SYSTEM_PROMPT
    if service == "mens":
        system += MENS_COMPLIANCE_BLOCK

    user = f"""วันนี้สร้าง Instagram post (feed + story) สำหรับ vertical: {meta['label']}
สไตล์: {story_type} — {brief}

ข้อมูลโปร: {meta['voucher_hint']}
สถานที่ตรวจ: W Medical Hospital สมุทรสาคร
ลิงก์เว็บ (ในไบโอ): {SITE_BASE}

สำคัญ:
- หลีกเลี่ยง headline ซ้ำเดิม (ลองมุมใหม่ทุกวัน)
- ใช้น้ำเสียงคุยกันเป็นกันเอง
- ส่งคืน JSON ตาม schema เท่านั้น"""

    last_err: Exception | None = None
    for attempt in range(3):
        try:
            msg = _client().messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1100,
                messages=[{"role": "user", "content": user}],
                system=system,
            )
            text = msg.content[0].text.strip()
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```\s*$", "", text)
            data = json.loads(text)
            for key in ("headline", "subline", "feed_caption", "story_caption", "cta"):
                if not isinstance(data.get(key), str) or not data[key].strip():
                    raise ValueError(f"missing/empty field: {key}")
                data[key] = data[key].strip()

            if service == "mens":
                from compliance import check_caption_compliance
                blob = "\n".join([data["headline"], data["subline"],
                                   data["feed_caption"], data["story_caption"]])
                ok, issues = check_caption_compliance(blob, "mens")
                if not ok:
                    raise ValueError(f"mens compliance fail: {issues}")

            return data
        except Exception as e:
            last_err = e
            print(f"  ↻ caption attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** attempt)

    raise RuntimeError(f"generate_caption failed: {last_err}")


def build_feed_caption(data: dict, service: str) -> str:
    body = data["feed_caption"].strip()
    tags = SERVICE_META[service]["hashtags"].strip()
    return f"{body}\n\n.\n.\n{tags}"


# ─── THAI FONT ─────────────────────────────────────────────────────────────────

SARABUN_REGULAR = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf"
SARABUN_BOLD    = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf"
SARABUN_BLACK   = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-ExtraBold.ttf"


def _ensure_font(url: str, filename: str) -> str:
    path = os.path.join(FONT_DIR, filename)
    if os.path.isfile(path) and os.path.getsize(path) > 50_000:
        return path
    os.makedirs(FONT_DIR, exist_ok=True)
    print(f"  ⬇️  downloading font: {filename}")
    req = urllib.request.Request(url, headers={"User-Agent": "roogondee-ig-post/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp, open(path, "wb") as f:
        f.write(resp.read())
    return path


def _font_paths() -> tuple[str, str, str]:
    reg   = _ensure_font(SARABUN_REGULAR, "Sarabun-Regular.ttf")
    bold  = _ensure_font(SARABUN_BOLD,    "Sarabun-Bold.ttf")
    black = _ensure_font(SARABUN_BLACK,   "Sarabun-ExtraBold.ttf")
    return reg, bold, black


def load_fonts_story() -> dict[str, ImageFont.FreeTypeFont]:
    reg, bold, black = _font_paths()
    return {
        "brand":    ImageFont.truetype(bold,  size=46),
        "badge":    ImageFont.truetype(bold,  size=38),
        "headline": ImageFont.truetype(black, size=92),
        "subline":  ImageFont.truetype(reg,   size=44),
        "cta":      ImageFont.truetype(bold,  size=52),
        "url":      ImageFont.truetype(reg,   size=34),
    }


def load_fonts_feed() -> dict[str, ImageFont.FreeTypeFont]:
    """Square feed มีพื้นที่น้อยกว่า story → font ขนาดเล็กลงนิดหน่อย"""
    reg, bold, black = _font_paths()
    return {
        "brand":    ImageFont.truetype(bold,  size=42),
        "badge":    ImageFont.truetype(bold,  size=34),
        "headline": ImageFont.truetype(black, size=78),
        "subline":  ImageFont.truetype(reg,   size=40),
        "cta":      ImageFont.truetype(bold,  size=46),
        "url":      ImageFont.truetype(reg,   size=30),
    }


# ─── BACKGROUND IMAGE ─────────────────────────────────────────────────────────

def fetch_flux_background(prompt: str, size: tuple[int, int]) -> Image.Image | None:
    if not TOGETHER_KEY:
        return None
    try:
        resp = requests.post(
            "https://api.together.xyz/v1/images/generations",
            headers={"Authorization": f"Bearer {TOGETHER_KEY}", "Content-Type": "application/json"},
            json={
                "model": "black-forest-labs/FLUX.1-schnell",
                "prompt": prompt,
                "width": size[0], "height": size[1],
                "steps": 4, "n": 1,
                "response_format": "url",
            },
            timeout=60,
        )
        resp.raise_for_status()
        url = resp.json()["data"][0]["url"]
        img_resp = requests.get(url, timeout=30)
        img_resp.raise_for_status()
        img = Image.open(io.BytesIO(img_resp.content)).convert("RGB")
        if img.size != size:
            img = img.resize(size, Image.LANCZOS)
        print(f"  🎨 FLUX background ok ({img.size[0]}x{img.size[1]})")
        return img
    except Exception as e:
        print(f"  ⚠️ FLUX failed, ใช้ gradient: {e}")
        return None


def gradient_background(service: str, size: tuple[int, int]) -> Image.Image:
    top    = SERVICE_META[service]["color_top"]
    bottom = SERVICE_META[service]["color_bottom"]
    w, h = size
    img = Image.new("RGB", size, color=top)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


# ─── COMPOSITION HELPERS ──────────────────────────────────────────────────────

def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont,
               max_width: int) -> list[str]:
    if not text:
        return []
    if " " in text:
        words = text.split(" ")
        lines: list[str] = []
        cur = ""
        for w in words:
            trial = w if not cur else f"{cur} {w}"
            if draw.textlength(trial, font=font) <= max_width:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        if all(draw.textlength(ln, font=font) <= max_width for ln in lines):
            return lines
    lines = []
    cur = ""
    for ch in text:
        trial = cur + ch
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    return lines


def _draw_text_block(draw: ImageDraw.ImageDraw, lines: list[str], font: ImageFont.FreeTypeFont,
                      y: int, fill=(255, 255, 255), shadow=(0, 0, 0, 160), line_gap: int = 12,
                      center_x: int = 540) -> int:
    for line in lines:
        w = draw.textlength(line, font=font)
        x = center_x - w / 2
        for ox, oy in ((-2, 2), (2, 2), (-2, -2), (2, -2), (0, 3)):
            draw.text((x + ox, y + oy), line, font=font, fill=shadow)
        draw.text((x, y), line, font=font, fill=fill)
        bbox = font.getbbox(line)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


# ─── COMPOSE STORY (1080x1920) ────────────────────────────────────────────────

def compose_story(service: str, headline: str, subline: str, cta: str) -> bytes:
    size = (1080, 1920)
    bg = fetch_flux_background(SERVICE_META[service]["image_prompt"], size)
    if bg is not None:
        bg = bg.filter(ImageFilter.GaussianBlur(radius=2))
        overlay_alpha = 130
    else:
        bg = gradient_background(service, size)
        overlay_alpha = 60

    overlay = Image.new("RGBA", bg.size, (0, 0, 0, overlay_alpha))
    img = Image.alpha_composite(bg.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    fonts = load_fonts_story()

    label = SERVICE_META[service]["label"]

    brand_text = "รู้ก่อนดี"
    bw = draw.textlength(brand_text, font=fonts["brand"])
    pad_x = 36
    pill_w = int(bw + pad_x * 2)
    pill_h = 104
    pill_x = 540 - pill_w // 2
    pill_y = 110
    draw.rounded_rectangle(
        (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h),
        radius=52, fill=(82, 183, 136),
    )
    draw.text((pill_x + pad_x, pill_y + 22), brand_text,
              font=fonts["brand"], fill=(255, 255, 255))

    badge_y = pill_y + pill_h + 22
    bw2 = draw.textlength(label, font=fonts["badge"])
    badge_w = int(bw2 + 56)
    badge_h = 80
    badge_x = 540 - badge_w // 2
    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h),
        radius=40, fill=(255, 255, 255),
    )
    draw.text((badge_x + 28, badge_y + 16), label,
              font=fonts["badge"], fill=(27, 67, 50))

    head_lines = _wrap_text(draw, headline, fonts["headline"], 960)[:3]
    head_h = sum(fonts["headline"].getbbox(ln)[3] - fonts["headline"].getbbox(ln)[1] + 12 for ln in head_lines)
    head_y = 760 - head_h // 2
    _draw_text_block(draw, head_lines, fonts["headline"], head_y,
                      fill=(255, 255, 255), line_gap=14)

    sub_y = head_y + head_h + 40
    sub_lines = _wrap_text(draw, subline, fonts["subline"], 880)[:3]
    _draw_text_block(draw, sub_lines, fonts["subline"], sub_y,
                      fill=(245, 245, 245), line_gap=10)

    cta_text = cta if cta else "DM รับโค้ด"
    cw = draw.textlength(cta_text, font=fonts["cta"])
    cta_w = int(cw + 96)
    cta_h = 110
    cta_x = 540 - cta_w // 2
    cta_y = 1620
    draw.rounded_rectangle(
        (cta_x, cta_y, cta_x + cta_w, cta_y + cta_h),
        radius=55, fill=(255, 255, 255),
    )
    draw.text((cta_x + 48, cta_y + 30), cta_text,
              font=fonts["cta"], fill=(27, 67, 50))

    url_text = "@roogondee  •  roogondee.com"
    uw = draw.textlength(url_text, font=fonts["url"])
    draw.text((540 - uw / 2, 1770), url_text,
              font=fonts["url"], fill=(255, 255, 255))

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


# ─── COMPOSE FEED (1080x1080 square) ──────────────────────────────────────────

def compose_feed(service: str, headline: str, subline: str, cta: str) -> bytes:
    size = (1080, 1080)
    bg = fetch_flux_background(SERVICE_META[service]["image_prompt_square"], size)
    if bg is not None:
        bg = bg.filter(ImageFilter.GaussianBlur(radius=2))
        overlay_alpha = 130
    else:
        bg = gradient_background(service, size)
        overlay_alpha = 60

    overlay = Image.new("RGBA", bg.size, (0, 0, 0, overlay_alpha))
    img = Image.alpha_composite(bg.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    fonts = load_fonts_feed()

    label = SERVICE_META[service]["label"]

    # Top brand pill
    brand_text = "รู้ก่อนดี"
    bw = draw.textlength(brand_text, font=fonts["brand"])
    pad_x = 30
    pill_w = int(bw + pad_x * 2)
    pill_h = 88
    pill_x = 540 - pill_w // 2
    pill_y = 70
    draw.rounded_rectangle(
        (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h),
        radius=44, fill=(82, 183, 136),
    )
    draw.text((pill_x + pad_x, pill_y + 18), brand_text,
              font=fonts["brand"], fill=(255, 255, 255))

    # Service badge
    badge_y = pill_y + pill_h + 16
    bw2 = draw.textlength(label, font=fonts["badge"])
    badge_w = int(bw2 + 48)
    badge_h = 68
    badge_x = 540 - badge_w // 2
    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h),
        radius=34, fill=(255, 255, 255),
    )
    draw.text((badge_x + 24, badge_y + 14), label,
              font=fonts["badge"], fill=(27, 67, 50))

    # Headline (centered, ~y=470)
    head_lines = _wrap_text(draw, headline, fonts["headline"], 940)[:3]
    head_h = sum(fonts["headline"].getbbox(ln)[3] - fonts["headline"].getbbox(ln)[1] + 10 for ln in head_lines)
    head_y = 500 - head_h // 2
    _draw_text_block(draw, head_lines, fonts["headline"], head_y,
                      fill=(255, 255, 255), line_gap=12)

    # Subline
    sub_y = head_y + head_h + 28
    sub_lines = _wrap_text(draw, subline, fonts["subline"], 880)[:2]
    _draw_text_block(draw, sub_lines, fonts["subline"], sub_y,
                      fill=(245, 245, 245), line_gap=8)

    # CTA pill
    cta_text = cta if cta else "DM รับโค้ด"
    cw = draw.textlength(cta_text, font=fonts["cta"])
    cta_w = int(cw + 80)
    cta_h = 92
    cta_x = 540 - cta_w // 2
    cta_y = 880
    draw.rounded_rectangle(
        (cta_x, cta_y, cta_x + cta_w, cta_y + cta_h),
        radius=46, fill=(255, 255, 255),
    )
    draw.text((cta_x + 40, cta_y + 24), cta_text,
              font=fonts["cta"], fill=(27, 67, 50))

    # Footer @handle
    url_text = "@roogondee  •  roogondee.com"
    uw = draw.textlength(url_text, font=fonts["url"])
    draw.text((540 - uw / 2, 1000), url_text,
              font=fonts["url"], fill=(255, 255, 255))

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


# ─── INSTAGRAM GRAPH API ──────────────────────────────────────────────────────

def ig_create_container(image_url: str, caption: str, media_type: str) -> str:
    """
    Step 1/2: สร้าง media container
    media_type='IMAGE'   → feed
    media_type='STORIES' → story
    Returns container creation_id.
    """
    data = {
        "image_url":    image_url,
        "access_token": IG_TOKEN,
    }
    if media_type == "STORIES":
        data["media_type"] = "STORIES"
    else:
        data["caption"] = caption

    resp = requests.post(f"{IG_API}/{IG_USER_ID}/media", data=data, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(f"IG container ({media_type}) {resp.status_code}: {resp.text[:300]}")
    container_id = resp.json().get("id")
    if not container_id:
        raise RuntimeError(f"IG container missing id: {resp.text[:300]}")
    return container_id


def ig_wait_container_ready(container_id: str, max_wait_s: int = 60) -> None:
    """Poll status_code จนกว่าจะ FINISHED (หรือ timeout)"""
    deadline = time.time() + max_wait_s
    last_status = ""
    while time.time() < deadline:
        resp = requests.get(
            f"{IG_API}/{container_id}",
            params={"fields": "status_code", "access_token": IG_TOKEN},
            timeout=30,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"IG status check {resp.status_code}: {resp.text[:300]}")
        status = resp.json().get("status_code", "")
        if status != last_status:
            print(f"   container {container_id} status={status}")
            last_status = status
        if status == "FINISHED":
            return
        if status in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"IG container failed: status={status}")
        time.sleep(3)
    raise RuntimeError(f"IG container not ready within {max_wait_s}s (last={last_status})")


def ig_publish(container_id: str) -> dict:
    """Step 2/2: publish container ที่พร้อมแล้ว"""
    resp = requests.post(
        f"{IG_API}/{IG_USER_ID}/media_publish",
        data={"creation_id": container_id, "access_token": IG_TOKEN},
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"IG media_publish {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def ig_get_permalink(media_id: str) -> str:
    try:
        resp = requests.get(
            f"{IG_API}/{media_id}",
            params={"fields": "permalink", "access_token": IG_TOKEN},
            timeout=30,
        )
        if resp.status_code < 400:
            return resp.json().get("permalink", "")
    except Exception:
        pass
    return ""


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def post_one(media_type: str, service: str, story_type: str, cap: dict) -> dict | None:
    """โพสต์ 1 ชิ้น (feed หรือ story) — return record dict ที่ log แล้ว หรือ None ถ้า skip"""
    if media_type == "IMAGE" and SKIP_FEED:
        print(f"⏭  IG_SKIP_FEED=1 — ข้าม feed")
        return None
    if media_type == "STORIES" and SKIP_STORY:
        print(f"⏭  IG_SKIP_STORY=1 — ข้าม story")
        return None

    if not DRY_RUN and already_posted_today(service, media_type):
        print(f"⏭  วันนี้ ({TODAY_STR}) โพสต์ {service}/{media_type} แล้ว — ข้าม")
        return None

    label = "feed (1:1)" if media_type == "IMAGE" else "story (9:16)"
    print(f"\n━━━ {label} ━━━")

    if media_type == "IMAGE":
        img_bytes = compose_feed(service, cap["headline"], cap["subline"], cap["cta"])
    else:
        img_bytes = compose_story(service, cap["headline"], cap["subline"], cap["cta"])
    print(f"   image: {len(img_bytes) / 1024:.0f} KB")

    if DRY_RUN:
        suffix = "feed" if media_type == "IMAGE" else "story"
        out_path = f"/tmp/ig-{suffix}-{TODAY_STR}-{service}.jpg"
        with open(out_path, "wb") as f:
            f.write(img_bytes)
        print(f"💧 DRY_RUN: ไม่ยิง Graph API — รูปอยู่ที่ {out_path}")
        return None

    print("☁️  upload to Supabase Storage...")
    suffix = "feed" if media_type == "IMAGE" else "story"
    key = f"{TODAY_STR}-{service}-{suffix}-{int(time.time())}"
    public_url = upload_image_to_storage(img_bytes, key)
    print(f"   {public_url}")

    caption_text = build_feed_caption(cap, service) if media_type == "IMAGE" else cap["story_caption"]

    print(f"📤 IG: create {media_type} container...")
    container_id = ig_create_container(public_url, caption_text, media_type)
    print(f"   container_id={container_id}")

    print("⏳ wait container ready...")
    ig_wait_container_ready(container_id)

    print(f"📤 IG: publish...")
    pub = ig_publish(container_id)
    media_id = pub.get("id", "")
    print(f"   media_id={media_id}")

    permalink = ig_get_permalink(media_id) if media_type == "IMAGE" else ""

    record = {
        "posted_date":     TODAY_STR,
        "service":         service,
        "story_type":      story_type,
        "media_type":      media_type,
        "ig_container_id": container_id,
        "ig_media_id":     media_id,
        "ig_permalink":    permalink,
        "headline":        cap["headline"],
        "subline":         cap["subline"],
        "caption":         caption_text,
        "hashtags":        SERVICE_META[service]["hashtags"] if media_type == "IMAGE" else "",
        "image_url":       public_url,
        "link_url":        SITE_BASE,
        "status":          "posted",
    }
    log_post(record)
    return record


def main() -> int:
    print(f"📷 รู้ก่อนดี IG Post — {TODAY_STR}")

    if not IG_USER_ID or not IG_TOKEN:
        print("❌ ขาด IG_USER_ID หรือ IG_ACCESS_TOKEN")
        return 1

    service    = pick_service(TODAY)
    story_type = pick_story_type(TODAY)
    print(f"🌿 service={service}  type={story_type}  (rotation={ROTATION})")

    try:
        print("🤖 generating caption...")
        cap = generate_caption(service, story_type)
        print(f"   headline      : {cap['headline']}")
        print(f"   subline       : {cap['subline']}")
        print(f"   cta           : {cap['cta']}")
        print(f"   feed_caption  : {cap['feed_caption'][:80]}...")
        print(f"   story_caption : {cap['story_caption']}")

        feed_rec  = post_one("IMAGE",   service, story_type, cap)
        story_rec = post_one("STORIES", service, story_type, cap)

        if DRY_RUN:
            print("\n💧 DRY_RUN done")
            return 0

        if not feed_rec and not story_rec:
            print("\n⏭  ไม่มีอะไรโพสต์ (skip ทั้ง feed และ story)")
            return 0

        parts: list[str] = []
        if feed_rec:
            link = feed_rec.get("ig_permalink") or f"id={feed_rec.get('ig_media_id', '')}"
            parts.append(f"feed → {link}")
        if story_rec:
            parts.append(f"story → id={story_rec.get('ig_media_id', '')}")

        _notify(
            f"📷 รู้ก่อนดี IG โพสต์แล้ว ({SERVICE_META[service]['label']})\n"
            f"{cap['headline']}\n{cap['subline']}\n"
            + "\n".join(parts)
        )
        print("\n✅ done")
        return 0

    except Exception as e:
        err = str(e)
        print(f"❌ Error: {err}")
        _notify(f"❌ รู้ก่อนดี IG Post Error ({service}): {err[:300]}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
