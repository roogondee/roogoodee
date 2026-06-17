# -*- coding: utf-8 -*-
"""
gen_news.py — โพสต์ "ข่าว รู้ก่อนดี" อัตโนมัติรายวันลงหน้าเว็บ /news

ต่างจาก autopost.py (บทความ SEO แยกตามบริการ) ตรงที่ข่าวนี้หมุนตาม pillar
รายวัน (วน 7 ด้านครบใน 1 สัปดาห์) + มุมข่าว 5 แบบ (โปร/วันสุขภาพ/สปอตไลต์/
ทิป/อัปเดต) — แต่ละข่าวถูกแท็ก news_pillar เพื่อให้ /news กรอง + แสดง badge ได้

แหล่งข่าวเป็นแบบ "ไฮบริด": วันคู่ดึงข่าวจริงด้วย Claude web search แล้วเรียบเรียง
ใหม่ + อ้างอิงแหล่งที่มา / วันคี่เขียน owned content จากข้อมูลรู้ก่อนดี

หลังเผยแพร่ลงเว็บแล้ว จะโพสต์อัตโนมัติไป Facebook Page + LINE OA (ถ้าตั้ง token)
โดยใช้โค้ดร่วมกับ fb_caption.py / line_broadcast.py และ mark ตัวกันโพสต์ซ้ำ
เพื่อไม่ให้ cron รายวัน (18:00) หยิบข่าวเดิมไปโพสต์อีก

เก็บในตาราง posts เดิม โดยใช้ service='news' (sentinel) → แสดงที่ /news
รันทุกวันผ่าน GitHub Actions (ดู .github/workflows/gen_news.yml)
Company: บริษัท เจียรักษา จำกัด | roogondee.com

ENV (ตัวเลือก):
  GEN_NEWS_DRY_RUN=1     — สร้าง preview พิมพ์ออกจอ ไม่เขียน DB / ไม่โพสต์โซเชียล
  GEN_NEWS_FORCE_PILLAR  — บังคับ pillar (glp1|std|ckd|foreign|mens|women|mind)
  GEN_NEWS_FORCE_WEB=0|1 — บังคับโหมดแหล่งข่าว (1=web search, 0=owned)
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
from compliance import check_caption_compliance
from notify import notify as _notify

TODAY = date.today()
TODAY_STR = TODAY.strftime("%Y-%m-%d")
YDAY = TODAY.timetuple().tm_yday  # day-of-year 1..366

DRY_RUN = os.environ.get("GEN_NEWS_DRY_RUN", "").strip() in ("1", "true", "yes")

# ─── PILLAR ROTATION ─────────────────────────────────────────────────────────
# หมุน 1 pillar/วัน → ครบทั้ง 7 ด้านภายใน 1 สัปดาห์ แท็กไว้ใน posts.news_pillar
PILLARS = ["glp1", "std", "ckd", "foreign", "mens", "women", "mind"]

# ข้อมูลต่อ pillar: label (ชื่อไทย), focus (มุมเนื้อหา), search (คำค้นข่าวจริง),
# compliance (กฎเพิ่มสำหรับ vertical ที่ละเอียดอ่อน — แนบเข้า system prompt)
PILLAR_META: dict[str, dict] = {
    "glp1": {
        "label": "GLP-1 ลดน้ำหนัก/เบาหวาน",
        "focus": "ควบคุมน้ำหนัก เบาหวานชนิดที่ 2 น้ำตาลในเลือด FBS/HbA1c ภายใต้การดูแลของแพทย์",
        "search": "เบาหวานชนิดที่ 2 การควบคุมน้ำหนัก ยากลุ่ม GLP-1 น้ำตาลในเลือด ข่าวสุขภาพ",
        "compliance": "",
    },
    "std": {
        "label": "STD & PrEP HIV",
        "focus": "โรคติดต่อทางเพศสัมพันธ์ HIV ซิฟิลิส PrEP การตรวจคัดกรองและป้องกัน safe space ไม่ตัดสิน",
        "search": "โรคติดต่อทางเพศสัมพันธ์ HIV PrEP ซิฟิลิส การป้องกัน ข่าวสุขภาพ",
        "compliance": "",
    },
    "ckd": {
        "label": "CKD โรคไตเรื้อรัง",
        "focus": "โรคไตเรื้อรัง การตรวจโปรตีนในปัสสาวะ eGFR การชะลอไตเสื่อม กลุ่มเสี่ยงเบาหวาน/ความดัน",
        "search": "โรคไตเรื้อรัง ตรวจไต โปรตีนในปัสสาวะ eGFR ชะลอไตเสื่อม ข่าวสุขภาพ",
        "compliance": "",
    },
    "foreign": {
        "label": "ตรวจสุขภาพแรงงานต่างด้าว",
        "focus": "ตรวจสุขภาพแรงงานต่างด้าว/ใบอนุญาตทำงาน สำหรับ HR และนายจ้างในสมุทรสาคร เน้นความสะดวกหมู่คณะ",
        "search": "ตรวจสุขภาพแรงงานต่างด้าว ใบอนุญาตทำงาน กฎหมายแรงงานต่างด้าว ไทย ข่าว",
        "compliance": (
            "นี่เป็นเนื้อหา B2B สำหรับ HR/นายจ้าง: อ้างอิงรายการโรคต้องห้ามตามกฎหมายให้ถูกต้อง "
            "ห้ามอ้างว่า HIV เป็นเหตุห้ามทำงาน ห้ามให้ข้อมูลกฎหมายที่ไม่ถูกต้อง"
        ),
    },
    "mens": {
        "label": "สุขภาพชายวัย 40+",
        "focus": "พลังงาน อารมณ์ ฮอร์โมนเพศชาย วัยทอง (andropause) ในเชิงให้ความรู้ ภายใต้การดูแลของแพทย์",
        "search": "สุขภาพชายวัย 40 ฮอร์โมนเพศชาย วัยทอง andropause สุขภาพต่อมลูกหมาก ข่าว",
        "compliance": (
            "บังคับ: ห้ามชื่อยา ED/ฮอร์โมน (viagra, cialis, sildenafil, tadalafil, nebido ฯลฯ) "
            "ห้ามคำเชิงสมรรถภาพทางเพศ/เพิ่มขนาด/อึดทน ห้ามอวดอ้างเกินจริง (รักษาหายขาด/การันตี/100%) "
            "ต้องมีวลี 'ภายใต้การดูแลของแพทย์' อย่างน้อย 1 ครั้ง เน้น Pillar A (พลังงาน/อารมณ์/ฮอร์โมนเชิง lifestyle) ไม่ใช่เรื่องเพศ"
        ),
    },
    "women": {
        "label": "สุขภาพเพศหญิง",
        "focus": "HPV/แปปสเมียร์ การตรวจภายใน ตกขาว ประจำเดือน วัยหมดประจำเดือน ภายใต้การดูแลของสูตินรีแพทย์",
        "search": "สุขภาพสตรี มะเร็งปากมดลูก HPV ตรวจภายใน วัยหมดประจำเดือน ข่าวสุขภาพ",
        "compliance": (
            "เน้นให้ความรู้ เป็นส่วนตัว ไม่ตัดสิน ภายใต้การดูแลของสูตินรีแพทย์ "
            "ห้ามอวดอ้างเกินจริง ประเด็นเลือดออกผิดปกติให้แนะนำพบแพทย์โดยเร็ว"
        ),
    },
    "mind": {
        "label": "สุขภาพจิต & ความสัมพันธ์",
        "focus": "ความเครียด อารมณ์ ความสัมพันธ์ การดูแลใจ โดยผู้เชี่ยวชาญที่มีใบอนุญาต (นักจิตวิทยา/จิตแพทย์)",
        "search": "สุขภาพจิต ความเครียด ภาวะซึมเศร้า วิตกกังวล การดูแลใจ ข่าวสุขภาพ",
        "compliance": (
            "บังคับ (ละเอียดอ่อน): ห้ามคำ trigger (ฆ่าตัวตาย/อยากตาย/ไม่อยากอยู่/จบชีวิต) "
            "ห้ามคำตีตรา (บ้า/จิตป่วย/เพี้ยน) ห้ามวินิจฉัยรายบุคคล ห้ามชื่อยาจิตเวช "
            "ใช้คำ 'ผู้เชี่ยวชาญ/นักจิตวิทยา/จิตแพทย์' โทนแบบ soft launch (กำลังเปิดรับ ปรึกษาได้เร็วๆ นี้) "
            "ถ้าจำเป็นต้องเอ่ยถึงภาวะวิกฤต ให้ระบุสายด่วนสุขภาพจิต 1323 (กรมสุขภาพจิต ฟรี 24 ชม.)"
        ),
    },
}


def pick_pillar() -> str:
    forced = os.environ.get("GEN_NEWS_FORCE_PILLAR", "").strip().lower()
    if forced in PILLAR_META:
        return forced
    return PILLARS[YDAY % len(PILLARS)]


# ─── NEWS TYPE ROTATION ──────────────────────────────────────────────────────
# มุมข่าว 5 แบบ — วนตาม day-of-year เพื่อให้แต่ละวันได้มุมต่างกัน
NEWS_TYPES = [
    {"key": "promo",     "label": "โปรโมชั่น",        "brief": "ไฮไลต์ voucher ตรวจฟรีของบริการนี้ ชวนทำแบบประเมิน 2 นาทีเพื่อรับสิทธิ์ ตรวจที่ W Medical Hospital สมุทรสาคร"},
    {"key": "awareness", "label": "วันสุขภาพ",        "brief": "หยิบประเด็นสุขภาพตามฤดูกาล/วันสำคัญด้านสุขภาพมาเชื่อมโยงกับบริการนี้ ให้ความรู้สั้นๆ พร้อมชวนคัดกรองก่อนสาย"},
    {"key": "spotlight", "label": "สปอตไลต์บริการ",   "brief": "เจาะลึกบริการนี้ อธิบายว่าใครควรตรวจ ตรวจอะไร ได้อะไร และรับสิทธิ์ฟรีอย่างไร"},
    {"key": "tips",      "label": "ทิปสุขภาพ",        "brief": "รวมทิปสุขภาพที่ทำได้จริงในชีวิตประจำวัน 3-5 ข้อ ที่เกี่ยวข้องกับบริการนี้ ปิดท้ายด้วยการชวนตรวจคัดกรอง"},
    {"key": "update",    "label": "อัปเดตรู้ก่อนดี",  "brief": "เล่าความเคลื่อนไหว/ความครอบคลุมของบริการนี้กับรู้ก่อนดี ความร่วมมือกับ W Medical Hospital สมุทรสาคร และช่องทาง LINE @roogondee"},
]


def pick_news_type() -> dict:
    return NEWS_TYPES[YDAY % len(NEWS_TYPES)]


def use_web_source() -> bool:
    forced = os.environ.get("GEN_NEWS_FORCE_WEB", "").strip()
    if forced in ("0", "1"):
        return forced == "1"
    return YDAY % 2 == 0  # วันคู่ = ข่าวจริง (web search), วันคี่ = owned content


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


def _plain(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html or "")


def compliance_issues(html: str, pillar: str) -> list[str]:
    lower = html.lower()
    issues = [w for w in BANNED_WORDS if w.lower() in lower]
    # per-pillar gate (mens/mind enforced by compliance.check_caption_compliance)
    ok, pillar_issues = check_caption_compliance(_plain(html), pillar)
    if not ok:
        issues.extend(pillar_issues)
    return issues


# ─── VALIDATION (ข่าวสั้นกว่าบทความ) ─────────────────────────────────────────

def validate_news(html: str) -> list[str]:
    issues: list[str] = []
    lower = html.lower()
    plain = _plain(html)

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


# ─── WEB SEARCH RESEARCH (โหมดข่าวจริง) ──────────────────────────────────────

def research_pillar(pillar: str) -> tuple[str, list[str]]:
    """ดึงข่าว/ความรู้สุขภาพล่าสุดของ pillar ด้วย Claude web search.
    คืน (สรุปภาษาไทย, รายการ URL แหล่งที่มา). ล้มเหลว → ('', []) แล้ว fallback owned."""
    meta = PILLAR_META[pillar]
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    system = (
        "คุณเป็นผู้ช่วยวิจัยข่าวสุขภาพ ค้นเว็บหาข่าว/งานวิจัย/ประกาศด้านสุขภาพที่ "
        "'ใหม่และน่าเชื่อถือ' เกี่ยวกับหัวข้อที่ระบุ แล้วสรุปเป็นภาษาไทย 3-5 ข้อ "
        "อ้างอิงข้อมูลที่ตรวจสอบได้จริง ห้ามแต่งเติม ระบุชื่อ/ลิงก์แหล่งที่มาเสมอ"
    )
    user = (
        f"ค้นหาข่าว/ความรู้สุขภาพล่าสุด (ปี {TODAY.year}) เกี่ยวกับ: {meta['search']}\n"
        "สรุปประเด็นเด่น 3-5 ข้อเป็นภาษาไทยพร้อมลิงก์แหล่งที่มา"
    )
    texts: list[str] = []
    sources: list[str] = []
    messages = [{"role": "user", "content": user}]
    try:
        for _ in range(4):  # เผื่อ server tool loop ส่ง pause_turn
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=system,
                tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 5}],
                messages=messages,
            )
            for block in msg.content:
                btype = getattr(block, "type", "")
                if btype == "text":
                    texts.append(block.text)
                elif btype == "web_search_tool_result":
                    results = getattr(block, "content", None)
                    if isinstance(results, list):
                        for r in results:
                            u = getattr(r, "url", None)
                            if u and u not in sources:
                                sources.append(u)
            if msg.stop_reason == "pause_turn":
                messages = [
                    {"role": "user", "content": user},
                    {"role": "assistant", "content": msg.content},
                ]
                continue
            break
    except Exception as e:
        print(f"  ⚠️ web search ล้มเหลว ({e}) → fallback owned content")
        return "", []

    brief = "\n".join(t.strip() for t in texts if t.strip()).strip()
    return brief, sources[:5]


# ─── CLAUDE: COMPOSE NEWS ────────────────────────────────────────────────────

def build_system_prompt(pillar: str) -> str:
    meta = PILLAR_META[pillar]
    base = f"""คุณเป็นบรรณาธิการข่าวสุขภาพของเว็บไซต์ รู้ก่อนดี (roogondee.com)
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

ข่าววันนี้โฟกัสที่บริการ: {meta['label']}
ประเด็นที่ครอบคลุม: {meta['focus']}
จุดเด่นรู้ก่อนดี: ทำแบบประเมินสั้นๆ รับ voucher ตรวจฟรี ตรวจกับ W Medical Hospital สมุทรสาคร
ช่องทางปรึกษา: LINE @roogondee

กฎการเขียนข่าว:
- ภาษาไทย กระชับ เป็นกันเอง น่าอ่านแบบข่าว ไม่ตัดสิน
- ความยาว 350-600 คำ และต้องเกาะอยู่กับบริการที่โฟกัสข้างต้น
- Output เป็น HTML เท่านั้น ใช้ <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- ห้ามใส่ <!DOCTYPE>, <html>, <head>, <body>, <style>, <script>
- ปิดท้ายด้วย CTA ชวนทักไลน์ @roogondee หรือเข้า roogondee.com
- ห้ามระบุชื่อยาเฉพาะ, ห้ามคำว่า "รักษาหายขาด/การันตี/100%/ดีที่สุด"
- ไม่วินิจฉัยรายบุคคล เป็นข้อมูลเพื่อการศึกษาและชวนตรวจคัดกรอง"""

    if meta["compliance"]:
        base += f"\n\nกฎเพิ่มเติมสำหรับบริการนี้ (บังคับ):\n- {meta['compliance']}"

    base += """

ตอบกลับเป็น JSON object เท่านั้น (ไม่มีข้อความอื่น) รูปแบบ:
{"title": "...", "slug": "english-kebab-case", "excerpt": "...", "meta_desc": "...", "focus_kw": "คำ, คำ", "body_html": "<h2>...</h2><p>...</p>"}
- slug เป็น a-z0-9 และ - เท่านั้น
- meta_desc 120-160 ตัวอักษร
- excerpt 1-2 ประโยค"""
    return base


def generate_news(news_type: dict, pillar: str, research: str = "", sources: list[str] | None = None) -> dict | None:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    system = build_system_prompt(pillar)

    parts = [
        f"เขียนข่าวประเภท: {news_type['label']}",
        f"แนวทาง: {news_type['brief']}",
        f"วันที่: {TODAY_STR}",
    ]
    if research:
        src_lines = "\n".join(f"- {u}" for u in (sources or []))
        parts.append(
            "\nต่อไปนี้คือสรุปข่าว/ข้อมูลจริงล่าสุดจากการค้นเว็บ — "
            "ให้เรียบเรียงใหม่เป็นภาษาไทยของรู้ก่อนดี (ห้ามคัดลอกคำต่อคำ) "
            "เชื่อมโยงกับบริการที่โฟกัส และเพิ่มย่อหน้าสุดท้าย <p><em>ที่มา: ...</em></p> "
            "อ้างอิงแหล่งด้านล่าง:\n"
            f"{research}\n\nแหล่งอ้างอิง:\n{src_lines}"
        )
    parts.append("\nเขียนข่าวใหม่สดสำหรับวันนี้ ตอบเป็น JSON ตามรูปแบบที่กำหนด")
    user_prompt = "\n".join(parts)

    last_err: Exception | None = None
    for attempt in range(3):
        try:
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=system,
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

def make_slug(raw: str, pillar: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (raw or "news").lower()).strip("-")[:40] or "news"
    return f"news-{TODAY.strftime('%Y%m%d')}-{pillar}-{base}"


# ─── SAVE ────────────────────────────────────────────────────────────────────

def save_news(data: dict, html: str, image_url: str, news_type: dict, pillar: str) -> tuple[str | None, str]:
    sb = get_sb()
    slug = make_slug(data.get("slug", ""), pillar)
    post = {
        "title":        data["title"],
        "slug":         slug,
        "content":      html,
        "excerpt":      (data.get("excerpt") or data.get("meta_desc") or "")[:300],
        "service":      "news",
        "news_pillar":  pillar,
        "category":     news_type["label"],
        "focus_kw":     data.get("focus_kw", ""),
        "meta_desc":    data.get("meta_desc", ""),
        "image_url":    image_url or "",
        "status":       "published",
        "published_at": datetime.now(BKK_TZ).isoformat(),
    }
    res = sb.table("posts").upsert(post, on_conflict="slug").execute()
    return (res.data[0]["id"] if res.data else None), slug


# ─── SOCIAL AUTO-POST (FB Page + LINE OA) ────────────────────────────────────

def post_to_social(post_id: str, post: dict, pillar: str) -> None:
    """โพสต์ข่าวไป FB Page + LINE OA แล้ว mark กันโพสต์ซ้ำ.
    ใช้โค้ดร่วมกับ fb_caption.py / line_broadcast.py — fail ช่องไหน notify ช่องนั้น
    ไม่ให้ล้มทั้ง job (ข่าวขึ้นเว็บแล้ว)."""
    site = os.environ.get("SITE_BASE_URL", "https://roogondee.com").rstrip("/")
    news_url = f"{site}/news/{post['slug']}"

    # ── Facebook Page ──
    if os.environ.get("FB_PAGE_ID") and os.environ.get("FB_PAGE_ACCESS_TOKEN"):
        try:
            import fb_caption
            cap_post = {**post, "service": pillar}  # ใช้ pillar เพื่อ hashtag + mens gate
            caption = fb_caption.generate_caption(cap_post, news_url)
            fb_post_id = fb_caption.post_to_facebook(caption, news_url, post.get("image_url") or None)
            fb_caption.mark_fb_posted(post_id, fb_post_id, caption)
            print(f"  📘 FB posted: {fb_post_id}")
        except Exception as e:
            print(f"  ⚠️ FB post failed: {e}")
            _notify(f"⚠️ รู้ก่อนดี News: โพสต์ FB ไม่สำเร็จ — {str(e)[:200]}")
    else:
        print("  ℹ️ ข้าม FB (ไม่ได้ตั้ง FB_PAGE_ID/FB_PAGE_ACCESS_TOKEN)")

    # ── LINE OA broadcast ──
    if os.environ.get("LINE_CHANNEL_ACCESS_TOKEN"):
        try:
            import line_broadcast
            flex_post = {**post, "id": post_id, "service": "news", "news_pillar": pillar}
            caption = line_broadcast.write_caption(flex_post)
            flex = line_broadcast.build_flex(flex_post, caption)
            request_id = line_broadcast.line_broadcast(flex)
            line_broadcast.mark_broadcast(post_id, request_id)
            print(f"  💬 LINE broadcast: {request_id}")
        except Exception as e:
            print(f"  ⚠️ LINE broadcast failed: {e}")
            _notify(f"⚠️ รู้ก่อนดี News: broadcast LINE ไม่สำเร็จ — {str(e)[:200]}")
    else:
        print("  ℹ️ ข้าม LINE (ไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN)")


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print(f"📰 รู้ก่อนดี News — {TODAY_STR}" + ("  [DRY RUN]" if DRY_RUN else ""))

    if not DRY_RUN and already_posted_today():
        print("✅ มีข่าววันนี้แล้ว — ข้าม")
        return

    pillar = pick_pillar()
    news_type = pick_news_type()
    web = use_web_source()
    print(f"🧭 pillar: {pillar} ({PILLAR_META[pillar]['label']}) | "
          f"มุมข่าว: {news_type['label']} | แหล่ง: {'web search' if web else 'owned'}")

    research, sources = ("", [])
    if web:
        print("  🔎 กำลังค้นข่าวจริง...")
        research, sources = research_pillar(pillar)
        if research:
            print(f"  ✓ ได้ข้อมูล {len(sources)} แหล่ง")
        else:
            print("  ↪ ไม่มีข้อมูลจาก web → ใช้ owned content")

    data = generate_news(news_type, pillar, research, sources)
    if not data:
        _notify("⚠️ รู้ก่อนดี News: generate ข่าวไม่สำเร็จวันนี้ — ตรวจสอบ gen_news")
        return

    html = clean_content(data["body_html"])

    banned = compliance_issues(html, pillar)
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

    if DRY_RUN:
        slug = make_slug(data.get("slug", ""), pillar)
        out = f"/tmp/gen-news-{TODAY_STR}-{pillar}.html"
        with open(out, "w", encoding="utf-8") as f:
            f.write(f"<!-- {data['title']} | pillar={pillar} | {news_type['label']} -->\n{html}")
        print(f"  📝 [DRY RUN] title: {data['title']}")
        print(f"  📝 [DRY RUN] slug: {slug}")
        if sources:
            print(f"  📝 [DRY RUN] sources: {sources}")
        print(f"  📝 [DRY RUN] preview saved → {out} (ไม่เขียน DB / ไม่โพสต์โซเชียล)")
        return

    print("  🎨 กำลัง generate รูป...")
    image_url = generate_image(data["title"], "news")
    if image_url:
        image_url = upload_image_to_storage(image_url, "news")

    print("  💾 บันทึกลง Supabase...")
    post_id, slug = save_news(data, html, image_url or "", news_type, pillar)
    print(f"  ✅ post_id: {post_id}")

    trigger_revalidate(slug)
    _revalidate_paths(["/news", "/"])

    # โพสต์โซเชียล + mark กันซ้ำ (อาศัย dedup column ทำให้ cron 18:00 ไม่หยิบซ้ำ)
    post_row = {
        "slug": slug,
        "title": data["title"],
        "excerpt": (data.get("excerpt") or "")[:300],
        "content": html,
        "category": news_type["label"],
        "focus_kw": data.get("focus_kw", ""),
        "meta_desc": data.get("meta_desc", ""),
        "image_url": image_url or "",
    }
    if post_id:
        post_to_social(post_id, post_row, pillar)

    url = f"roogondee.com/news/{slug}"
    _notify(f"📰 รู้ก่อนดี ข่าวใหม่ [{PILLAR_META[pillar]['label']} · {news_type['label']}]: {data['title']}\n{url}")
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
