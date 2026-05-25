# -*- coding: utf-8 -*-
"""
gen_news.py — โพสต์ "ข่าว รู้ก่อนดี" อัตโนมัติรายวันลงหน้าเว็บ /news

ต่างจาก autopost.py (บทความ SEO แยกตามบริการ) ตรงที่ข่าวนี้พูดถึง
รู้ก่อนดี "ในภาพรวม" — โปรโมชั่น/voucher, วันสุขภาพ, สปอตไลต์บริการ,
ทิปรวม, อัปเดตบริษัท — โทนข่าวสั้น กระชับ ครอบทุก vertical

เก็บในตาราง posts เดิม โดยใช้ service='news' (sentinel) → แสดงที่ /news
รันทุกวันผ่าน GitHub Actions (ดู .github/workflows/gen_news.yml)
Company: บริษัท เจียรักษา จำกัด | roogondee.com
"""

import os
import re
import json
import time
from datetime import datetime, date

import anthropic

# reuse helpers จาก autopost — ไม่ต้องเขียนซ้ำ (FLUX, storage, revalidate, sb)
from autopost import (
    get_sb,
    generate_image,
    upload_image_to_storage,
    clean_content,
    trigger_revalidate,
    FORBIDDEN_TAGS,
    BKK_TZ,
    ANTHROPIC_KEY,
)
from notify import notify as _notify

TODAY = date.today()
TODAY_STR = TODAY.strftime("%Y-%m-%d")

# ─── NEWS TYPE ROTATION ──────────────────────────────────────────────────────
# วนตาม day-of-year เพื่อให้แต่ละวันได้มุมข่าวต่างกัน ไม่ซ้ำซาก
NEWS_TYPES = [
    {
        "key": "promo",
        "label": "โปรโมชั่น",
        "brief": (
            "ไฮไลต์ voucher ตรวจฟรีที่กำลังเปิดอยู่ของรู้ก่อนดี (GLP-1 ตรวจเบาหวาน FBS+HbA1c, "
            "STD/PrEP ตรวจ HIV+Syphilis, CKD ตรวจโปรตีนในปัสสาวะ, สุขภาพชาย/หญิง ปรึกษาแพทย์ฟรี) "
            "ชวนทำแบบประเมิน 2 นาทีเพื่อรับสิทธิ์ ตรวจที่ W Medical Hospital สมุทรสาคร"
        ),
    },
    {
        "key": "awareness",
        "label": "วันสุขภาพ",
        "brief": (
            "หยิบประเด็นสุขภาพตามฤดูกาล/วันสำคัญด้านสุขภาพ มาเชื่อมโยงกับบริการของรู้ก่อนดี "
            "ให้ความรู้สั้นๆ พร้อมชวนคัดกรองก่อนสาย"
        ),
    },
    {
        "key": "spotlight",
        "label": "สปอตไลต์บริการ",
        "brief": (
            "เจาะลึกหนึ่งบริการของรู้ก่อนดี อธิบายว่าใครควรตรวจ ตรวจอะไร ได้อะไร "
            "และรับสิทธิ์ฟรีอย่างไร"
        ),
    },
    {
        "key": "tips",
        "label": "ทิปสุขภาพ",
        "brief": (
            "รวมทิปสุขภาพที่ทำได้จริงในชีวิตประจำวัน 3-5 ข้อ ครอบคลุมหลายบริการ "
            "ปิดท้ายด้วยการชวนตรวจคัดกรองกับรู้ก่อนดี"
        ),
    },
    {
        "key": "update",
        "label": "อัปเดตรู้ก่อนดี",
        "brief": (
            "เล่าความเคลื่อนไหวของรู้ก่อนดีในภาพรวม เช่น บริการที่ครอบคลุม 7 ด้าน "
            "ความร่วมมือกับ W Medical Hospital สมุทรสาคร และช่องทางปรึกษา LINE @roogondee"
        ),
    },
]


def pick_news_type() -> dict:
    return NEWS_TYPES[TODAY.timetuple().tm_yday % len(NEWS_TYPES)]


# ─── DEDUP ───────────────────────────────────────────────────────────────────

def already_posted_today() -> bool:
    """กันโพสต์ข่าวซ้ำในวันเดียว — เช็คว่ามี news post ที่ published วันนี้แล้วหรือยัง"""
    sb = get_sb()
    res = (
        sb.table("posts")
        .select("id", count="exact")
        .eq("service", "news")
        .gte("published_at", f"{TODAY_STR}T00:00:00")
        .execute()
    )
    return (res.count or 0) > 0


# ─── COMPLIANCE (เบา — ครอบ mens/women/mind) ─────────────────────────────────
BANNED_WORDS = [
    "viagra", "cialis", "levitra", "sildenafil", "tadalafil", "vardenafil",
    "nebido", "sustanon", "testogel", "androgel",
    "รักษาหายขาด", "หายขาด", "การันตี", "100%", "ดีที่สุด", "อันดับ 1",
    "เพิ่มขนาด", "ยาฟรี", "แจกยา",
]


def compliance_issues(html: str) -> list[str]:
    lower = html.lower()
    return [w for w in BANNED_WORDS if w.lower() in lower]


# ─── VALIDATION (ข่าวสั้นกว่าบทความ) ─────────────────────────────────────────

def validate_news(html: str) -> list[str]:
    issues: list[str] = []
    lower = html.lower()
    plain = re.sub(r"<[^>]+>", " ", html)

    chars = len(plain.strip())
    if chars < 300:
        issues.append(f"ข่าวสั้นเกินไป ({chars} ตัวอักษร)")
    if chars > 6000:
        issues.append(f"ข่าวยาวเกินไป ({chars} ตัวอักษร)")
    if "<p" not in lower:
        issues.append("ขาด <p>")
    for tag in FORBIDDEN_TAGS:
        if tag in lower:
            issues.append(f"พบแท็กต้องห้าม: {tag}")
    if "**" in html or re.search(r"(^|\n)#{1,4}\s", html):
        issues.append("พบ Markdown residue")
    thai = sum(1 for c in plain if "฀" <= c <= "๿")
    latin = sum(1 for c in plain if c.isascii() and c.isalpha())
    if thai + latin > 0 and thai / (thai + latin) < 0.5:
        issues.append("อักษรไทยน้อยเกินไป")
    if "line" not in lower and "roogondee" not in lower and "รู้ก่อนดี" not in plain:
        issues.append("ขาด CTA (LINE/รู้ก่อนดี)")
    return issues


# ─── CLAUDE ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """คุณเป็นบรรณาธิการข่าวสุขภาพของเว็บไซต์ รู้ก่อนดี (roogondee.com)
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

รู้ก่อนดีให้บริการคัดกรองสุขภาพ 7 ด้าน: GLP-1 (ลดน้ำหนัก/เบาหวาน),
STD & PrEP HIV, CKD (โรคไต), ตรวจสุขภาพแรงงานต่างด้าว (B2B),
สุขภาพชายวัย 40+, สุขภาพเพศหญิง, สุขภาพจิต & ความสัมพันธ์
จุดเด่น: ทำแบบประเมินสั้นๆ รับ voucher ตรวจฟรี ตรวจกับ W Medical Hospital สมุทรสาคร
ช่องทางปรึกษา: LINE @roogondee

กฎการเขียนข่าว:
- ภาษาไทย กระชับ เป็นกันเอง น่าอ่านแบบข่าว ไม่ตัดสิน
- ความยาว 350-600 คำ
- Output เป็น HTML เท่านั้น ใช้ <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- ห้ามใส่ <!DOCTYPE>, <html>, <head>, <body>, <style>, <script>
- ปิดท้ายด้วย CTA ชวนทักไลน์ @roogondee หรือเข้า roogondee.com
- ห้ามระบุชื่อยาเฉพาะ, ห้ามคำว่า "รักษาหายขาด/การันตี/100%/ดีที่สุด"
- ไม่วินิจฉัยรายบุคคล เป็นข้อมูลเพื่อการศึกษาและชวนตรวจคัดกรอง

ตอบกลับเป็น JSON object เท่านั้น (ไม่มีข้อความอื่น) รูปแบบ:
{"title": "...", "slug": "english-kebab-case", "excerpt": "...", "meta_desc": "...", "focus_kw": "คำ, คำ", "body_html": "<h2>...</h2><p>...</p>"}
- slug เป็น a-z0-9 และ - เท่านั้น
- meta_desc 120-160 ตัวอักษร
- excerpt 1-2 ประโยค"""


def generate_news(news_type: dict) -> dict | None:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    user_prompt = (
        f"เขียนข่าวประเภท: {news_type['label']}\n"
        f"แนวทาง: {news_type['brief']}\n"
        f"วันที่: {TODAY_STR}\n\n"
        "เขียนข่าวใหม่สดสำหรับวันนี้ ตอบเป็น JSON ตามรูปแบบที่กำหนด"
    )

    last_err: Exception | None = None
    for attempt in range(3):
        try:
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )
            text = msg.content[0].text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*\n", "", text)
                text = re.sub(r"\n```\s*$", "", text).strip()
            data = json.loads(text)
            if all(k in data for k in ("title", "slug", "body_html")):
                return data
            last_err = ValueError("JSON ขาดฟิลด์ที่ต้องการ")
        except Exception as e:
            last_err = e
            print(f"  ↻ generate_news attempt {attempt + 1} failed: {e}")
        time.sleep(2 ** attempt)
    print(f"  ❌ generate_news ล้มเหลว: {last_err}")
    return None


# ─── SLUG ────────────────────────────────────────────────────────────────────

def make_slug(raw: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (raw or "news").lower()).strip("-")[:50] or "news"
    return f"news-{TODAY.strftime('%Y%m%d')}-{base}"


# ─── SAVE ────────────────────────────────────────────────────────────────────

def save_news(data: dict, html: str, image_url: str, news_type: dict) -> tuple[str | None, str]:
    sb = get_sb()
    slug = make_slug(data.get("slug", ""))
    post = {
        "title":        data["title"],
        "slug":         slug,
        "content":      html,
        "excerpt":      (data.get("excerpt") or data.get("meta_desc") or "")[:300],
        "service":      "news",
        "category":     news_type["label"],
        "focus_kw":     data.get("focus_kw", ""),
        "meta_desc":    data.get("meta_desc", ""),
        "image_url":    image_url or "",
        "status":       "published",
        "published_at": datetime.now(BKK_TZ).isoformat(),
    }
    res = sb.table("posts").upsert(post, on_conflict="slug").execute()
    return (res.data[0]["id"] if res.data else None), slug


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print(f"📰 รู้ก่อนดี News — {TODAY_STR}")

    if already_posted_today():
        print("✅ มีข่าววันนี้แล้ว — ข้าม")
        return

    news_type = pick_news_type()
    print(f"📋 ประเภทข่าววันนี้: {news_type['label']} ({news_type['key']})")

    data = generate_news(news_type)
    if not data:
        _notify("⚠️ รู้ก่อนดี News: generate ข่าวไม่สำเร็จวันนี้ — ตรวจสอบ gen_news")
        return

    html = clean_content(data["body_html"])

    banned = compliance_issues(html)
    if banned:
        print(f"  ❌ compliance ไม่ผ่าน: {banned}")
        _notify(f"⚠️ รู้ก่อนดี News ข้าม (compliance): {', '.join(banned)}")
        return

    issues = validate_news(html)
    if issues:
        print(f"  ❌ คุณภาพไม่ผ่าน: {issues}")
        _notify(f"⚠️ รู้ก่อนดี News ข้าม (validation): {' | '.join(issues)[:300]}")
        return
    print("  ✓ ตรวจคุณภาพ + compliance ผ่าน")

    print("  🎨 กำลัง generate รูป...")
    image_url = generate_image(data["title"], "news")
    if image_url:
        image_url = upload_image_to_storage(image_url, "news")

    print("  💾 บันทึกลง Supabase...")
    post_id, slug = save_news(data, html, image_url or "", news_type)
    print(f"  ✅ post_id: {post_id}")

    trigger_revalidate(slug)
    # revalidate index หน้า /news + หน้าแรก
    _revalidate_paths(["/news", "/"])

    url = f"roogondee.com/news/{slug}"
    _notify(f"📰 รู้ก่อนดี ข่าวใหม่ [{news_type['label']}]: {data['title']}\n{url}")
    print(f"🎉 เสร็จสิ้น — {url}")


def _revalidate_paths(paths: list[str]) -> None:
    import requests
    secret = os.environ.get("REVALIDATE_SECRET", "").strip()
    site = os.environ.get("SITE_URL", "https://roogondee.com").rstrip("/")
    if not secret:
        return
    try:
        q = "&".join([f"path={p}" for p in paths] + [f"secret={secret}"])
        requests.post(f"{site}/api/revalidate?{q}", timeout=15)
    except Exception as e:
        print(f"  ⚠️ revalidate /news failed: {e}")


if __name__ == "__main__":
    main()
