"""
roogondee: line_richmenu.py
รู้ก่อนดี (RuGonDee) — สร้าง + ติดตั้ง LINE OA rich menu ชี้เข้า LIFF quiz

Compose ภาพเมนู 2500x1686 (Pillow + Sarabun) แล้วติดตั้งผ่าน Messaging API:
  1. POST /v2/bot/richmenu                 สร้าง rich menu object (6 ปุ่ม)
  2. POST /v2/bot/richmenu/{id}/content    อัปโหลดภาพ
  3. POST /v2/bot/user/all/richmenu/{id}   ตั้งเป็น default ให้ผู้ติดตามทุกคน

Required env:
  LINE_CHANNEL_ACCESS_TOKEN     Messaging API token ของ @roogondee (ไม่ต้องใช้ตอน dry run)

Optional env:
  LIFF_QUIZ_ID                  default 2009899374-SVD8xJEn (LIFF app "roogondee Quiz")
  RICHMENU_DRY_RUN=1            compose ภาพ + JSON แล้วเซฟไว้ที่ /tmp ไม่ยิง API
  RICHMENU_CLEANUP=1            หลังตั้ง default สำเร็จ ลบ rich menu ตัวเก่าที่เหลือทิ้ง
"""

import json
import os
import sys
import urllib.request

import requests
from PIL import Image, ImageDraw, ImageFont

LINE_TOKEN   = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
LIFF_QUIZ_ID = os.environ.get("LIFF_QUIZ_ID", "2009899374-SVD8xJEn").strip()
DRY_RUN      = os.environ.get("RICHMENU_DRY_RUN", "0") == "1"
CLEANUP      = os.environ.get("RICHMENU_CLEANUP", "0") == "1"

LINE_API      = "https://api.line.me/v2/bot"
LINE_DATA_API = "https://api-data.line.me/v2/bot"

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# ─── LAYOUT ────────────────────────────────────────────────────────────────────
# Full-size rich menu 2500x1686, grid 3 คอลัมน์ x 2 แถว (ปุ่มละ ~833x843)

W, H = 2500, 1686
COLS, ROWS = 3, 2
CELL_W, CELL_H = W // COLS, H // ROWS  # 833 x 843


def liff_url(service: str | None, medium: str = "richmenu") -> str:
    base = f"https://liff.line.me/{LIFF_QUIZ_ID}"
    params = f"utm_source=line&utm_medium={medium}"
    if service:
        return f"{base}?service={service}&{params}"
    return f"{base}?{params}"


# ปุ่มเรียง ซ้าย→ขวา บน→ล่าง — ตัวแรกคือ hero (หน้าเลือกครบ 8 บริการ)
# mens/dna/foreign ไม่มีปุ่มตรง แต่เข้าถึงได้ผ่านหน้าเลือกของปุ่ม hero
BUTTONS: list[dict] = [
    {
        "title":    "เช็คสุขภาพฟรี",
        "subtitle": "แบบประเมิน 2 นาที รับ voucher",
        "hero":     True,
        "bg":       (27, 67, 50),      # forest
        "accent":   (82, 183, 136),    # mint
        "action":   {"type": "uri", "uri": liff_url(None), "label": "เช็คสุขภาพฟรี"},
    },
    {
        "title":    "GLP-1 ลดน้ำหนัก",
        "subtitle": "ตรวจเบาหวานฟรี 500฿",
        "bg":       (240, 253, 244),
        "accent":   (27, 67, 50),
        "action":   {"type": "uri", "uri": liff_url("glp1"), "label": "GLP-1"},
    },
    {
        "title":    "ตรวจ STD ลับ 100%",
        "subtitle": "HIV+ซิฟิลิสฟรี รู้ผล 1 ชม.",
        "bg":       (236, 244, 248),
        "accent":   (28, 67, 79),
        "action":   {"type": "uri", "uri": liff_url("std"), "label": "STD"},
    },
    {
        "title":    "สุขภาพผู้หญิง",
        "subtitle": "ปรึกษาสูตินรีแพทย์ฟรี",
        "bg":       (253, 242, 248),
        "accent":   (157, 23, 77),
        "action":   {"type": "uri", "uri": liff_url("women"), "label": "Women"},
    },
    {
        "title":    "สุขภาพใจ",
        "subtitle": "ปรึกษานักจิตวิทยาฟรี",
        "bg":       (245, 243, 255),
        "accent":   (91, 33, 182),
        "action":   {"type": "uri", "uri": liff_url("mind"), "label": "Mind"},
    },
    {
        "title":    "ปรึกษาทีมงาน",
        "subtitle": "ทักแชทได้เลย ฟรี ไม่ตัดสิน",
        "bg":       (255, 251, 235),
        "accent":   (146, 64, 14),
        "action":   {"type": "message", "text": "สวัสดีค่ะ ขอปรึกษาทีมงานหน่อยค่ะ", "label": "ปรึกษา"},
    },
]

# ─── THAI FONT (same Sarabun pattern as fb_story.py) ──────────────────────────

SARABUN_REGULAR = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf"
SARABUN_BOLD    = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf"
SARABUN_BLACK   = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-ExtraBold.ttf"


def _ensure_font(url: str, filename: str) -> str:
    path = os.path.join(FONT_DIR, filename)
    if os.path.isfile(path) and os.path.getsize(path) > 50_000:
        return path
    os.makedirs(FONT_DIR, exist_ok=True)
    print(f"  downloading font: {filename}")
    req = urllib.request.Request(url, headers={"User-Agent": "roogondee-richmenu/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp, open(path, "wb") as f:
        f.write(resp.read())
    return path


def load_fonts() -> dict[str, ImageFont.FreeTypeFont]:
    reg   = _ensure_font(SARABUN_REGULAR, "Sarabun-Regular.ttf")
    bold  = _ensure_font(SARABUN_BOLD,    "Sarabun-Bold.ttf")
    black = _ensure_font(SARABUN_BLACK,   "Sarabun-ExtraBold.ttf")
    return {
        "hero_title": ImageFont.truetype(black, size=110),
        "hero_sub":   ImageFont.truetype(reg,   size=56),
        "hero_badge": ImageFont.truetype(bold,  size=48),
        "title":      ImageFont.truetype(black, size=76),
        "subtitle":   ImageFont.truetype(reg,   size=48),
        "brand":      ImageFont.truetype(bold,  size=40),
    }


# ─── COMPOSE ──────────────────────────────────────────────────────────────────

def _rounded(draw: ImageDraw.ImageDraw, box: tuple, radius: int, fill: tuple):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def compose_image() -> Image.Image:
    fonts = load_fonts()
    img = Image.new("RGB", (W, H), (240, 253, 244))
    draw = ImageDraw.Draw(img)

    pad = 28
    for i, btn in enumerate(BUTTONS):
        col, row = i % COLS, i // COLS
        x0, y0 = col * CELL_W, row * CELL_H
        x1, y1 = x0 + CELL_W, y0 + CELL_H
        box = (x0 + pad, y0 + pad, x1 - pad, y1 - pad)
        _rounded(draw, box, radius=44, fill=btn["bg"])

        cx = (x0 + x1) // 2
        if btn.get("hero"):
            # แถบ badge บนสุด
            badge_text = "ฟรี ไม่มีค่าใช้จ่าย"
            bb = draw.textbbox((0, 0), badge_text, font=fonts["hero_badge"])
            bw, bh = bb[2] - bb[0], bb[3] - bb[1]
            badge_box = (cx - bw // 2 - 36, y0 + pad + 70, cx + bw // 2 + 36, y0 + pad + 70 + bh + 44)
            _rounded(draw, badge_box, radius=(bh + 44) // 2, fill=btn["accent"])
            draw.text((cx - bw // 2, badge_box[1] + 16), badge_text, font=fonts["hero_badge"], fill=(255, 255, 255))

            draw.text((cx, y0 + CELL_H // 2 + 10), btn["title"], font=fonts["hero_title"],
                      fill=(255, 255, 255), anchor="mm")
            draw.text((cx, y0 + CELL_H // 2 + 120), btn["subtitle"], font=fonts["hero_sub"],
                      fill=(209, 250, 229), anchor="mm")
            draw.text((cx, y1 - pad - 70), "รู้ก่อนดี(รู้งี้) x โรงพยาบาลพันธมิตร", font=fonts["brand"],
                      fill=(148, 210, 189), anchor="mm")
        else:
            # จุดสี accent เป็น marker ด้านบนของการ์ด
            dot_r = 26
            draw.ellipse((cx - dot_r, y0 + pad + 96 - dot_r, cx + dot_r, y0 + pad + 96 + dot_r),
                         fill=btn["accent"])
            draw.text((cx, y0 + CELL_H // 2 - 10), btn["title"], font=fonts["title"],
                      fill=(31, 41, 55), anchor="mm")
            draw.text((cx, y0 + CELL_H // 2 + 84), btn["subtitle"], font=fonts["subtitle"],
                      fill=(107, 114, 128), anchor="mm")

    return img


def build_richmenu_object() -> dict:
    areas = []
    for i, btn in enumerate(BUTTONS):
        col, row = i % COLS, i // COLS
        action = dict(btn["action"])
        areas.append({
            "bounds": {"x": col * CELL_W, "y": row * CELL_H, "width": CELL_W, "height": CELL_H},
            "action": action,
        })
    return {
        "size": {"width": W, "height": H},
        "selected": True,                      # เปิดเมนูค้างไว้เป็น default ตอนเข้าแชท
        "name": "roogondee-liff-quiz-v1",
        "chatBarText": "เมนู | เช็คสุขภาพฟรี",
        "areas": areas,
    }


# ─── INSTALL VIA MESSAGING API ────────────────────────────────────────────────

def _headers(content_type: str = "application/json") -> dict:
    return {"Authorization": f"Bearer {LINE_TOKEN}", "Content-Type": content_type}


def install(menu: dict, image_bytes: bytes, content_type: str) -> str:
    r = requests.post(f"{LINE_API}/richmenu", headers=_headers(), json=menu, timeout=30)
    if r.status_code != 200:
        raise SystemExit(f"create richmenu failed: {r.status_code} {r.text}")
    rich_menu_id = r.json()["richMenuId"]
    print(f"  created rich menu: {rich_menu_id}")

    r = requests.post(f"{LINE_DATA_API}/richmenu/{rich_menu_id}/content",
                      headers=_headers(content_type), data=image_bytes, timeout=60)
    if r.status_code != 200:
        raise SystemExit(f"upload image failed: {r.status_code} {r.text}")
    print("  image uploaded")

    r = requests.post(f"{LINE_API}/user/all/richmenu/{rich_menu_id}", headers=_headers(), timeout=30)
    if r.status_code != 200:
        raise SystemExit(f"set default failed: {r.status_code} {r.text}")
    print("  set as default for all followers")
    return rich_menu_id


def cleanup_old(keep_id: str):
    r = requests.get(f"{LINE_API}/richmenu/list", headers=_headers(), timeout=30)
    if r.status_code != 200:
        print(f"  (cleanup skipped: list failed {r.status_code})")
        return
    for m in r.json().get("richmenus", []):
        mid = m.get("richMenuId")
        if mid and mid != keep_id:
            d = requests.delete(f"{LINE_API}/richmenu/{mid}", headers=_headers(), timeout=30)
            print(f"  deleted old rich menu {mid}: {d.status_code}")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print(f"line_richmenu: LIFF={LIFF_QUIZ_ID} dry_run={DRY_RUN} cleanup={CLEANUP}")
    menu = build_richmenu_object()
    img = compose_image()

    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    image_bytes = buf.getvalue()
    content_type = "image/png"
    print(f"  image composed: {len(image_bytes) // 1024} KB")
    if len(image_bytes) > 1024 * 1024:
        # LINE จำกัดภาพ rich menu ที่ 1 MB
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        image_bytes = buf.getvalue()
        content_type = "image/jpeg"
        print(f"  over 1MB — fell back to JPEG: {len(image_bytes) // 1024} KB")

    if DRY_RUN:
        img_path = "/tmp/richmenu_preview.png"
        json_path = "/tmp/richmenu_object.json"
        img.save(img_path)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(menu, f, ensure_ascii=False, indent=2)
        print(f"  DRY RUN — preview: {img_path}, object: {json_path}")
        return

    if not LINE_TOKEN:
        raise SystemExit("LINE_CHANNEL_ACCESS_TOKEN is required (or set RICHMENU_DRY_RUN=1)")

    rich_menu_id = install(menu, image_bytes, content_type)
    if CLEANUP:
        cleanup_old(rich_menu_id)
    print(f"done — rich menu {rich_menu_id} is live")


if __name__ == "__main__":
    sys.exit(main())
