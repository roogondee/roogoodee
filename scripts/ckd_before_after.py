#!/usr/bin/env python3
"""
CKD before/after eGFR comparison graphic (1080x1080) — anonymized case study.

Builds an attention-grabbing, consultative-tone social card for the CKD pillar:
"ไตของคุณ อายุเท่าไหร่?" — shows an eGFR improving from G3a back to G2.

No patient-identifiable data is rendered (no name / HN / lab number) per PDPA.
Fonts: Sarabun (SIL OFL), cached in scripts/fonts/ (same as fb_story.py).

Usage:
    python3 scripts/ckd_before_after.py [--out /tmp/ckd_before_after.png]
"""
from __future__ import annotations

import argparse
import os

from PIL import Image, ImageDraw, ImageFont

# ── palette (brand) ───────────────────────────────────────────────────────────
FOREST   = (27, 67, 50)      # #1B4332 base
MINT     = (82, 183, 136)    # #52B788 primary
MINT_DK  = (45, 106, 79)
AMBER    = (214, 158, 46)    # before (caution)
AMBER_DK = (150, 105, 20)
RED      = (197, 73, 73)
WHITE    = (255, 255, 255)
CREAM    = (244, 249, 245)
INK      = (33, 47, 41)
MUTED    = (110, 130, 120)

W = H = 1080
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")


def _f(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size=size)


def _center(draw, text, font, cx, y, fill):
    w = draw.textlength(text, font=font)
    draw.text((cx - w / 2, y), text, font=font, fill=fill)


def _rrect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def build(out_path: str) -> str:
    reg   = lambda s: _f("Sarabun-Regular.ttf", s)
    bold  = lambda s: _f("Sarabun-Bold.ttf", s)
    black = lambda s: _f("Sarabun-ExtraBold.ttf", s)

    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)

    # top brand bar
    d.rectangle([0, 0, W, 96], fill=FOREST)
    d.text((48, 26), "รู้ก่อนดี(รู้งี้)", font=bold(44), fill=WHITE)
    # anonymized badge
    badge = "เคสตัวอย่าง"
    bw = d.textlength(badge, font=bold(30))
    _rrect(d, [W - bw - 96, 28, W - 40, 70], 20, MINT)
    d.text((W - bw - 68, 30), badge, font=bold(30), fill=FOREST)

    # hook headline
    _center(d, "ไตของคุณ อายุเท่าไหร่?", black(76), W / 2, 140, FOREST)
    _center(d, "ค่า eGFR คือคะแนนสอบประสิทธิภาพไต (เต็ม ~120)", reg(36), W / 2, 232, MUTED)
    _center(d, "ยิ่งต่ำ = ไตทำงานเหนื่อยขึ้น  •  ช่วงต้นมักไม่มีอาการ", reg(36), W / 2, 278, MUTED)

    # ── two cards ────────────────────────────────────────────────────────────
    card_y0, card_y1 = 350, 720
    cw = 430
    lx0 = 48
    rx0 = W - 48 - cw

    def card(x0, label, val, stage, desc, accent, accent_dk):
        _rrect(d, [x0, card_y0, x0 + cw, card_y1], 36, WHITE)
        _rrect(d, [x0, card_y0, x0 + cw, card_y0 + 70], 36, accent)
        d.rectangle([x0, card_y0 + 40, x0 + cw, card_y0 + 70], fill=accent)
        _center(d, label, bold(38), x0 + cw / 2, card_y0 + 12, WHITE)
        cx = x0 + cw / 2
        _center(d, "eGFR", reg(36), cx, card_y0 + 100, MUTED)
        _center(d, val, black(132), cx, card_y0 + 138, accent_dk)
        _rrect(d, [cx - 110, card_y0 + 290, cx + 110, card_y0 + 338], 24, accent)
        _center(d, stage, bold(34), cx, card_y0 + 294, WHITE)
        _center(d, desc, reg(30), cx, card_y0 + 348, MUTED)

    card(lx0, "ก่อน", "46.65", "ระยะ G3a", "ไตเสื่อมปานกลาง", AMBER, AMBER_DK)
    card(rx0, "หลัง 2 สัปดาห์", "62.61", "ระยะ G2", "เกือบปกติ", MINT, MINT_DK)

    # arrow between cards
    ay = (card_y0 + card_y1) // 2
    axc = (lx0 + cw + rx0) // 2
    d.ellipse([axc - 44, ay - 44, axc + 44, ay + 44], fill=FOREST)
    d.polygon([(axc - 14, ay - 22), (axc - 14, ay + 22), (axc + 22, ay)], fill=WHITE)
    _center(d, "+15.96", bold(30), axc, ay + 50, MINT_DK)

    # ── eGFR scale strip ───────────────────────────────────────────────────────
    sx0, sx1, sy = 70, W - 70, 800
    sw = sx1 - sx0
    # gradient-ish segments: G5..G1
    segs = [(0, 15, RED), (15, 30, (210, 120, 70)), (30, 45, AMBER),
            (45, 60, (170, 190, 120)), (60, 90, MINT), (90, 120, MINT_DK)]
    for lo, hi, col in segs:
        x_a = sx0 + sw * lo / 120
        x_b = sx0 + sw * hi / 120
        d.rectangle([x_a, sy, x_b, sy + 34], fill=col)
    d.rounded_rectangle([sx0, sy, sx1, sy + 34], radius=8, outline=WHITE, width=0)

    def marker(val, label, col):
        mx = sx0 + sw * val / 120
        d.polygon([(mx - 14, sy - 22), (mx + 14, sy - 22), (mx, sy)], fill=col)
        _center(d, label, bold(26), mx, sy - 54, col)

    marker(46.65, "ก่อน", AMBER_DK)
    marker(62.61, "หลัง", MINT_DK)
    for tick in (0, 15, 30, 45, 60, 90, 120):
        tx = sx0 + sw * tick / 120
        _center(d, str(tick), reg(24), tx, sy + 42, MUTED)

    # ── CTA footer ──────────────────────────────────────────────────────────
    _rrect(d, [48, 892, W - 48, 1032], 32, FOREST)
    d.text((84, 912), "รู้เลขก่อน ดูแลทันก่อนไตเสื่อมถาวร", font=bold(44), fill=WHITE)
    d.text((84, 970), "ตรวจคัดกรองไต (โปรตีนในปัสสาวะ) ฟรี — ทักแชทรับสิทธิ์", font=reg(34), fill=MINT)
    code = "RGD-CKD"
    cwd = d.textlength(code, font=black(40))
    _rrect(d, [W - cwd - 132, 905, W - 72, 965], 18, MINT)
    d.text((W - cwd - 102, 908), code, font=black(40), fill=FOREST)

    d.text((48, 1044), "* เคสตัวอย่าง ไม่ระบุตัวตน • ค่า eGFR ครั้งเดียวแกว่งได้ตามภาวะร่างกาย ควรตรวจซ้ำยืนยันกับแพทย์",
           font=reg(22), fill=MUTED)

    img.save(out_path, "PNG")
    return out_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/ckd_before_after.png")
    args = ap.parse_args()
    path = build(args.out)
    print(f"saved: {path}")
