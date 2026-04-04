"""
roogondee-autopost: autopost.py
รู้ก่อนดี (RuGonDee) — Auto-post Python → Claude → WordPress + Supabase
Company: บริษัท เจียรักษา จำกัด | roogondee.com
"""

import os
import io
import json
import base64
import requests
from datetime import datetime, date
import anthropic
from google.oauth2 import service_account
from googleapiclient.discovery import build
from supabase import create_client
from zoneinfo import ZoneInfo

# ─── CONFIG ────────────────────────────────────────────────────────────────────
WP_URL        = os.environ.get("WP_URL", "").rstrip("/")
WP_USER       = os.environ.get("WP_USER", "")
WP_APP_PASS   = os.environ.get("WP_APP_PASS", "")
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
TOGETHER_KEY  = os.environ["TOGETHER_API_KEY"]
SUPABASE_URL  = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY  = os.environ["SUPABASE_SECRET"]
GSHEET_ID     = os.environ["GSHEET_ID"]
GSHEET_CREDS  = os.environ["GSHEET_CREDS_JSON"]
LINE_TOKEN    = os.environ.get("LINE_NOTIFY_TOKEN", "")

SHEET_NAME = "Content"
BKK_TZ     = ZoneInfo("Asia/Bangkok")
TODAY_STR  = date.today().strftime("%Y-%m-%d")

WP_AUTH    = base64.b64encode(f"{WP_USER}:{WP_APP_PASS}".encode()).decode()
WP_HEADERS = {"Authorization": f"Basic {WP_AUTH}", "Content-Type": "application/json"}

# ─── SUPABASE ──────────────────────────────────────────────────────────────────

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def save_to_supabase(row_data: dict, html_content: str, image_url: str) -> str | None:
    """บันทึกบทความลง Supabase posts table — คืน post id"""
    sb = get_supabase()
    service_map = {
        "Sexual Health": "std",
        "GLP-1 & ฮอร์โมน": "glp1",
        "CKD & โรคไต": "ckd",
        "แรงงานต่างด้าว": "foreign",
    }
    service = service_map.get(row_data.get("category", ""), "glp1")

    data = {
        "title":        row_data["title"],
        "slug":         row_data.get("url_slug", "").strip("/"),
        "content":      html_content,
        "excerpt":      row_data.get("meta_description", "")[:300],
        "service":      service,
        "category":     row_data.get("category", ""),
        "focus_kw":     row_data.get("focus_keyword", ""),
        "meta_desc":    row_data.get("meta_description", ""),
        "image_url":    image_url or "",
        "status":       "published",
        "published_at": datetime.now(BKK_TZ).isoformat(),
    }

    result = sb.table("posts").upsert(data, on_conflict="slug").execute()
    if result.data:
        return result.data[0]["id"]
    return None

# ─── FLUX.1 IMAGE GENERATION ───────────────────────────────────────────────────

SERVICE_PROMPTS = {
    "std":     "modern medical clinic, soft green and white tones, clean minimal healthcare, Thai woman, professional, no text",
    "glp1":    "healthy lifestyle, weight management, fresh vegetables, fitness, soft green tones, Thai woman smiling, professional photo",
    "ckd":     "kidney health, medical care, calm hospital environment, blue and white tones, doctor consultation, professional",
    "foreign": "diverse workers, health checkup, medical certificate, professional clinic, Samut Sakhon Thailand, clean environment",
}

def generate_image(title: str, service: str) -> str | None:
    """Generate blog cover image with FLUX.1-schnell-Free — คืน URL"""
    base = SERVICE_PROMPTS.get(service, "healthcare, medical, green and white, professional, Thailand")
    prompt = f"{base}, related to topic: {title[:80]}, high quality photography, 16:9 aspect ratio"

    try:
        resp = requests.post(
            "https://api.together.xyz/v1/images/generations",
            headers={
                "Authorization": f"Bearer {TOGETHER_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "black-forest-labs/FLUX.1-schnell-Free",
                "prompt": prompt,
                "width": 1200,
                "height": 630,
                "steps": 4,
                "n": 1,
                "response_format": "url",
            },
            timeout=60,
        )
        resp.raise_for_status()
        url = resp.json()["data"][0]["url"]
        print(f"  🎨 รูปสำเร็จ: {url[:60]}...")
        return url
    except Exception as e:
        print(f"  ⚠️ Generate image ไม่สำเร็จ: {e}")
        return None

# ─── GOOGLE SHEETS ─────────────────────────────────────────────────────────────

def get_sheet_service():
    creds_info = json.loads(GSHEET_CREDS)
    creds = service_account.Credentials.from_service_account_info(
        creds_info, scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    return build("sheets", "v4", credentials=creds).spreadsheets()

def get_rows(service):
    result = service.values().get(
        spreadsheetId=GSHEET_ID,
        range=f"{SHEET_NAME}!A1:P200"
    ).execute()
    rows = result.get("values", [])
    if not rows:
        return [], []
    return rows[0], rows[1:]

def col_index(headers, col_name):
    try:
        return headers.index(col_name)
    except ValueError:
        return -1

def update_row(service, row_num, col, value):
    if col < 0:
        return
    col_letter = chr(ord("A") + col)
    service.values().update(
        spreadsheetId=GSHEET_ID,
        range=f"{SHEET_NAME}!{col_letter}{row_num}",
        valueInputOption="RAW",
        body={"values": [[value]]}
    ).execute()

# ─── CLAUDE AI ─────────────────────────────────────────────────────────────────

def generate_content(row_data: dict) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    system_prompt = """คุณเป็นนักเขียนบทความสุขภาพระดับ Medical Grade สำหรับเว็บไซต์ รู้ก่อนดี (roogondee.com)
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

กฎการเขียน:
- ภาษาไทย อ่านง่าย ไม่ตัดสิน
- Evidence-based, อ้างอิงงานวิจัย
- ความยาว 900-1,200 คำ
- Output เป็น HTML (ไม่ใช่ Markdown)
- ใช้ <h2>, <h3>, <p>, <ul>, <strong>, <em> เท่านั้น
- ลงท้ายด้วย CTA: ชวนติดต่อ LINE OA @034qjajh หรือ roogondee.com
- ห้ามใส่ <!DOCTYPE>, <html>, <head>, <body>, <style>"""

    user_prompt = f"""เขียนบทความสำหรับหัวข้อ:

ชื่อเรื่อง: {row_data['title']}
หมวดหมู่: {row_data['category']}
Focus Keyword: {row_data['focus_keyword']}
คีย์เวิร์ดรอง: {row_data['post_body_seed']}
Meta Description: {row_data['meta_description']}

เขียนบทความ HTML ให้ครบ 900-1,200 คำ"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
    )
    return message.content[0].text

# ─── WORDPRESS ─────────────────────────────────────────────────────────────────

def upload_image_to_wp(image_url: str, title: str) -> int | None:
    """Download image from URL แล้ว upload ขึ้น WordPress Media Library"""
    if not image_url or not WP_URL:
        return None
    try:
        img_resp = requests.get(image_url, timeout=30)
        img_resp.raise_for_status()
        img_data = img_resp.content

        resp = requests.post(
            f"{WP_URL}/wp-json/wp/v2/media",
            headers={
                "Authorization": f"Basic {WP_AUTH}",
                "Content-Disposition": f'attachment; filename="cover.jpg"',
                "Content-Type": "image/jpeg",
            },
            data=img_data
        )
        if resp.status_code == 201:
            return resp.json()["id"]
    except Exception as e:
        print(f"  ⚠️ Upload WP image failed: {e}")
    return None

def get_or_create_term(endpoint: str, name: str) -> int:
    resp = requests.get(
        f"{WP_URL}/wp-json/wp/v2/{endpoint}",
        params={"search": name}, headers=WP_HEADERS
    )
    items = resp.json()
    if isinstance(items, list) and items:
        return items[0]["id"]
    resp = requests.post(
        f"{WP_URL}/wp-json/wp/v2/{endpoint}",
        json={"name": name}, headers=WP_HEADERS
    )
    return resp.json()["id"]

def create_wp_post(row_data: dict, html_content: str, image_url: str) -> dict:
    if not WP_URL:
        return {}

    cat_id = get_or_create_term("categories", row_data["category"])
    tags = [get_or_create_term("tags", kw.strip())
            for kw in row_data.get("focus_keyword", "").split(",") if kw.strip()]

    featured_media = upload_image_to_wp(image_url, row_data.get("title", ""))

    payload = {
        "title":      row_data["title"],
        "content":    html_content,
        "status":     "publish",
        "slug":       row_data.get("url_slug", ""),
        "categories": [cat_id],
        "tags":       tags,
        "meta": {
            "rank_math_description":   row_data.get("meta_description", ""),
            "rank_math_focus_keyword": row_data.get("focus_keyword", ""),
        }
    }
    if featured_media:
        payload["featured_media"] = featured_media

    resp = requests.post(f"{WP_URL}/wp-json/wp/v2/posts", json=payload, headers=WP_HEADERS)
    resp.raise_for_status()
    return resp.json()

# ─── LINE NOTIFY ───────────────────────────────────────────────────────────────

def send_line(message: str):
    if not LINE_TOKEN:
        return
    requests.post(
        "https://notify-api.line.me/api/notify",
        headers={"Authorization": f"Bearer {LINE_TOKEN}"},
        data={"message": message}
    )

# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print(f"🌿 รู้ก่อนดี AutoPost — {TODAY_STR}")
    sheet_svc = get_sheet_service()
    headers, rows = get_rows(sheet_svc)

    required_cols = [
        "day_number", "scheduled_date", "platform", "title",
        "meta_description", "url_slug", "focus_keyword",
        "category", "post_body_seed", "status", "wp_url", "posted_at", "notes"
    ]
    ci = {col: col_index(headers, col) for col in required_cols}

    service_map = {
        "Sexual Health": "std",
        "GLP-1 & ฮอร์โมน": "glp1",
        "CKD & โรคไต": "ckd",
        "แรงงานต่างด้าว": "foreign",
    }

    posted_count = 0
    for i, row in enumerate(rows):
        row_num = i + 2

        def get(col):
            idx = ci.get(col, -1)
            return row[idx] if 0 <= idx < len(row) else ""

        if get("scheduled_date") != TODAY_STR:
            continue
        if get("status") != "Ready":
            continue
        if get("platform") != "Blog/SEO":
            continue

        title = get("title")
        print(f"\n📝 กำลังโพสต์: {title}")

        category = get("category")
        service  = service_map.get(category, "glp1")

        row_data = {
            "title":            title,
            "meta_description": get("meta_description"),
            "url_slug":         get("url_slug"),
            "focus_keyword":    get("focus_keyword"),
            "category":         category,
            "post_body_seed":   get("post_body_seed"),
        }

        try:
            # 1. Generate image
            print("  🎨 กำลัง generate รูปด้วย FLUX.1...")
            image_url = generate_image(title, service)

            # 2. Generate content
            print("  🤖 กำลังสร้างเนื้อหาด้วย Claude...")
            html_content = generate_content(row_data)

            # 3. Save to Supabase
            print("  💾 กำลังบันทึกลง Supabase...")
            post_id = save_to_supabase(row_data, html_content, image_url or "")
            print(f"  ✅ Supabase post id: {post_id}")

            # 4. Post to WordPress (optional — skip if WP_URL not set)
            wp_url = ""
            if WP_URL and WP_USER and WP_APP_PASS:
                print("  📤 กำลังโพสต์ไปยัง WordPress...")
                try:
                    wp_post = create_wp_post(row_data, html_content, image_url or "")
                    wp_url  = wp_post.get("link", "")
                    print(f"  ✅ WordPress: {wp_url}")
                except Exception as wp_err:
                    print(f"  ⚠️ WordPress error (ข้ามได้): {wp_err}")

            # 5. Update sheet
            posted_at = datetime.now(BKK_TZ).strftime("%Y-%m-%d %H:%M:%S")
            update_row(sheet_svc, row_num, ci["status"],    "Posted")
            update_row(sheet_svc, row_num, ci["wp_url"],    wp_url or f"roogondee.com/blog/{row_data['url_slug']}")
            update_row(sheet_svc, row_num, ci["posted_at"], posted_at)

            send_line(f"✅ รู้ก่อนดี โพสต์ใหม่: {title}\nroogondee.com/blog/{row_data['url_slug']}")
            posted_count += 1

        except Exception as e:
            err = str(e)
            print(f"  ❌ Error: {err}")
            update_row(sheet_svc, row_num, ci["notes"], f"Error: {err[:200]}")
            send_line(f"❌ รู้ก่อนดี Error: {title}\n{err[:200]}")

    print(f"\n🎉 เสร็จสิ้น — โพสต์ทั้งหมด {posted_count} บทความ")

if __name__ == "__main__":
    main()
