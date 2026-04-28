"""
roogondee-autopost: autopost.py
รู้ก่อนดี (RuGonDee) — Auto-post Python → Claude → Supabase + WordPress
อ่าน content_plan จาก Supabase (ไม่ต้องใช้ Google Sheets)
Company: บริษัท เจียรักษา จำกัด | roogondee.com
"""

import os
import re
import json
import time
import base64
import uuid
import requests
from datetime import datetime, date, timedelta
import anthropic
from supabase import create_client
from zoneinfo import ZoneInfo

import gen_content_plan as gcp
from notify import notify as _notify

# ─── CONFIG ────────────────────────────────────────────────────────────────────
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
TOGETHER_KEY  = os.environ["TOGETHER_API_KEY"]
SUPABASE_URL  = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY  = os.environ["SUPABASE_SECRET"]
WP_URL        = os.environ.get("WP_URL", "").rstrip("/")
WP_USER       = os.environ.get("WP_USER", "")
WP_APP_PASS   = os.environ.get("WP_APP_PASS", "")
LINE_TOKEN    = os.environ.get("LINE_NOTIFY_TOKEN", "")

BKK_TZ    = ZoneInfo("Asia/Bangkok")
TODAY_STR = date.today().strftime("%Y-%m-%d")

WP_AUTH    = base64.b64encode(f"{WP_USER}:{WP_APP_PASS}".encode()).decode()
WP_HEADERS = {"Authorization": f"Basic {WP_AUTH}", "Content-Type": "application/json"}

SERVICE_LABELS = {
    "std":     "Sexual Health",
    "glp1":    "GLP-1 & ฮอร์โมน",
    "ckd":     "CKD & โรคไต",
    "foreign": "แรงงานต่างด้าว",
    "mens":    "Men's Health 40+",
}

# ─── SUPABASE ──────────────────────────────────────────────────────────────────

def get_sb():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_today_plans() -> list[dict]:
    """ดึง content_plan ที่ status='ready' และ scheduled_date=วันนี้"""
    sb = get_sb()
    result = sb.table("content_plan") \
        .select("*") \
        .eq("status", "ready") \
        .eq("scheduled_date", TODAY_STR) \
        .execute()
    return result.data or []

def get_overdue_ready_plans(limit: int = 1) -> list[dict]:
    """Fallback: ดึง plan ที่ status='ready' ของวันก่อนหน้า (เก่าสุดก่อน) — กันบล็อกว่าง"""
    sb = get_sb()
    result = sb.table("content_plan") \
        .select("*") \
        .eq("status", "ready") \
        .lt("scheduled_date", TODAY_STR) \
        .order("scheduled_date", desc=False) \
        .limit(limit) \
        .execute()
    return result.data or []

def insert_inline_plan(entry: dict) -> dict | None:
    """Insert a freshly generated plan for today and return it (with id)."""
    sb = get_sb()
    payload = {
        **entry,
        "scheduled_date": TODAY_STR,
        "status": "ready",
    }
    res = sb.table("content_plan").insert(payload).execute()
    return res.data[0] if res.data else None

def generate_inline_plan() -> dict | None:
    """Last-resort: ใช้ gen_content_plan สร้าง plan สดสำหรับวันนี้ทันที"""
    try:
        existing = gcp.get_existing_slugs()
        counts = gcp.get_service_count_by_date(date.today())
        # บริการที่มีน้อยที่สุด (ตาม cycle) เพื่อ balance
        min_count = min(counts.values()) if counts else 0
        service = next((s for s in gcp.SERVICES_CYCLE if counts.get(s, 0) == min_count), gcp.SERVICES_CYCLE[0])
        for attempt in range(3):
            entry = gcp.generate_plan_entry(service, existing)
            if entry:
                entry["service"] = service
                return insert_inline_plan(entry)
            print(f"  ↻ inline plan attempt {attempt + 1} failed, retrying...")
            time.sleep(2 ** attempt)
        return None
    except Exception as e:
        print(f"  ❌ generate_inline_plan failed: {e}")
        return None

# ─── AUTO TOP-UP ───────────────────────────────────────────────────────────────

TOPUP_FLOOR = 7   # ถ้า ready plan ในอนาคตเหลือน้อยกว่านี้ (รวมวันนี้) จะเติมเอง
TOPUP_TARGET = 14  # เติมจนมี ready plan ครอบคลุม N วันข้างหน้า

def count_future_ready_plans() -> int:
    """นับ plan ที่ status='ready' และ scheduled_date >= วันนี้"""
    sb = get_sb()
    res = sb.table("content_plan") \
        .select("id", count="exact") \
        .eq("status", "ready") \
        .gte("scheduled_date", TODAY_STR) \
        .execute()
    return res.count or 0

def topup_plans_if_needed() -> int:
    """ถ้า ready plan ในอนาคตเหลือน้อย → generate ต่อให้ครบ TOPUP_TARGET วัน
    Return: จำนวน plan ที่เพิ่มเข้าไป
    """
    remaining = count_future_ready_plans()
    if remaining >= TOPUP_FLOOR:
        print(f"📦 ready plan ข้างหน้า: {remaining} (พอแล้ว, ขั้นต่ำ {TOPUP_FLOOR})")
        return 0

    need = max(TOPUP_TARGET - remaining, 1)
    print(f"📦 ready plan ข้างหน้าเหลือ {remaining} — เติมอีก {need} ตัว")

    try:
        existing = gcp.get_existing_slugs()
        latest = gcp.get_latest_scheduled_date()
        start = max(latest + timedelta(days=1), date.today())
        counts = gcp.get_service_count_by_date(date.today())

        new_plans: list[dict] = []
        current = start
        for _ in range(need):
            min_count = min(counts.values())
            service = next(s for s in gcp.SERVICES_CYCLE if counts[s] == min_count)
            entry = gcp.generate_plan_entry(service, existing)
            if entry:
                entry["service"] = service
                entry["scheduled_date"] = str(current)
                entry["status"] = "ready"
                new_plans.append(entry)
                existing.add(entry["slug"])
                counts[service] += 1
                print(f"  ✅ {current} [{service}] {entry['title'][:50]}")
            else:
                print(f"  ⚠️ ข้าม {current}")
            current += timedelta(days=1)

        if new_plans:
            sb = get_sb()
            sb.table("content_plan").insert(new_plans).execute()
            print(f"📦 top-up เพิ่ม {len(new_plans)} plans")
        return len(new_plans)
    except Exception as e:
        print(f"  ❌ topup_plans_if_needed failed: {e}")
        send_line(f"⚠️ รู้ก่อนดี top-up plan ล้มเหลว: {str(e)[:200]}")
        return 0

def save_post_to_supabase(plan: dict, html_content: str, image_url: str) -> str | None:
    """บันทึกบทความลง posts table และอัปเดต content_plan

    NOTE: mens vertical → publish เป็น 'draft' รอ admin + W Medical sign-off
    ก่อน publish จริง (ตาม mens-vertical-plan.md compliance gate เดือนแรก)
    """
    sb = get_sb()

    # mens vertical → draft mode by default until W Medical compliance review
    # is established as routine (set MENS_AUTO_PUBLISH=1 to bypass).
    is_mens = plan["service"] == "mens"
    auto_publish_mens = os.environ.get("MENS_AUTO_PUBLISH") == "1"
    status = "draft" if (is_mens and not auto_publish_mens) else "published"
    published_at = datetime.now(BKK_TZ).isoformat() if status == "published" else None

    post_data = {
        "title":        plan["title"],
        "slug":         plan["slug"],
        "content":      html_content,
        "excerpt":      plan.get("meta_desc", "")[:300],
        "service":      plan["service"],
        "category":     SERVICE_LABELS.get(plan["service"], ""),
        "focus_kw":     plan.get("focus_kw", ""),
        "meta_desc":    plan.get("meta_desc", ""),
        "image_url":    image_url or "",
        "status":       status,
        "published_at": published_at,
    }

    result = sb.table("posts").upsert(post_data, on_conflict="slug").execute()
    post_id = result.data[0]["id"] if result.data else None

    # อัปเดต content_plan → status = posted
    sb.table("content_plan").update({
        "status":  "posted",
        "post_id": post_id,
    }).eq("id", plan["id"]).execute()

    return post_id

# ─── SUPABASE STORAGE ─────────────────────────────────────────────────────────

def upload_image_to_storage(image_url: str, slug: str) -> str:
    """Download image from Together.xyz and upload to Supabase Storage (permanent URL)"""
    try:
        img_resp = requests.get(image_url, timeout=30)
        img_resp.raise_for_status()
        sb = get_sb()
        safe_name = str(uuid.uuid4())  # Use UUID to avoid Thai chars in filename
        file_path = f"blog/{safe_name}.jpg"
        sb.storage.from_("images").upload(
            file_path,
            img_resp.content,
            {"content-type": "image/jpeg", "upsert": "true"},
        )
        public_url = sb.storage.from_("images").get_public_url(file_path)
        print(f"  ☁️  อัปโหลดรูปแล้ว: {file_path}")
        return public_url
    except Exception as e:
        print(f"  ⚠️ Storage upload failed, ใช้ URL เดิม: {e}")
        return image_url  # Fallback to original URL

# ─── FLUX.1 IMAGE GENERATION ───────────────────────────────────────────────────

SERVICE_PROMPTS = {
    "std":     "modern medical clinic, soft green and white tones, clean minimal healthcare, Thai woman, professional, no text",
    "glp1":    "healthy lifestyle, weight management, fresh vegetables, fitness, soft green tones, Thai woman smiling, professional photo",
    "ckd":     "kidney health, medical care, calm hospital environment, blue and white tones, doctor consultation, professional",
    "foreign": "diverse workers, health checkup, medical certificate, professional clinic, Samut Sakhon Thailand, clean environment",
    "mens":    "Thai man aged 45 to 55, professional lifestyle, office or outdoor setting, thoughtful expression, navy and slate tones, clean modern medical aesthetic, fully clothed business casual, no shirtless, no sexual imagery, no couples, professional photo",
}

def generate_image(title: str, service: str) -> str | None:
    base = SERVICE_PROMPTS.get(service, "healthcare, medical, green and white, professional, Thailand")
    prompt = f"{base}, related to: {title[:80]}, high quality photography, 16:9"

    try:
        resp = requests.post(
            "https://api.together.xyz/v1/images/generations",
            headers={"Authorization": f"Bearer {TOGETHER_KEY}", "Content-Type": "application/json"},
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
        print(f"  🎨 รูปสำเร็จ: {url[:60]}...")
        return url
    except Exception as e:
        print(f"  ⚠️ Generate image failed: {e}")
        return None

# ─── CONTENT VALIDATION ───────────────────────────────────────────────────────

FORBIDDEN_TAGS = ["<!doctype", "<html", "<head", "<body", "<script", "<style", "<iframe"]
PLACEHOLDER_PATTERNS = ["[todo]", "lorem ipsum", "{placeholder}", "{{", "}}", "[insert", "xxxx"]
BALANCED_TAGS = ["p", "h2", "h3", "ul", "ol", "li", "strong", "em", "blockquote"]

def clean_content(html: str) -> str:
    """Strip zero-width chars, normalize whitespace, remove stray code fences."""
    # Zero-width / BOM
    html = html.replace("\u200b", "").replace("\ufeff", "").replace("\u00a0", " ")
    # Strip leading/trailing code fences if Claude wrapped twice
    html = re.sub(r"^```(?:html)?\s*\n", "", html)
    html = re.sub(r"\n```\s*$", "", html)
    # Collapse runs of spaces (preserve newlines)
    html = "\n".join(re.sub(r" {2,}", " ", ln).rstrip() for ln in html.split("\n"))
    return html.strip()

def _strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html)

def validate_content(html: str, plan: dict) -> list[str]:
    """Return list of human-readable issues; empty list = OK."""
    issues: list[str] = []
    lower = html.lower()
    plain = _strip_tags(html)

    # 1. Word/char count
    words = len(plain.split())
    chars = len(plain.strip())
    if chars < 800:
        issues.append(f"เนื้อหาสั้นเกินไป ({chars} ตัวอักษร)")
    elif chars > 15000:
        issues.append(f"เนื้อหายาวเกินปกติ ({chars} ตัวอักษร)")

    # 2. Required structure
    if "<h2" not in lower:
        issues.append("ขาด <h2> (หัวข้อย่อย)")
    if "<p" not in lower:
        issues.append("ขาด <p>")

    # 3. Forbidden tags
    for tag in FORBIDDEN_TAGS:
        if tag in lower:
            issues.append(f"พบแท็กต้องห้าม: {tag}")

    # 4. Thai ratio — should be a Thai article
    thai = sum(1 for c in plain if "\u0e00" <= c <= "\u0e7f")
    latin = sum(1 for c in plain if c.isascii() and c.isalpha())
    if thai + latin > 0 and thai / (thai + latin) < 0.5:
        issues.append(f"อักษรไทยน้อยเกินไป (ไทย {thai} / ลาติน {latin})")

    # 5. Placeholder leftovers
    for ph in PLACEHOLDER_PATTERNS:
        if ph in lower:
            issues.append(f"พบ placeholder: {ph}")

    # 6. Markdown residue
    if re.search(r"(^|\n)#{1,4}\s", html):
        issues.append("พบหัวข้อ Markdown (# / ## / ###)")
    if "**" in html:
        issues.append("พบตัวหนาแบบ Markdown (**)")
    if re.search(r"(^|\n)[-*]\s", html):
        issues.append("พบ bullet แบบ Markdown (- / *)")
    if re.search(r"(^|\n)---+\s*(\n|$)", html):
        issues.append("พบเส้นคั่น Markdown (---)")

    # 7. Truncation — last visible char should be punctuation or closing tag
    tail = html.rstrip()[-1:] if html.rstrip() else ""
    if tail and tail not in {">", ".", "?", "!", "…", "ๆ", "ฯ", '"', "'", ")", "]"}:
        issues.append(f"เนื้อหาอาจถูกตัดกลางคัน (จบด้วย '{tail}')")

    # 8. Balanced tag count
    for tag in BALANCED_TAGS:
        opens = len(re.findall(rf"<{tag}[\s>]", lower))
        closes = len(re.findall(rf"</{tag}>", lower))
        if opens != closes:
            issues.append(f"แท็ก <{tag}> ไม่สมดุล (เปิด {opens}, ปิด {closes})")

    # 9. CTA presence (system prompt requires LINE/roogondee CTA)
    if "line" not in lower and "roogondee" not in lower:
        issues.append("ขาด CTA (ไม่พบ LINE หรือ roogondee)")

    # 10. Focus keyword relevance — every token of the first keyword must appear
    # in the body. Tokens are checked individually so connectors like "สำหรับ"/"ใน"
    # between "glp-1" and "ผู้หญิง" don't break the match.
    focus = (plan.get("focus_kw") or "").split(",")
    first_kw = focus[0].strip().lower() if focus else ""
    if first_kw:
        plain_lower = plain.lower()
        missing = [tok for tok in first_kw.split() if len(tok) >= 2 and tok not in plain_lower]
        if missing:
            issues.append(f"ไม่พบ focus keyword หลัก '{first_kw}' ในเนื้อหา (ขาด: {', '.join(missing)})")

    return issues

# ─── CLAUDE AI ─────────────────────────────────────────────────────────────────

def generate_content(plan: dict) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    is_mens = plan.get("service") == "mens"
    mens_compliance_block = """

⚠️ COMPLIANCE สำหรับ Men's Health (บังคับ — ห้ามฝ่าฝืน):
- ห้ามระบุชื่อยา (Viagra, Cialis, Levitra, sildenafil, tadalafil, vardenafil,
  Nebido, Sustanon, Testogel, AndroGel หรือยาตัวอื่นๆ)
- ห้ามใช้คำ: รักษาหายขาด, การันตี, 100%, ดีที่สุด, อันดับ 1,
  เพิ่มขนาด, อึด, ทน X นาที, แข็งทน, ปลุกเซ็กส์, แจกยา, ยาฟรี
- ห้ามรีวิวพร้อมชื่อจริง + ผลลัพธ์เจาะจง
- ต้องมีประโยค "ภายใต้การดูแลของแพทย์" หรือใกล้เคียง อย่างน้อยครั้งหนึ่ง
- ต้องมี disclaimer ท้ายบทความ:
  "ข้อมูลในบทความเพื่อการศึกษา ไม่ใช่การวินิจฉัยหรือรักษา
   กรุณาปรึกษาแพทย์ที่ W Medical Hospital สมุทรสาคร"
- tone: ให้ความรู้ ไม่ตัดสิน ไม่ขายของ
- เน้น Pillar A (พลังงาน อารมณ์ lifestyle ฮอร์โมนเชิงให้ความรู้)
  มากกว่า Pillar B (สมรรถภาพ)"""

    system_prompt = """คุณเป็นนักเขียนบทความสุขภาพระดับ Medical Grade สำหรับเว็บไซต์ รู้ก่อนดี (roogondee.com)
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

กฎการเขียน:
- ภาษาไทย อ่านง่าย ไม่ตัดสิน
- Evidence-based, อ้างอิงงานวิจัย
- ความยาว 900-1,200 คำ
- Output เป็น HTML (ไม่ใช่ Markdown)
- ใช้ <h2>, <h3>, <p>, <ul>, <strong>, <em> เท่านั้น
- ลงท้ายด้วย CTA: ชวนติดต่อ LINE @roogondee หรือ roogondee.com
- ห้ามใส่ <!DOCTYPE>, <html>, <head>, <body>, <style>"""

    if is_mens:
        system_prompt += mens_compliance_block

    user_prompt = f"""เขียนบทความสำหรับหัวข้อ:

ชื่อเรื่อง: {plan['title']}
หมวดหมู่: {SERVICE_LABELS.get(plan['service'], '')}
Focus Keyword: {plan.get('focus_kw', '')}
เนื้อหาหลัก: {plan.get('seed', '')}
Meta Description: {plan.get('meta_desc', '')}

เขียนบทความ HTML ให้ครบ 900-1,200 คำ"""

    def _call():
        # Thai chars consume ~1.5–3 tokens each, so a 900–1,200-word HTML article
        # routinely exceeds 4k output tokens and gets truncated mid-sentence
        # (which then cascades into <ul> imbalance + missing CTA at end).
        return client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8192,
            messages=[{"role": "user", "content": user_prompt}],
            system=system_prompt,
        )
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            msg = _call()
            break
        except Exception as e:
            last_err = e
            print(f"  ↻ Claude call attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** attempt)
    else:
        raise last_err if last_err else RuntimeError("Claude call failed")
    if getattr(msg, "stop_reason", None) == "max_tokens":
        print("  ⚠️ Claude หยุดเพราะ max_tokens — เนื้อหาอาจถูกตัดท้าย")
    text = msg.content[0].text.strip()
    # Strip markdown code fences if Claude wrapped output in ```html ... ```
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```html or ```) and last line (```)
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        text = "\n".join(lines).strip()
    return text

# ─── WORDPRESS (optional) ──────────────────────────────────────────────────────

def upload_image_to_wp(image_url: str) -> int | None:
    if not image_url or not WP_URL:
        return None
    try:
        img = requests.get(image_url, timeout=30)
        img.raise_for_status()
        resp = requests.post(
            f"{WP_URL}/wp-json/wp/v2/media",
            headers={
                "Authorization": f"Basic {WP_AUTH}",
                "Content-Disposition": 'attachment; filename="cover.jpg"',
                "Content-Type": "image/jpeg",
            },
            data=img.content,
        )
        if resp.status_code == 201:
            return resp.json()["id"]
    except Exception as e:
        print(f"  ⚠️ WP image upload failed: {e}")
    return None

def get_or_create_term(endpoint: str, name: str) -> int:
    resp = requests.get(f"{WP_URL}/wp-json/wp/v2/{endpoint}", params={"search": name}, headers=WP_HEADERS)
    items = resp.json()
    if isinstance(items, list) and items:
        return items[0]["id"]
    return requests.post(f"{WP_URL}/wp-json/wp/v2/{endpoint}", json={"name": name}, headers=WP_HEADERS).json()["id"]

def post_to_wordpress(plan: dict, html_content: str, image_url: str) -> str:
    if not WP_URL or not WP_USER or not WP_APP_PASS:
        return ""
    try:
        cat_id = get_or_create_term("categories", SERVICE_LABELS.get(plan["service"], "Health"))
        tags   = [get_or_create_term("tags", kw.strip()) for kw in plan.get("focus_kw", "").split(",") if kw.strip()]
        media_id = upload_image_to_wp(image_url)

        payload = {
            "title":      plan["title"],
            "content":    html_content,
            "status":     "publish",
            "slug":       plan["slug"],
            "categories": [cat_id],
            "tags":       tags,
            "meta": {
                "rank_math_description":   plan.get("meta_desc", ""),
                "rank_math_focus_keyword": plan.get("focus_kw", ""),
            },
        }
        if media_id:
            payload["featured_media"] = media_id

        resp = requests.post(f"{WP_URL}/wp-json/wp/v2/posts", json=payload, headers=WP_HEADERS)
        resp.raise_for_status()
        return resp.json().get("link", "")
    except Exception as e:
        print(f"  ⚠️ WordPress failed (ข้ามได้): {e}")
        return ""

# ─── ON-DEMAND REVALIDATE ─────────────────────────────────────────────────────

def trigger_revalidate(slug: str) -> None:
    """ยิง /api/revalidate ให้ Next.js เคลียร์ cache สำหรับหน้า blog + sitemap"""
    secret = os.environ.get("REVALIDATE_SECRET", "").strip()
    site = os.environ.get("SITE_URL", "https://roogondee.com").rstrip("/")
    if not secret:
        print("  ℹ️ ข้าม revalidate (ยังไม่ตั้ง REVALIDATE_SECRET)")
        return
    paths = ["/blog", f"/blog/{slug}", "/sitemap.xml", "/"]
    try:
        params = "&".join([f"path={p}" for p in paths] + [f"secret={secret}"])
        resp = requests.post(f"{site}/api/revalidate?{params}", timeout=15)
        if resp.ok:
            print(f"  ♻️  revalidated: {', '.join(paths)}")
        else:
            print(f"  ⚠️ revalidate response {resp.status_code}: {resp.text[:120]}")
    except Exception as e:
        print(f"  ⚠️ revalidate failed: {e}")

# ─── NOTIFICATIONS (Discord/Slack/LINE Messaging API) ─────────────────────────

def send_line(message: str):
    """ชื่อ legacy — เรียก notify ใหม่ (รองรับ Discord/Slack/LINE Messaging)"""
    _notify(message)

# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print(f"🌿 รู้ก่อนดี AutoPost — {TODAY_STR}")

    plans = get_today_plans()
    fallback_used: str | None = None

    if not plans:
        overdue = get_overdue_ready_plans(limit=1)
        if overdue:
            plans = overdue
            fallback_used = f"overdue ({overdue[0].get('scheduled_date')})"
            print(f"⏪ ใช้ plan ค้างคิว: {plans[0].get('scheduled_date')} — {plans[0].get('title')}")

    if not plans:
        print("⚙️  ไม่มี plan เลย — กำลัง generate inline...")
        inline = generate_inline_plan()
        if inline:
            plans = [inline]
            fallback_used = "inline"
            print(f"✨ ได้ plan สดแล้ว: {inline.get('title')}")

    if not plans:
        print("📭 ไม่มีบทความที่ต้องโพสต์วันนี้ (และ generate inline ก็ไม่สำเร็จ)")
        send_line("⚠️ รู้ก่อนดี: วันนี้ไม่มีบทความเลย — gen_content_plan/autopost ทั้งคู่ล้มเหลว ให้ตรวจสอบโดยด่วน")
        return

    if fallback_used:
        send_line(f"ℹ️ รู้ก่อนดี: ใช้ fallback path = {fallback_used}")

    print(f"📋 พบ {len(plans)} บทความ")
    posted_count = 0

    for plan in plans:
        title = plan["title"]
        print(f"\n📝 กำลังโพสต์: {title}")

        try:
            # 1. Generate image
            print("  🎨 กำลัง generate รูปด้วย FLUX.1...")
            image_url = generate_image(title, plan["service"])
            if image_url:
                print("  ☁️  กำลังอัปโหลดรูปไป Supabase Storage...")
                image_url = upload_image_to_storage(image_url, plan["slug"])

            # 2. Generate content (with mens compliance retry)
            print("  🤖 กำลังสร้างเนื้อหาด้วย Claude...")
            html_content = generate_content(plan)
            html_content = clean_content(html_content)

            # 2a. Mens compliance gate — retry up to 3 times on failure.
            if plan["service"] == "mens":
                from compliance import check_mens_compliance
                ok, comp_issues = check_mens_compliance(html_content)
                attempt = 1
                while not ok and attempt < 3:
                    print(f"  ⚠️ mens compliance fail (try {attempt}): {comp_issues}")
                    html_content = clean_content(generate_content(plan))
                    ok, comp_issues = check_mens_compliance(html_content)
                    attempt += 1
                if not ok:
                    err = "mens compliance ไม่ผ่าน: " + " | ".join(comp_issues)
                    print(f"  ❌ {err}")
                    get_sb().table("content_plan").update({"status": "error"}).eq("id", plan["id"]).execute()
                    send_line(f"⚠️ รู้ก่อนดี ข้ามโพสต์ (mens compliance): {title}\n{err[:400]}")
                    continue
                print("  ✓ mens compliance ผ่าน")

            # 2b. Clean + validate before publishing
            issues = validate_content(html_content, plan)
            if issues:
                err = "คุณภาพเนื้อหาไม่ผ่าน: " + " | ".join(issues)
                print(f"  ❌ {err}")
                get_sb().table("content_plan").update({"status": "error"}).eq("id", plan["id"]).execute()
                send_line(f"⚠️ รู้ก่อนดี ข้ามโพสต์ (validation): {title}\n{err[:400]}")
                continue
            print("  ✓ ตรวจคุณภาพเนื้อหาผ่าน")

            # 3. Save to Supabase
            print("  💾 กำลังบันทึกลง Supabase...")
            post_id = save_post_to_supabase(plan, html_content, image_url or "")
            print(f"  ✅ Supabase: {post_id}")

            # 4. Post to WordPress (optional)
            wp_url = post_to_wordpress(plan, html_content, image_url or "")
            if wp_url:
                print(f"  ✅ WordPress: {wp_url}")

            # 5. On-demand revalidate Next.js — บทความขึ้นทันที ไม่ต้องรอ ISR 60s
            trigger_revalidate(plan["slug"])

            blog_url = f"roogondee.com/blog/{plan['slug']}"
            send_line(f"✅ รู้ก่อนดี โพสต์ใหม่: {title}\n{blog_url}")
            posted_count += 1

        except Exception as e:
            err = str(e)
            print(f"  ❌ Error: {err}")
            # Mark as error in content_plan
            get_sb().table("content_plan").update({"status": "error"}).eq("id", plan["id"]).execute()
            send_line(f"❌ รู้ก่อนดี Error: {title}\n{err[:200]}")

    print(f"\n🎉 เสร็จสิ้น — โพสต์ทั้งหมด {posted_count} บทความ")

    # Auto top-up: เติม plan ในอนาคตให้พอ — ระบบเดินเองไม่ต้องสั่ง
    try:
        topup_plans_if_needed()
    except Exception as e:
        print(f"⚠️ top-up ล้มเหลว (ไม่ส่งผลกับการโพสต์): {e}")

if __name__ == "__main__":
    main()
