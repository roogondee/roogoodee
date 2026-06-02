"""
roogondee-autopost: news_hero.py
รู้ก่อนดี (RuGonDee) — สร้างรูป hero ของโพสต์ข่าว/บล็อกใหม่ แบบตัวอักษรไทยคมชัด

ทำไมต้องมีสคริปต์นี้:
  รูป hero เดิมบางตัวถูกเจนด้วย AI ทั้งใบ (รวมตัวอักษร) → ตัวอักษรเพี้ยนเป็น
  glyph คล้าย CJK อ่านไม่ออก ไม่ใช่ภาษาไทย. สคริปต์นี้แยกสองขั้นตอน:
    1) เจน "พื้นหลังล้วน ไม่มีตัวอักษร" (FLUX) — เลี่ยงปัญหา text rendering ของ AI
    2) วาดข้อความไทยทับด้วย Pillow + ฟอนต์ Sarabun (เหมือน flow ของ fb_story.py)
  ได้ตัวอักษรไทยที่ถูกต้อง 100% ทุกครั้ง.

ขนาดผลลัพธ์: 1200x624 (landscape blog/OG hero) — ตรงกับรูปเดิมในตาราง posts.

Required env (ตอน --apply เท่านั้น):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET                               service-role key (อัป storage + อัปเดต posts)

Optional env:
  TOGETHER_API_KEY                              ถ้าว่าง → ใช้ gradient background (ไม่มีรูปคน)

Usage:
  # ดูตัวอย่างก่อน (ไม่อัป ไม่แตะ DB) — เซฟไป /tmp
  python scripts/news_hero.py --slug news-20260530-... --dry-run

  # override ข้อความ (ถ้าไม่ใส่ จะดึง title จากตาราง posts มาเป็น headline)
  python scripts/news_hero.py --slug ... --headline "..." --subline "..." --dry-run

  # ทำจริง: เจน → อัป Supabase storage → อัปเดต posts.image_url
  python scripts/news_hero.py --slug ... --apply
"""

import argparse
import io
import os
import sys
import urllib.request
import uuid

import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─── CONFIG ────────────────────────────────────────────────────────────────────

W, H = 1200, 624  # landscape blog/OG hero (ตรงกับรูปเดิม)

MINT   = (82, 183, 136)   # #52B788
FOREST = (27, 67, 50)     # #1B4332

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# Sarabun: SIL OFL 1.1 — bundled at runtime to avoid committing TTF blobs
SARABUN_REGULAR = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf"
SARABUN_BOLD    = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf"
SARABUN_BLACK   = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-ExtraBold.ttf"

# พื้นหลังล้วน "ไม่มีตัวอักษร" — กุญแจสำคัญคือ no text / no letters / no logos
DEFAULT_BG_PROMPT = (
    "modern bright hospital interior, friendly Thai female doctor in white coat holding a tablet, "
    "soft natural light, clean mint green and white tones, professional healthcare photography, "
    "wide landscape framing, shallow depth of field, "
    "absolutely no text, no letters, no words, no captions, no logos, no watermark, no signage"
)


# ─── THAI FONT (download once, cache to scripts/fonts) ────────────────────────

def _ensure_font(url: str, filename: str) -> str:
    path = os.path.join(FONT_DIR, filename)
    if os.path.isfile(path) and os.path.getsize(path) > 50_000:
        return path
    os.makedirs(FONT_DIR, exist_ok=True)
    print(f"  downloading font: {filename}")
    req = urllib.request.Request(url, headers={"User-Agent": "roogondee-news-hero/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp, open(path, "wb") as f:
        f.write(resp.read())
    return path


def load_fonts() -> dict:
    reg   = _ensure_font(SARABUN_REGULAR, "Sarabun-Regular.ttf")
    bold  = _ensure_font(SARABUN_BOLD,    "Sarabun-Bold.ttf")
    black = _ensure_font(SARABUN_BLACK,   "Sarabun-ExtraBold.ttf")
    return {
        "brand":    ImageFont.truetype(bold,  size=34),
        "headline": ImageFont.truetype(black, size=64),
        "subline":  ImageFont.truetype(reg,   size=32),
        "cta":      ImageFont.truetype(bold,  size=30),
    }


# ─── BACKGROUND (FLUX → fallback gradient) ────────────────────────────────────

def fetch_flux_background(prompt: str) -> Image.Image | None:
    key = os.environ.get("TOGETHER_API_KEY", "").strip()
    if not key:
        return None
    try:
        resp = requests.post(
            "https://api.together.xyz/v1/images/generations",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": "black-forest-labs/FLUX.1-schnell",
                "prompt": prompt,
                "width": 1200, "height": 624,
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
        if img.size != (W, H):
            img = img.resize((W, H), Image.LANCZOS)
        print(f"  FLUX background ok ({img.size[0]}x{img.size[1]})")
        return img
    except Exception as e:
        print(f"  FLUX failed, using gradient: {e}")
        return None


def gradient_background() -> Image.Image:
    """Diagonal-ish mint -> forest gradient (top-left bright -> bottom-right deep)."""
    img = Image.new("RGB", (W, H), color=MINT)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        r = int(MINT[0] * (1 - t) + FOREST[0] * t)
        g = int(MINT[1] * (1 - t) + FOREST[1] * t)
        b = int(MINT[2] * (1 - t) + FOREST[2] * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img


# ─── TEXT LAYOUT ──────────────────────────────────────────────────────────────

def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont,
               max_width: int) -> list[str]:
    """Greedy word-wrap; falls back to char-wrap for Thai (spaceless) runs."""
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


def _draw_lines(draw: ImageDraw.ImageDraw, lines: list[str], font: ImageFont.FreeTypeFont,
                x: int, y: int, fill=(255, 255, 255), shadow=(0, 0, 0, 170),
                line_gap: int = 10) -> int:
    for line in lines:
        for ox, oy in ((-2, 2), (2, 2), (-2, -2), (2, -2), (0, 3)):
            draw.text((x + ox, y + oy), line, font=font, fill=shadow)
        draw.text((x, y), line, font=font, fill=fill)
        bbox = font.getbbox(line)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def compose_hero(headline: str, subline: str, cta: str, bg_prompt: str) -> bytes:
    bg = fetch_flux_background(bg_prompt)
    if bg is not None:
        bg = bg.filter(ImageFilter.GaussianBlur(radius=2))
    else:
        bg = gradient_background()

    img = bg.convert("RGBA")

    # Left-side legibility scrim: opaque on the left, fading to clear on the right
    # so a subject on the right stays visible while left-aligned text stays readable.
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    spx = scrim.load()
    for x in range(W):
        t = x / (W - 1)
        # 165 alpha at far left -> 0 by ~70% width
        a = int(max(0, 165 * (1 - t / 0.7)))
        for y in range(H):
            spx[x, y] = (10, 30, 22, a)
    img = Image.alpha_composite(img, scrim).convert("RGB")

    draw = ImageDraw.Draw(img)
    fonts = load_fonts()

    margin_x = 64

    # Brand pill (top-left) — full wordmark
    brand_text = "รู้ก่อนดี(รู้งี้)"
    bw = draw.textlength(brand_text, font=fonts["brand"])
    pad_x, pill_h = 26, 64
    pill_y = 56
    draw.rounded_rectangle(
        (margin_x, pill_y, margin_x + int(bw + pad_x * 2), pill_y + pill_h),
        radius=32, fill=MINT,
    )
    draw.text((margin_x + pad_x, pill_y + 13), brand_text,
              font=fonts["brand"], fill=(255, 255, 255))

    # Headline (left-aligned, wraps within left ~60% of width)
    max_text_w = int(W * 0.62)
    head_lines = _wrap_text(draw, headline, fonts["headline"], max_text_w)[:3]
    head_y = pill_y + pill_h + 46
    y = _draw_lines(draw, head_lines, fonts["headline"], margin_x, head_y, line_gap=12)

    # Subline
    if subline:
        sub_lines = _wrap_text(draw, subline, fonts["subline"], max_text_w)[:2]
        y = _draw_lines(draw, sub_lines, fonts["subline"], margin_x, y + 18,
                        fill=(238, 245, 240), line_gap=8)

    # CTA pill (bottom-left)
    cta_text = cta or "ทำแบบประเมินฟรี • LINE @roogondee"
    cw = draw.textlength(cta_text, font=fonts["cta"])
    cta_h = 64
    cta_y = H - cta_h - 56
    draw.rounded_rectangle(
        (margin_x, cta_y, margin_x + int(cw + 64), cta_y + cta_h),
        radius=32, fill=(255, 255, 255),
    )
    draw.text((margin_x + 32, cta_y + 14), cta_text,
              font=fonts["cta"], fill=FOREST)

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


# ─── SUPABASE (fetch title / upload / update) ─────────────────────────────────

def _get_sb():
    from supabase import create_client
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SECRET"]
    return create_client(url, key)


def fetch_post_title(sb, slug: str) -> str | None:
    res = sb.table("posts").select("title").eq("slug", slug).single().execute()
    return (res.data or {}).get("title") if res.data else None


def upload_image(sb, image_bytes: bytes) -> str:
    file_path = f"blog/{uuid.uuid4()}.jpg"
    sb.storage.from_("images").upload(
        file_path,
        image_bytes,
        {"content-type": "image/jpeg", "upsert": "true"},
    )
    return sb.storage.from_("images").get_public_url(file_path)


def update_post_image(sb, slug: str, image_url: str) -> None:
    sb.table("posts").update({"image_url": image_url}).eq("slug", slug).execute()


# ─── MAIN ───────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description="สร้างรูป hero ของโพสต์ข่าว/บล็อกใหม่ (ตัวอักษรไทยคมชัด)")
    ap.add_argument("--slug", required=True, help="slug ของโพสต์ในตาราง posts")
    ap.add_argument("--headline", default=None, help="ข้อความหัวข้อ (default: ดึง title จาก DB)")
    ap.add_argument("--subline", default="", help="ข้อความรอง (optional)")
    ap.add_argument("--cta", default="", help="ข้อความปุ่ม CTA (optional)")
    ap.add_argument("--bg-prompt", default=DEFAULT_BG_PROMPT, help="FLUX prompt สำหรับพื้นหลัง (ต้องไม่มีตัวอักษร)")
    ap.add_argument("--out", default=None, help="path เซฟไฟล์ตัวอย่าง (default /tmp/<slug>.jpg)")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true", help="เจน+เซฟไฟล์อย่างเดียว ไม่อัป ไม่แตะ DB")
    g.add_argument("--apply", action="store_true", help="อัป Supabase storage + อัปเดต posts.image_url")
    args = ap.parse_args()

    headline = args.headline
    sb = None

    # ถ้าต้อง apply หรือไม่ได้ส่ง headline มา → ต้องคุย DB
    if args.apply or headline is None:
        try:
            sb = _get_sb()
        except KeyError as e:
            print(f"ERROR: ต้องตั้ง env {e} (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET)")
            return 2
        if headline is None:
            headline = fetch_post_title(sb, args.slug)
            if not headline:
                print(f"ERROR: หา title ของ slug '{args.slug}' ในตาราง posts ไม่เจอ — ส่ง --headline มาเองได้")
                return 2
            print(f"  headline (จาก DB): {headline}")

    print("composing hero image...")
    img_bytes = compose_hero(headline, args.subline, args.cta, args.bg_prompt)

    out_path = args.out or f"/tmp/{args.slug}.jpg"
    with open(out_path, "wb") as f:
        f.write(img_bytes)
    print(f"  saved preview -> {out_path} ({len(img_bytes)} bytes)")

    if args.apply:
        print("uploading to Supabase storage...")
        public_url = upload_image(sb, img_bytes)
        print(f"  uploaded -> {public_url}")
        update_post_image(sb, args.slug, public_url)
        print(f"  posts.image_url updated for slug '{args.slug}'")
    else:
        print("dry-run: ไม่อัป ไม่แตะ DB (ใช้ --apply เพื่อทำจริง)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
