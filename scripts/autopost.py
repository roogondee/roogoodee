"""
roogondee-autopost: autopost.py
รู้ก่อนดี (RuGonDee) — Auto-post Python → Claude → Supabase + WordPress
อ่าน content_plan จาก Supabase (ไม่ต้องใช้ Google Sheets)
Company: บริษัท เจียรักษา จำกัด | roogondee.com
"""

import os
import re
import json
import base64
import uuid
import requests
from datetime import datetime, date
import anthropic
from supabase import create_client
from zoneinfo import ZoneInfo

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

def save_post_to_supabase(plan: dict, html_content: str, image_url: str) -> str | None:
    """บันทึกบทความลง posts table และอัปเดต content_plan"""
    sb = get_sb()

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
        "status":       "published",
        "published_at": datetime.now(BKK_TZ).isoformat(),
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

    # 10. Focus keyword relevance — at least first keyword appears in body
    focus = (plan.get("focus_kw") or "").split(",")
    first_kw = focus[0].strip().lower() if focus else ""
    if first_kw and first_kw not in plain.lower():
        issues.append(f"ไม่พบ focus keyword หลัก '{first_kw}' ในเนื้อหา")

    return issues

# ─── CLAUDE AI ─────────────────────────────────────────────────────────────────

def generate_content(plan: dict) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

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

    user_prompt = f"""เขียนบทความสำหรับหัวข้อ:

ชื่อเรื่อง: {plan['title']}
หมวดหมู่: {SERVICE_LABELS.get(plan['service'], '')}
Focus Keyword: {plan.get('focus_kw', '')}
เนื้อหาหลัก: {plan.get('seed', '')}
Meta Description: {plan.get('meta_desc', '')}

เขียนบทความ HTML ให้ครบ 900-1,200 คำ"""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
    )
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

# ─── LINE NOTIFY ───────────────────────────────────────────────────────────────

def send_line(message: str):
    if not LINE_TOKEN:
        return
    requests.post(
        "https://notify-api.line.me/api/notify",
        headers={"Authorization": f"Bearer {LINE_TOKEN}"},
        data={"message": message},
    )

# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print(f"🌿 รู้ก่อนดี AutoPost — {TODAY_STR}")

    plans = get_today_plans()
    if not plans:
        print("📭 ไม่มีบทความที่ต้องโพสต์วันนี้")
        return

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

            # 2. Generate content
            print("  🤖 กำลังสร้างเนื้อหาด้วย Claude...")
            html_content = generate_content(plan)

            # 2b. Clean + validate before publishing
            html_content = clean_content(html_content)
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

if __name__ == "__main__":
    main()
