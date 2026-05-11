"""
roogondee-autopost: fb_story.py
รู้ก่อนดี (RuGonDee) — Facebook Page Story daily poster
หมุน 4 verticals (glp1/std/ckd/+optional mens), gen caption + 9:16 cover ทุกวัน
แล้วโพสต์เป็น Facebook Page Story (24-hour ephemeral) ผ่าน Graph API.

Required env:
  ANTHROPIC_API_KEY
  TOGETHER_API_KEY                  (optional — ถ้าว่างจะใช้ gradient background)
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET
  FB_PAGE_ID
  FB_PAGE_ACCESS_TOKEN              ต้องมี pages_manage_posts
  SITE_BASE_URL                     (default https://www.roogondee.com)

Optional env:
  STORY_INCLUDE_MENS=1              เปิด mens vertical (default ปิด)
  STORY_FORCE_SERVICE=glp1|std|ckd  override การหมุนวัน (สำหรับ workflow_dispatch)
  STORY_DRY_RUN=1                   ทำทุกขั้น ยกเว้นยิง Graph API
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

ANTHROPIC_KEY  = os.environ["ANTHROPIC_API_KEY"]
TOGETHER_KEY   = os.environ.get("TOGETHER_API_KEY", "").strip()
SUPABASE_URL   = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_SECRET"]
FB_PAGE_ID     = os.environ.get("FB_PAGE_ID", "").strip()
FB_PAGE_TOKEN  = os.environ.get("FB_PAGE_ACCESS_TOKEN", "").strip()
SITE_BASE      = os.environ.get("SITE_BASE_URL", "https://www.roogondee.com").rstrip("/")

INCLUDE_MENS   = os.environ.get("STORY_INCLUDE_MENS", "0") == "1"
FORCE_SERVICE  = os.environ.get("STORY_FORCE_SERVICE", "").strip().lower()
DRY_RUN        = os.environ.get("STORY_DRY_RUN", "0") == "1"

BKK_TZ    = ZoneInfo("Asia/Bangkok")
TODAY     = datetime.now(BKK_TZ).date()
TODAY_STR = TODAY.strftime("%Y-%m-%d")

FB_API   = "https://graph.facebook.com/v19.0"
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# ─── SERVICE ROTATION ──────────────────────────────────────────────────────────

# foreign B2B vertical ไม่เหมาะกับ Stories (target HR องค์กร ไม่ใช่ผู้บริโภค)
ROTATION = ["glp1", "std", "ckd"]
if INCLUDE_MENS:
    ROTATION.append("mens")

SERVICE_META: dict[str, dict] = {
    "glp1": {
        "label":         "GLP-1 & ลดน้ำหนัก",
        "voucher_hint":  "ตรวจ FBS+HbA1c ฟรี (มูลค่า 500฿)",
        "color_top":     (82, 183, 136),    # mint
        "color_bottom":  (27, 67, 50),       # forest
        "image_prompt":  ("healthy active Thai woman walking in park, fresh vegetables and fruits on table, "
                           "soft natural light, mint green and white tones, clean minimalist healthcare aesthetic, "
                           "vertical 9:16 framing, professional photo, no text, no logos"),
    },
    "std": {
        "label":         "ตรวจสุขภาพทางเพศ",
        "voucher_hint":  "ตรวจ HIV+ซิฟิลิส ฟรี รู้ผล 1 ชม.",
        "color_top":     (66, 133, 165),
        "color_bottom":  (28, 67, 79),
        "image_prompt":  ("modern medical clinic interior, soft teal and white tones, Thai young adult professional "
                           "looking at phone, calm clean environment, healthcare aesthetic, vertical 9:16 framing, "
                           "professional photo, no text, no logos"),
    },
    "ckd": {
        "label":         "ดูแลไต CKD",
        "voucher_hint":  "ตรวจปัสสาวะวัดโปรตีนรั่ว ฟรี",
        "color_top":     (90, 137, 209),
        "color_bottom":  (27, 50, 80),
        "image_prompt":  ("calm hospital consultation room, Thai senior holding glass of water, soft blue and white tones, "
                           "kidney health awareness, professional healthcare environment, vertical 9:16 framing, "
                           "professional photo, no text, no logos"),
    },
    "mens": {
        "label":         "สุขภาพชายวัย 40+",
        "voucher_hint":  "ตรวจฮอร์โมนชายภายใต้แพทย์",
        "color_top":     (61, 84, 124),
        "color_bottom":  (24, 32, 53),
        "image_prompt":  ("Thai man aged 45-55 in business casual, thoughtful expression looking out window, navy and slate tones, "
                           "professional lifestyle, fully clothed, no shirtless, no couples, vertical 9:16 framing, "
                           "professional photo, no text, no logos"),
    },
}

# วน 5 รูปแบบเรื่อง — แต่ละแบบให้ headline สไตล์ต่างกัน
STORY_TYPES = ["fact", "question", "tip", "voucher", "myth"]

STORY_TYPE_BRIEF = {
    "fact":     "บอกข้อเท็จจริงสุขภาพที่หลายคนไม่รู้ พร้อมตัวเลข/สถิติเป็นจุดเริ่มสะดุดตา",
    "question": "ตั้งคำถามชวนคิดที่กลุ่มเป้าหมายอยากตอบ (เน้น pain point)",
    "tip":      "แนะนำเทคนิค/พฤติกรรมง่าย ๆ ที่ทำได้วันนี้",
    "voucher":  "เน้นโปรของวอเชอร์ฟรี ชวนทักไลน์รับโค้ด",
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


def already_posted_today(service: str) -> bool:
    """กันยิงซ้ำถ้า workflow ถูก trigger ซ้ำในวันเดียวกัน"""
    try:
        sb = get_sb()
        res = (
            sb.table("fb_stories")
            .select("id")
            .eq("posted_date", TODAY_STR)
            .eq("service", service)
            .eq("status", "posted")
            .limit(1)
            .execute()
        )
        return bool(res.data)
    except Exception as e:
        print(f"  ⚠️ ตรวจซ้ำไม่ได้ (สมมติว่ายังไม่โพสต์): {e}")
        return False


def log_story(record: dict) -> None:
    try:
        sb = get_sb()
        sb.table("fb_stories").insert(record).execute()
    except Exception as e:
        print(f"  ⚠️ log story failed: {e}")


def upload_image_to_storage(image_bytes: bytes, key: str) -> str:
    sb = get_sb()
    file_path = f"fb-stories/{key}.jpg"
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
- มีประโยค "ภายใต้การดูแลของแพทย์ที่ W Medical Hospital" อย่างน้อย 1 ครั้งในใน caption"""

SYSTEM_PROMPT = """คุณเป็นแอดมินเพจสุขภาพ "รู้ก่อนดี (รู้งี้)" / roogondee.com
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร
เขียน Facebook Story ภาษาไทย กระชับ คล้ายเพื่อนคุยให้ฟัง — ไม่แข็ง ไม่ขายตรง

ส่งคืนเป็น JSON เท่านั้น (ไม่มีคำอธิบาย ไม่มี markdown fence) ตาม schema:
{
  "headline": "ข้อความใหญ่ในสตอรี่ 4-8 คำ ตัวสะดุดตา",
  "subline":  "ขยายความ 1 ประโยค 8-16 คำ",
  "caption":  "caption ฉบับเต็มแบบลงโพสต์ 2-4 บรรทัด ≤320 ตัวอักษร พร้อม CTA ทักไลน์",
  "cta":      "ประโยค CTA สั้น ๆ ≤6 คำ เช่น 'ทักไลน์รับโค้ดฟรี'"
}

กฎ:
- headline + subline จะถูก render บนรูป → อย่าใช้ emoji เลย
- caption ใส่ emoji ได้ไม่เกิน 2 ตัว
- ห้าม markdown (** ## - *) ทุกฟิลด์
- ห้ามคำชวนตัดสินรูปร่าง (เช่น "อ้วน", "พุงยื่น", "น่าเกลียด")
- ลิงก์ใน caption ใช้ roogondee.com หรือชื่อ LINE @roogondee เท่านั้น"""


def _client():
    return anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def generate_caption(service: str, story_type: str) -> dict:
    meta = SERVICE_META[service]
    brief = STORY_TYPE_BRIEF[story_type]

    system = SYSTEM_PROMPT
    if service == "mens":
        system += MENS_COMPLIANCE_BLOCK

    user = f"""วันนี้สร้าง Facebook Story สำหรับ vertical: {meta['label']}
สไตล์: {story_type} — {brief}

ข้อมูลโปร: {meta['voucher_hint']}
สถานที่ตรวจ: W Medical Hospital สมุทรสาคร
ลิงก์เว็บ: {SITE_BASE}

สำคัญ:
- หลีกเลี่ยง headline ซ้ำเดิม (ลองมุมใหม่ทุกวัน)
- ใช้น้ำเสียงคุยกันเป็นกันเอง
- ส่งคืน JSON ตาม schema เท่านั้น"""

    from compliance import (
        check_caption_compliance,
        check_thai_language,
        review_thai_with_llm,
    )

    last_err: Exception | None = None
    last_data: dict | None = None
    client = _client()
    for attempt in range(3):
        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=900,
                messages=[{"role": "user", "content": user}],
                system=system,
            )
            text = msg.content[0].text.strip()
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```\s*$", "", text)
            data = json.loads(text)
            for key in ("headline", "subline", "caption", "cta"):
                if not isinstance(data.get(key), str) or not data[key].strip():
                    raise ValueError(f"missing/empty field: {key}")
                data[key] = data[key].strip()

            if service == "mens":
                blob = "\n".join([data["headline"], data["subline"], data["caption"]])
                ok, issues = check_caption_compliance(blob, "mens")
                if not ok:
                    raise ValueError(f"mens compliance fail: {issues}")

            # Thai language QA on every visible field (headline + subline + caption).
            blob = "\n".join([data["headline"], data["subline"], data["caption"]])
            ok1, issues1 = check_thai_language(blob)
            if not ok1:
                raise ValueError(f"Thai language blocklist fail: {issues1}")

            ok2, issues2 = review_thai_with_llm(blob, anthropic_client=client)
            if not ok2:
                # Advisory — record but keep trying for a cleaner caption.
                # On the final attempt we accept it (Layer 1 cleared).
                print(f"  ⚠️ Thai language LLM review (try {attempt + 1}): {issues2}")
                last_data = data
                if attempt < 2:
                    raise ValueError(f"Thai language LLM review: {issues2}")
                print(f"  ℹ️ ใช้ caption รอบสุดท้าย (Layer 2 ทักแต่ผ่าน Layer 1)")

            return data
        except Exception as e:
            last_err = e
            print(f"  ↻ caption attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** attempt)

    if last_data is not None:
        # All 3 attempts cleared Layer 1 but Layer 2 kept flagging — publish anyway.
        return last_data
    raise RuntimeError(f"generate_caption failed: {last_err}")


# ─── THAI FONT (download once, cache to /tmp) ─────────────────────────────────

# Sarabun: SIL OFL 1.1 — bundled at runtime to avoid committing TTF blobs
SARABUN_REGULAR = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf"
SARABUN_BOLD    = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf"
SARABUN_BLACK   = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-ExtraBold.ttf"


def _ensure_font(url: str, filename: str) -> str:
    path = os.path.join(FONT_DIR, filename)
    if os.path.isfile(path) and os.path.getsize(path) > 50_000:
        return path
    os.makedirs(FONT_DIR, exist_ok=True)
    print(f"  ⬇️  downloading font: {filename}")
    req = urllib.request.Request(url, headers={"User-Agent": "roogondee-fb-story/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp, open(path, "wb") as f:
        f.write(resp.read())
    return path


def load_fonts() -> dict[str, ImageFont.FreeTypeFont]:
    reg   = _ensure_font(SARABUN_REGULAR, "Sarabun-Regular.ttf")
    bold  = _ensure_font(SARABUN_BOLD,    "Sarabun-Bold.ttf")
    black = _ensure_font(SARABUN_BLACK,   "Sarabun-ExtraBold.ttf")
    return {
        "brand":    ImageFont.truetype(bold,  size=46),
        "badge":    ImageFont.truetype(bold,  size=38),
        "headline": ImageFont.truetype(black, size=92),
        "subline":  ImageFont.truetype(reg,   size=44),
        "cta":      ImageFont.truetype(bold,  size=52),
        "url":      ImageFont.truetype(reg,   size=34),
    }


# ─── BACKGROUND IMAGE (FLUX → fallback gradient) ──────────────────────────────

def fetch_flux_background(service: str) -> Image.Image | None:
    if not TOGETHER_KEY:
        return None
    prompt = SERVICE_META[service]["image_prompt"]
    try:
        resp = requests.post(
            "https://api.together.xyz/v1/images/generations",
            headers={"Authorization": f"Bearer {TOGETHER_KEY}", "Content-Type": "application/json"},
            json={
                "model": "black-forest-labs/FLUX.1-schnell",
                "prompt": prompt,
                "width": 1080, "height": 1920,
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
        if img.size != (1080, 1920):
            img = img.resize((1080, 1920), Image.LANCZOS)
        print(f"  🎨 FLUX background ok ({img.size[0]}x{img.size[1]})")
        return img
    except Exception as e:
        print(f"  ⚠️ FLUX failed, ใช้ gradient: {e}")
        return None


def gradient_background(service: str) -> Image.Image:
    top    = SERVICE_META[service]["color_top"]
    bottom = SERVICE_META[service]["color_bottom"]
    img = Image.new("RGB", (1080, 1920), color=top)
    px = img.load()
    for y in range(1920):
        t = y / 1919
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(1080):
            px[x, y] = (r, g, b)
    return img


# ─── COMPOSE STORY IMAGE (1080x1920) ──────────────────────────────────────────

def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont,
               max_width: int) -> list[str]:
    """Greedy word-wrap that respects Thai (no spaces) by falling back to char-wrap."""
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
    # char-by-char fallback (Thai)
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
        # drop shadow for legibility
        for ox, oy in ((-2, 2), (2, 2), (-2, -2), (2, -2), (0, 3)):
            draw.text((x + ox, y + oy), line, font=font, fill=shadow)
        draw.text((x, y), line, font=font, fill=fill)
        bbox = font.getbbox(line)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def compose_story(service: str, headline: str, subline: str, cta: str) -> bytes:
    bg = fetch_flux_background(service)
    if bg is not None:
        # Soft blur photo backgrounds for text legibility; skip on flat gradient
        bg = bg.filter(ImageFilter.GaussianBlur(radius=2))
        overlay_alpha = 130
    else:
        bg = gradient_background(service)
        overlay_alpha = 60

    overlay = Image.new("RGBA", bg.size, (0, 0, 0, overlay_alpha))
    img = Image.alpha_composite(bg.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    fonts = load_fonts()

    label = SERVICE_META[service]["label"]

    # Top brand bar (mint pill) — extra headroom for Thai upper vowels (ู ี ิ ฯ)
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

    # Service badge (under brand pill)
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

    # Headline (centered, ~y=720)
    head_lines = _wrap_text(draw, headline, fonts["headline"], 960)
    head_lines = head_lines[:3]
    head_h = sum(fonts["headline"].getbbox(ln)[3] - fonts["headline"].getbbox(ln)[1] + 12 for ln in head_lines)
    head_y = 760 - head_h // 2
    _draw_text_block(draw, head_lines, fonts["headline"], head_y,
                      fill=(255, 255, 255), line_gap=14)

    # Subline (centered, below headline)
    sub_y = head_y + head_h + 40
    sub_lines = _wrap_text(draw, subline, fonts["subline"], 880)
    sub_lines = sub_lines[:3]
    _draw_text_block(draw, sub_lines, fonts["subline"], sub_y,
                      fill=(245, 245, 245), line_gap=10)

    # CTA pill (bottom)
    cta_text = cta if cta else "ทักไลน์รับโค้ด"
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

    # URL footer
    url_text = "roogondee.com  •  LINE @roogondee"
    uw = draw.textlength(url_text, font=fonts["url"])
    draw.text((540 - uw / 2, 1770), url_text,
              font=fonts["url"], fill=(255, 255, 255))

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


# ─── FACEBOOK GRAPH API ───────────────────────────────────────────────────────

def fb_upload_unpublished_photo(image_url: str) -> str:
    """Step 1/2: upload เป็นรูป unpublished แล้วได้ photo_id"""
    resp = requests.post(
        f"{FB_API}/{FB_PAGE_ID}/photos",
        data={
            "url":           image_url,
            "published":     "false",
            "access_token":  FB_PAGE_TOKEN,
        },
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"FB photo upload {resp.status_code}: {resp.text[:300]}")
    photo_id = resp.json().get("id")
    if not photo_id:
        raise RuntimeError(f"FB photo upload missing id: {resp.text[:300]}")
    return photo_id


def fb_publish_photo_story(photo_id: str) -> str:
    """Step 2/2: publish photo_id เป็น Story"""
    resp = requests.post(
        f"{FB_API}/{FB_PAGE_ID}/photo_stories",
        data={
            "photo_id":     photo_id,
            "access_token": FB_PAGE_TOKEN,
        },
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"FB photo_stories {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    return data.get("post_id") or data.get("id", "")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main() -> int:
    print(f"📸 รู้ก่อนดี FB Story — {TODAY_STR}")

    if not FB_PAGE_ID or not FB_PAGE_TOKEN:
        print("❌ ขาด FB_PAGE_ID หรือ FB_PAGE_ACCESS_TOKEN")
        return 1

    service    = pick_service(TODAY)
    story_type = pick_story_type(TODAY)
    print(f"🌿 service={service}  type={story_type}  (rotation={ROTATION})")

    if not DRY_RUN and already_posted_today(service):
        print(f"⏭  วันนี้ ({TODAY_STR}) โพสต์ {service} แล้ว — ข้าม")
        return 0

    try:
        print("🤖 generating caption...")
        cap = generate_caption(service, story_type)
        print(f"   headline: {cap['headline']}")
        print(f"   subline : {cap['subline']}")
        print(f"   cta     : {cap['cta']}")

        print("🖼  composing 1080x1920 cover...")
        img_bytes = compose_story(service, cap["headline"], cap["subline"], cap["cta"])
        print(f"   size: {len(img_bytes) / 1024:.0f} KB")

        if DRY_RUN:
            out_path = f"/tmp/fb-story-{TODAY_STR}-{service}.jpg"
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            print(f"💧 DRY_RUN: ไม่ยิง Graph API — รูปอยู่ที่ {out_path}")
            print("---- caption ----")
            print(cap["caption"])
            print("-----------------")
            return 0

        print("☁️  upload to Supabase Storage...")
        key = f"{TODAY_STR}-{service}-{int(time.time())}"
        public_url = upload_image_to_storage(img_bytes, key)
        print(f"   {public_url}")

        print("📤 FB: upload unpublished photo...")
        photo_id = fb_upload_unpublished_photo(public_url)
        print(f"   photo_id={photo_id}")

        print("📤 FB: publish as Story...")
        story_id = fb_publish_photo_story(photo_id)
        print(f"   story_id={story_id}")

        log_story({
            "posted_date": TODAY_STR,
            "service":     service,
            "story_type":  story_type,
            "fb_photo_id": photo_id,
            "fb_story_id": story_id,
            "headline":    cap["headline"],
            "subline":     cap["subline"],
            "caption":     cap["caption"],
            "image_url":   public_url,
            "link_url":    SITE_BASE,
            "status":      "posted",
        })

        _notify(
            f"📸 รู้ก่อนดี Story โพสต์แล้ว ({SERVICE_META[service]['label']})\n"
            f"{cap['headline']}\n{cap['subline']}\n→ story_id={story_id}"
        )
        print("✅ done")
        return 0

    except Exception as e:
        err = str(e)
        print(f"❌ Error: {err}")
        _notify(f"❌ รู้ก่อนดี FB Story Error ({service}): {err[:300]}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
