#!/usr/bin/env python3
"""Render the vitamin-drip course card (front + back) to print-ready PNGs.

Mirrors public/vitamin-course-card/index.html: 90x55mm Thai name-card size,
5-session course, brand palette + Sarabun/Prompt fonts. Output @300 DPI.

Usage: python3 scripts/vitamin_card_render.py
Outputs to public/vitamin-course-card/: front.png, back.png, preview.png
"""
import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

# ─── geometry ────────────────────────────────────────────────────────────────
DPI = 300
MM = DPI / 25.4                       # px per mm
def mm(v): return round(v * MM)

CARD_W, CARD_H = mm(90), mm(55)
RADIUS = mm(3.5)

# ─── brand palette (Little Secret Clinic — turquoise/teal) ─────────────────────
# Sampled from the LS butterfly logo (~#16A69A) and built into a tonal range.
FOREST = (10, 79, 73)      # deepest teal  (base / gradient start)
SAGE   = (16, 125, 116)    # mid teal      (gradient mid, table header)
MINT   = (22, 166, 154)    # primary teal  (logo colour, gradient end)
LEAF   = (165, 224, 218)   # light teal    (num-column highlight)
CREAM  = (248, 247, 245)   # neutral card back
WARM   = (235, 247, 245)
GOLD   = (22, 166, 154)    # accent now teal (logo is monochrome)
RTEXT  = (38, 70, 66)      # body text
MUTED  = (110, 140, 136)   # secondary text
WHITE  = (255, 255, 255)

# ─── fonts (download once, cache) ──────────────────────────────────────────────
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
GF = "https://raw.githubusercontent.com/google/fonts/main/ofl"
FONTS = {
    "sara-reg":  f"{GF}/sarabun/Sarabun-Regular.ttf",
    "sara-med":  f"{GF}/sarabun/Sarabun-Medium.ttf",
    "sara-semi": f"{GF}/sarabun/Sarabun-SemiBold.ttf",
    "sara-bold": f"{GF}/sarabun/Sarabun-Bold.ttf",
    "prompt-med":  f"{GF}/prompt/Prompt-Medium.ttf",
    "prompt-semi": f"{GF}/prompt/Prompt-SemiBold.ttf",
    "prompt-bold": f"{GF}/prompt/Prompt-Bold.ttf",
}

def _ensure(url, name):
    path = os.path.join(FONT_DIR, name)
    if os.path.exists(path):
        return path
    os.makedirs(FONT_DIR, exist_ok=True)
    print(f"  downloading font: {name}")
    req = urllib.request.Request(url, headers={"User-Agent": "roogondee-card/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r, open(path, "wb") as f:
        f.write(r.read())
    return path

_FP = {}
def _file(key):
    if key not in _FP:
        _FP[key] = _ensure(FONTS[key], FONTS[key].rsplit("/", 1)[1])
    return _FP[key]

def font(key, size_mm):
    return ImageFont.truetype(_file(key), size=round(size_mm * MM))

# ─── logo (optional real artwork) ──────────────────────────────────────────────
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                       "..", "public", "vitamin-course-card"))
_LOGO_CACHE = "unset"
def load_logo():
    """Return the brand logo as RGBA if public/vitamin-course-card/logo.png
    exists, else None (falls back to an 'LS' monogram)."""
    global _LOGO_CACHE
    if _LOGO_CACHE != "unset":
        return _LOGO_CACHE
    path = os.path.join(OUT_DIR, "logo.png")
    _LOGO_CACHE = Image.open(path).convert("RGBA") if os.path.exists(path) else None
    if _LOGO_CACHE is None:
        print("  note: logo.png not found — using 'LS' monogram placeholder")
    return _LOGO_CACHE

def fit_contain(img, max_w, max_h):
    r = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, round(img.width * r)), max(1, round(img.height * r))),
                      Image.LANCZOS)

# ─── helpers ───────────────────────────────────────────────────────────────────
def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=r, fill=255)
    return m

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def diagonal_gradient(w, h, stops):
    """stops: list of (pos0-1, color). Color along top-left -> bottom-right."""
    base = Image.new("RGB", (w, h))
    px = base.load()
    for y in range(h):
        for x in range(w):
            t = (x / w) * 0.62 + (y / h) * 0.38
            t = max(0.0, min(1.0, t))
            # find segment
            for i in range(len(stops) - 1):
                p0, c0 = stops[i]
                p1, c1 = stops[i + 1]
                if t <= p1 or i == len(stops) - 2:
                    seg = 0 if p1 == p0 else (t - p0) / (p1 - p0)
                    px[x, y] = lerp(c0, c1, max(0, min(1, seg)))
                    break
    return base

def text_tracked(draw, xy, s, fnt, fill, tracking=0):
    """Draw text with letter spacing (px). Returns total width."""
    x, y = xy
    for ch in s:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x - xy[0]

def dotted_line(draw, x0, x1, y, color, dot=mm(0.5), gap=mm(0.9), width=2):
    x = x0
    while x < x1:
        draw.line([(x, y), (min(x + dot, x1), y)], fill=color, width=width)
        x += dot + gap

# ─── FRONT ─────────────────────────────────────────────────────────────────────
def render_front():
    bg = diagonal_gradient(CARD_W, CARD_H,
                           [(0.0, FOREST), (0.58, SAGE), (1.0, lerp(MINT, WHITE, 0.05))])
    card = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    card.paste(bg, (0, 0))

    # watermark circle (bottom-right) + soft highlight (top-right)
    ov = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    od.ellipse([CARD_W - mm(28), CARD_H - mm(24), CARD_W + mm(14), CARD_H + mm(18)],
               fill=(255, 255, 255, 16))
    od.ellipse([CARD_W - mm(34), -mm(22), CARD_W + mm(16), mm(28)],
               fill=(149, 213, 178, 40))
    card = Image.alpha_composite(card, ov)
    d = ImageDraw.Draw(card)

    PAD = mm(4.5)

    # ---- brand (top-left): white chip holding the LS logo mark ----
    mark_d = mm(11)
    mx, my = PAD, mm(3.2)
    logo = load_logo()
    # white circular chip so the teal logo reads on the teal gradient
    d.ellipse([mx, my, mx + mark_d, my + mark_d], fill=WHITE)
    if logo is not None:
        inner = round(mark_d * 0.82)
        lg = fit_contain(logo, inner, inner)
        card.paste(lg, (round(mx + (mark_d - lg.width) / 2),
                        round(my + (mark_d - lg.height) / 2)), lg)
    else:
        # placeholder echoing the real logo: teal ring + serif LS monogram
        ring = max(2, mm(0.5))
        pad_r = mm(0.9)
        d.ellipse([mx + pad_r, my + pad_r, mx + mark_d - pad_r, my + mark_d - pad_r],
                  outline=MINT, width=ring)
        f_mark = font("sara-bold", 4.2)
        bb = d.textbbox((0, 0), "LS", font=f_mark)
        d.text((mx + mark_d / 2 - (bb[2] - bb[0]) / 2 - bb[0],
                my + mark_d / 2 - (bb[3] - bb[1]) / 2 - bb[1]),
               "LS", font=f_mark, fill=MINT)

    tx = mx + mark_d + mm(2.4)
    f_name = font("prompt-semi", 4.2)
    d.text((tx, my + mm(0.6)), "Little Secret", font=f_name, fill=WHITE)
    f_small = font("sara-med", 2.0)
    text_tracked(d, (tx + mm(0.3), my + mm(6.2)), "C L I N I C",
                 f_small, (255, 255, 255, 225), tracking=mm(0.4))

    # ---- badge (top-right): white chip, teal number ----
    bw, bh = mm(13), mm(13)
    bx, by = CARD_W - PAD - bw, mm(4)
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=mm(2), fill=WHITE)
    f_bnum = font("prompt-bold", 6.0)
    bb = d.textbbox((0, 0), "5", font=f_bnum)
    d.text((bx + bw / 2 - (bb[2] - bb[0]) / 2 - bb[0], by + mm(1.2)), "5",
           font=f_bnum, fill=MINT)
    f_bsp = font("sara-semi", 2.0)
    bb = d.textbbox((0, 0), "ครั้ง", font=f_bsp)
    d.text((bx + bw / 2 - (bb[2] - bb[0]) / 2 - bb[0], by + bh - mm(3.6)), "ครั้ง",
           font=f_bsp, fill=SAGE)

    # ---- title ----
    ty = mm(16.5)
    f_th = font("prompt-bold", 5.2)
    d.text((PAD, ty), "บัตรคอร์สวิตามิน", font=f_th, fill=WHITE)
    f_en = font("sara-med", 2.2)
    text_tracked(d, (PAD + mm(0.5), ty + mm(7.2)), "VITAMIN DRIP COURSE CARD",
                 f_en, (255, 255, 255, 220), tracking=mm(0.6))

    # ---- fields (bottom) ----
    f_k = font("sara-reg", 2.6)
    rows = ["ชื่อผู้รับบริการ", "สูตรวิตามิน", "เริ่มคอร์สวันที่"]
    base_y = CARD_H - mm(4) - len(rows) * mm(5.4)
    key_w = mm(23)
    for i, k in enumerate(rows):
        ry = base_y + i * mm(5.4)
        d.text((PAD, ry), k, font=f_k, fill=(255, 255, 255, 235))
        dotted_line(d, PAD + key_w, CARD_W - PAD, ry + mm(4.0),
                    (255, 255, 255, 150), width=max(1, mm(0.35)))

    card.putalpha(rounded_mask(CARD_W, CARD_H, RADIUS))
    return card

# ─── BACK ────────────────────────────────────────────────────────────────────
def render_back():
    card = Image.new("RGBA", (CARD_W, CARD_H), CREAM + (255,))
    d = ImageDraw.Draw(card)
    PADX = mm(4)

    # ---- header ----
    hy = mm(3.4)
    f_t = font("prompt-semi", 3.3)
    d.text((PADX, hy), "บันทึกการรับบริการ", font=f_t, fill=FOREST)
    f_s = font("sara-reg", 2.0)
    sw = d.textlength("Service Record", font=f_s)
    d.text((CARD_W - PADX - sw, hy + mm(1.0)), "Service Record", font=f_s, fill=MUTED)

    # ---- table ----
    tbl_x0, tbl_x1 = PADX, CARD_W - PADX
    tbl_y = mm(9.0)
    head_h = mm(6.2)
    row_h = mm(5.6)
    # columns: num | date | formula | provider
    c_num = mm(9)
    c_date = mm(22)
    c_prov = mm(27)
    inner = tbl_x1 - tbl_x0
    c_form = inner - c_num - c_date - c_prov
    cols = [
        ("ครั้งที่", c_num),
        ("วันที่รับบริการ", c_date),
        ("สูตรวิตามิน", c_form),
        ("ผู้ให้บริการ (ลงชื่อ)", c_prov),
    ]
    # header bg (rounded top)
    d.rounded_rectangle([tbl_x0, tbl_y, tbl_x1, tbl_y + head_h], radius=mm(1.2), fill=FOREST)
    d.rectangle([tbl_x0, tbl_y + mm(1.2), tbl_x1, tbl_y + head_h], fill=FOREST)
    f_h = font("prompt-med", 2.15)
    cx = tbl_x0
    for label, w in cols:
        bb = d.textbbox((0, 0), label, font=f_h)
        d.text((cx + w / 2 - (bb[2] - bb[0]) / 2 - bb[0],
                tbl_y + head_h / 2 - (bb[3] - bb[1]) / 2 - bb[1]),
               label, font=f_h, fill=WHITE)
        cx += w

    # body rows
    f_num = font("prompt-semi", 2.5)
    grid = (220, 211, 197)
    for r in range(5):
        ry = tbl_y + head_h + r * row_h
        # zebra
        if r % 2 == 1:
            d.rectangle([tbl_x0, ry, tbl_x1, ry + row_h], fill=(252, 250, 246))
        # num cell highlight
        d.rectangle([tbl_x0, ry, tbl_x0 + c_num, ry + row_h], fill=LEAF)
        bb = d.textbbox((0, 0), str(r + 1), font=f_num)
        d.text((tbl_x0 + c_num / 2 - (bb[2] - bb[0]) / 2 - bb[0],
                ry + row_h / 2 - (bb[3] - bb[1]) / 2 - bb[1]),
               str(r + 1), font=f_num, fill=FOREST)
        # horizontal grid
        d.line([(tbl_x0, ry + row_h), (tbl_x1, ry + row_h)], fill=grid, width=max(1, mm(0.25)))
    # vertical grid lines
    body_bottom = tbl_y + head_h + 5 * row_h
    cx = tbl_x0
    for _, w in cols:
        cx += w
        d.line([(cx, tbl_y + head_h), (cx, body_bottom)], fill=grid, width=max(1, mm(0.25)))
    # outer body border
    d.rectangle([tbl_x0, tbl_y + head_h, tbl_x1, body_bottom], outline=grid, width=max(1, mm(0.25)))

    # ---- footer ----
    fy = CARD_H - mm(4.6)
    d.line([(PADX, fy - mm(0.6)), (CARD_W - PADX, fy - mm(0.6))], fill=(226, 218, 203),
           width=max(1, mm(0.25)))
    f_f = font("sara-reg", 1.95)
    d.text((PADX, fy), "บัตรนี้ใช้เฉพาะผู้มีชื่อด้านหน้า · กรุณานำมาทุกครั้งที่รับบริการ",
           font=f_f, fill=MUTED)
    f_oa = font("prompt-semi", 1.95)
    ow = d.textlength("Little Secret Clinic", font=f_oa)
    d.text((CARD_W - PADX - ow, fy), "Little Secret Clinic", font=f_oa, fill=SAGE)

    card.putalpha(rounded_mask(CARD_W, CARD_H, RADIUS))
    return card

# ─── preview (both, side by side, on soft bg) ──────────────────────────────────
def render_preview(front, back):
    gap = mm(8)
    pad = mm(10)
    lbl_h = mm(7)
    W = pad * 2 + CARD_W * 2 + gap
    H = pad * 2 + CARD_H + lbl_h
    canvas = Image.new("RGB", (W, H), (233, 236, 232))
    d = ImageDraw.Draw(canvas)

    def drop(img, ox, oy):
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [ox, oy + mm(1.2), ox + CARD_W, oy + CARD_H + mm(1.2)],
            radius=RADIUS, fill=(13, 32, 21, 60))
        sh = sh.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(mm(1.2)))
        canvas.paste(sh, (0, 0), sh)
        canvas.paste(img, (ox, oy), img)

    drop(front, pad, pad)
    drop(back, pad + CARD_W + gap, pad)

    f_l = font("prompt-med", 2.6)
    for label, ox in [("ด้านหน้า / Front", pad),
                      ("ด้านหลัง / Back", pad + CARD_W + gap)]:
        lw = d.textlength(label, font=f_l)
        d.text((ox + CARD_W / 2 - lw / 2, pad + CARD_H + mm(1.6)), label,
               font=f_l, fill=(90, 110, 95))
    return canvas

# ─── main ──────────────────────────────────────────────────────────────────────
def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "public", "vitamin-course-card")
    out = os.path.abspath(out)
    os.makedirs(out, exist_ok=True)

    front = render_front()
    back = render_back()
    preview = render_preview(front, back)

    for img, name in [(front, "front.png"), (back, "back.png")]:
        img.save(os.path.join(out, name), dpi=(DPI, DPI))
    preview.save(os.path.join(out, "preview.png"), dpi=(150, 150))
    print(f"  saved front.png / back.png / preview.png -> {out}  ({CARD_W}x{CARD_H}px @ {DPI}dpi)")

if __name__ == "__main__":
    main()
