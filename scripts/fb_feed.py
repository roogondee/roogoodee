"""
roogondee-autopost: fb_feed.py
รู้ก่อนดี — Facebook Page Feed daily poster (boost-ready)

ต่างจาก fb_story.py:
- โพสต์เป็น Feed post (ไม่หาย — boost ได้)
- รูป 1080x1080 (1:1 ฟีดมาตรฐาน)
- caption มีลิงก์ไป /quiz/{service} พร้อม UTM parameters
- log ลง fb_posts (ไม่ใช่ fb_stories) เพื่อกันซ้ำ

Required env (เหมือน fb_story.py):
  ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET,
  FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, SITE_BASE_URL

Optional:
  TOGETHER_API_KEY                  (ถ้าว่าง → gradient background)
  FEED_INCLUDE_MENS=1               เปิด mens vertical (default ปิด)
  FEED_FORCE_SERVICE=glp1|std|ckd   override (workflow_dispatch)
  FEED_DRY_RUN=1                    skip Graph API (save preview to /tmp)
"""

import io
import os
import sys
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from PIL import Image, ImageDraw, ImageFilter

# Reuse caption/font/background helpers from the story script — same pipeline,
# only the canvas size + post endpoint differ.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fb_story import (  # type: ignore
    SERVICE_META,
    STORY_TYPES,
    STORY_TYPE_BRIEF,
    generate_caption,
    load_fonts,
    fetch_flux_background,
    gradient_background,
    _wrap_text,
    _draw_text_block,
    get_sb,
    upload_image_to_storage,
)
from notify import notify as _notify

# ─── CONFIG ────────────────────────────────────────────────────────────────────

FB_PAGE_ID     = os.environ.get("FB_PAGE_ID", "").strip()
FB_PAGE_TOKEN  = os.environ.get("FB_PAGE_ACCESS_TOKEN", "").strip()
SITE_BASE      = os.environ.get("SITE_BASE_URL", "https://www.roogondee.com").rstrip("/")

INCLUDE_MENS   = os.environ.get("FEED_INCLUDE_MENS", "0") == "1"
FORCE_SERVICE  = os.environ.get("FEED_FORCE_SERVICE", "").strip().lower()
DRY_RUN        = os.environ.get("FEED_DRY_RUN", "0") == "1"

BKK_TZ    = ZoneInfo("Asia/Bangkok")
TODAY     = datetime.now(BKK_TZ).date()
TODAY_STR = TODAY.strftime("%Y-%m-%d")

FB_API = "https://graph.facebook.com/v19.0"

# Foreign B2B vertical skipped here too — feed boost targets consumers
ROTATION = ["glp1", "std", "ckd"]
if INCLUDE_MENS:
    ROTATION.append("mens")


def pick_service() -> str:
    if FORCE_SERVICE and FORCE_SERVICE in ROTATION:
        return FORCE_SERVICE
    # Offset by 1 so feed and story don't always cover the same service on the
    # same day — gives the page two different verticals per day.
    return ROTATION[(TODAY.toordinal() + 1) % len(ROTATION)]


def pick_story_type() -> str:
    return STORY_TYPES[TODAY.toordinal() % len(STORY_TYPES)]


# ─── DEDUP ─────────────────────────────────────────────────────────────────────

def already_posted_today(service: str) -> bool:
    try:
        sb = get_sb()
        res = (
            sb.table("fb_posts")
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


def log_post(record: dict) -> None:
    try:
        sb = get_sb()
        sb.table("fb_posts").insert(record).execute()
    except Exception as e:
        print(f"  ⚠️ log post failed: {e}")


# ─── 1:1 FEED COVER (1080x1080) ────────────────────────────────────────────────

def compose_feed(service: str, headline: str, subline: str, cta: str) -> bytes:
    """1080x1080 cover for Feed post — same visual language as story, square."""
    src = fetch_flux_background(service)
    if src is not None:
        # FLUX gives 1080x1920 → center-crop to 1080x1080
        top = (src.height - 1080) // 2
        bg = src.crop((0, top, 1080, top + 1080))
        bg = bg.filter(ImageFilter.GaussianBlur(radius=2))
        overlay_alpha = 130
    else:
        # Reuse gradient generator (1080x1920) then crop center 1080 row.
        full = gradient_background(service)
        top = (full.height - 1080) // 2
        bg = full.crop((0, top, 1080, top + 1080))
        overlay_alpha = 60

    overlay = Image.new("RGBA", bg.size, (0, 0, 0, overlay_alpha))
    img = Image.alpha_composite(bg.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    fonts = load_fonts()

    label = SERVICE_META[service]["label"]

    # Top brand pill (smaller than story since canvas is tighter)
    brand_text = "รู้ก่อนดี"
    bw = draw.textlength(brand_text, font=fonts["brand"])
    pad_x = 32
    pill_w = int(bw + pad_x * 2)
    pill_h = 92
    pill_x = 540 - pill_w // 2
    pill_y = 60
    draw.rounded_rectangle(
        (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h),
        radius=46, fill=(82, 183, 136),
    )
    draw.text((pill_x + pad_x, pill_y + 18), brand_text,
              font=fonts["brand"], fill=(255, 255, 255))

    # Service badge under brand pill
    badge_y = pill_y + pill_h + 16
    bw2 = draw.textlength(label, font=fonts["badge"])
    badge_w = int(bw2 + 48)
    badge_h = 70
    badge_x = 540 - badge_w // 2
    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h),
        radius=35, fill=(255, 255, 255),
    )
    draw.text((badge_x + 24, badge_y + 12), label,
              font=fonts["badge"], fill=(27, 67, 50))

    # Headline centered
    head_lines = _wrap_text(draw, headline, fonts["headline"], 940)[:3]
    head_h = sum(fonts["headline"].getbbox(ln)[3] - fonts["headline"].getbbox(ln)[1] + 12 for ln in head_lines)
    head_y = 540 - head_h // 2 - 40
    _draw_text_block(draw, head_lines, fonts["headline"], head_y,
                      fill=(255, 255, 255), line_gap=14)

    # Subline
    sub_y = head_y + head_h + 28
    sub_lines = _wrap_text(draw, subline, fonts["subline"], 860)[:2]
    _draw_text_block(draw, sub_lines, fonts["subline"], sub_y,
                      fill=(245, 245, 245), line_gap=8)

    # CTA pill at bottom
    cta_text = cta if cta else "ทักไลน์รับโค้ด"
    cw = draw.textlength(cta_text, font=fonts["cta"])
    cta_w = int(cw + 84)
    cta_h = 96
    cta_x = 540 - cta_w // 2
    cta_y = 880
    draw.rounded_rectangle(
        (cta_x, cta_y, cta_x + cta_w, cta_y + cta_h),
        radius=48, fill=(255, 255, 255),
    )
    draw.text((cta_x + 42, cta_y + 24), cta_text,
              font=fonts["cta"], fill=(27, 67, 50))

    # URL footer
    url_text = "roogondee.com"
    uw = draw.textlength(url_text, font=fonts["url"])
    draw.text((540 - uw / 2, 1000), url_text,
              font=fonts["url"], fill=(255, 255, 255))

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


# ─── CAPTION ASSEMBLY ──────────────────────────────────────────────────────────

# When the owner clicks "Boost post" on this Feed post, the boost will use this
# link's UTM. Keep utm_medium=organic_post so non-boosted reach stays separated
# from utm_medium=boost (set manually only after a boost is actually purchased).
def build_quiz_link(service: str) -> str:
    return (
        f"{SITE_BASE}/quiz/{service}"
        f"?utm_source=facebook&utm_medium=organic_post&utm_campaign=feed_{service}_{TODAY_STR}"
    )


def assemble_caption(service: str, base_caption: str) -> str:
    """Append quiz link + voucher line so the post is self-contained and
    every click ships UTM into /api/quiz."""
    link = build_quiz_link(service)
    return (
        f"{base_caption}\n\n"
        f"ทำแบบทดสอบ 1 นาที รับคูปองฟรี 👉 {link}\n"
        f"หรือทักไลน์ @roogondee"
    )


# ─── FACEBOOK FEED POST ────────────────────────────────────────────────────────

def fb_post_feed_photo(image_url: str, caption: str) -> str:
    """POST /{page-id}/photos with published=true + message — this creates a
    proper Feed post that can be boosted, unlike /photo_stories."""
    resp = requests.post(
        f"{FB_API}/{FB_PAGE_ID}/photos",
        data={
            "url":          image_url,
            "message":      caption,
            "published":    "true",
            "access_token": FB_PAGE_TOKEN,
        },
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"FB feed post {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    return data.get("post_id") or data.get("id", "")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main() -> int:
    print(f"📰 รู้ก่อนดี FB Feed — {TODAY_STR}")

    if not FB_PAGE_ID or not FB_PAGE_TOKEN:
        print("❌ ขาด FB_PAGE_ID หรือ FB_PAGE_ACCESS_TOKEN")
        return 1

    service    = pick_service()
    story_type = pick_story_type()
    print(f"🌿 service={service}  type={story_type}  (rotation={ROTATION})")

    if not DRY_RUN and already_posted_today(service):
        print(f"⏭  วันนี้ ({TODAY_STR}) feed-post {service} แล้ว — ข้าม")
        return 0

    try:
        print("🤖 generating caption...")
        cap = generate_caption(service, story_type)
        print(f"   headline: {cap['headline']}")
        print(f"   cta     : {cap['cta']}")

        print("🖼  composing 1080x1080 cover...")
        img_bytes = compose_feed(service, cap["headline"], cap["subline"], cap["cta"])
        print(f"   size: {len(img_bytes) / 1024:.0f} KB")

        full_caption = assemble_caption(service, cap["caption"])
        link_url = build_quiz_link(service)

        if DRY_RUN:
            out_path = f"/tmp/fb-feed-{TODAY_STR}-{service}.jpg"
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            print(f"💧 DRY_RUN: ไม่ยิง Graph API — รูปอยู่ที่ {out_path}")
            print("---- caption ----")
            print(full_caption)
            print("-----------------")
            return 0

        print("☁️  upload to Supabase Storage...")
        key = f"feed-{TODAY_STR}-{service}-{int(time.time())}"
        public_url = upload_image_to_storage(img_bytes, key)
        print(f"   {public_url}")

        print("📤 FB: publish feed photo post...")
        post_id = fb_post_feed_photo(public_url, full_caption)
        print(f"   post_id={post_id}")

        log_post({
            "posted_date": TODAY_STR,
            "service":     service,
            "story_type":  story_type,
            "fb_post_id":  post_id,
            "headline":    cap["headline"],
            "subline":     cap["subline"],
            "caption":     full_caption,
            "image_url":   public_url,
            "link_url":    link_url,
            "status":      "posted",
        })

        _notify(
            f"📰 รู้ก่อนดี Feed โพสต์แล้ว ({SERVICE_META[service]['label']})\n"
            f"{cap['headline']}\n→ boost ได้ที่ post_id={post_id}\n"
            f"link: {link_url}"
        )
        print("✅ done — โพสต์พร้อม boost จาก Page")
        return 0

    except Exception as e:
        err = str(e)
        print(f"❌ Error: {err}")
        _notify(f"❌ รู้ก่อนดี FB Feed Error ({service}): {err[:300]}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
