"""
rugondee-autopost: autopost.py
รู้ก่อนดี (RuGonDee) — Auto-post Python → Claude API → WordPress REST API
Company: บริษัท โรจน์รุ่งธุรกิจ จำกัด | rugondee.com
"""

import os
import json
import base64
import requests
from datetime import datetime, date
import anthropic
from google.oauth2 import service_account
from googleapiclient.discovery import build
from zoneinfo import ZoneInfo

# ─── CONFIG ────────────────────────────────────────────────────────────────────
WP_URL       = os.environ["WP_URL"].rstrip("/")
WP_USER      = os.environ["WP_USER"]
WP_APP_PASS  = os.environ["WP_APP_PASS"]
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
GSHEET_ID    = os.environ["GSHEET_ID"]
GSHEET_CREDS = os.environ["GSHEET_CREDS_JSON"]
LINE_TOKEN   = os.environ.get("LINE_NOTIFY_TOKEN", "")

SHEET_NAME   = "Content"
BKK_TZ       = ZoneInfo("Asia/Bangkok")
TODAY_STR    = date.today().strftime("%Y-%m-%d")

WP_AUTH      = base64.b64encode(f"{WP_USER}:{WP_APP_PASS}".encode()).decode()
WP_HEADERS   = {
    "Authorization": f"Basic {WP_AUTH}",
    "Content-Type": "application/json",
}

# ─── GOOGLE SHEETS ─────────────────────────────────────────────────────────────

def get_sheet_service():
    creds_info = json.loads(GSHEET_CREDS)
    creds = service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
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
    headers = rows[0]
    return headers, rows[1:]

def col_index(headers, col_name):
    try:
        return headers.index(col_name)
    except ValueError:
        raise ValueError(f"ไม่พบ column '{col_name}' ใน sheet")

def update_row(service, row_num, col, value):
    """row_num เริ่มจาก 2 (row 1 = header)"""
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

    system_prompt = """คุณเป็นนักเขียนบทความสุขภาพผู้หญิงระดับ Medical Grade สำหรับเว็บไซต์ รู้ก่อนดี (rugondee.com)
โดยบริษัท โรจน์รุ่งธุรกิจ จำกัด ร่วมกับ W Medical Hospital

กฎการเขียน:
- ภาษาไทย อ่านง่าย ไม่ตัดสิน
- Evidence-based, อ้างอิงงานวิจัย
- ความยาว 900-1,200 คำ
- Output เป็น HTML สำหรับ WordPress (ไม่ใช่ Markdown)
- ใช้ <h2>, <h3>, <p>, <ul>, <strong>, <em> เท่านั้น
- ลงท้ายด้วย CTA: ชวนติดต่อ LINE OA @034qjajh หรือ rugondee.com
- ห้ามใส่ <!DOCTYPE>, <html>, <head>, <body>, <style>"""

    user_prompt = f"""เขียนบทความ WordPress สำหรับหัวข้อ:

ชื่อเรื่อง: {row_data['title']}
หมวดหมู่: {row_data['category']}
Focus Keyword: {row_data['focus_keyword']}
คีย์เวิร์ดรอง: {row_data['post_body_seed']}
Meta Description: {row_data['meta_description']}

เขียนบทความ HTML ให้ครบ 900-1,200 คำ ตรงตาม SEO keyword และ tone ของแบรนด์"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
    )
    return message.content[0].text

# ─── WORDPRESS ─────────────────────────────────────────────────────────────────

def get_or_create_term(endpoint: str, name: str) -> int:
    """หา category/tag ID หรือสร้างใหม่"""
    resp = requests.get(
        f"{WP_URL}/wp-json/wp/v2/{endpoint}",
        params={"search": name},
        headers=WP_HEADERS
    )
    items = resp.json()
    if isinstance(items, list) and items:
        return items[0]["id"]

    resp = requests.post(
        f"{WP_URL}/wp-json/wp/v2/{endpoint}",
        json={"name": name},
        headers=WP_HEADERS
    )
    return resp.json()["id"]

def upload_image(image_path: str, title: str) -> int | None:
    """อัปโหลดรูปภาพไปยัง WordPress Media Library"""
    if not image_path or not os.path.exists(image_path):
        return None

    ext = os.path.splitext(image_path)[1].lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".webp": "image/webp"}
    mime = mime_map.get(ext, "image/jpeg")

    with open(image_path, "rb") as f:
        resp = requests.post(
            f"{WP_URL}/wp-json/wp/v2/media",
            headers={
                "Authorization": f"Basic {WP_AUTH}",
                "Content-Disposition": f'attachment; filename="{os.path.basename(image_path)}"',
                "Content-Type": mime,
            },
            data=f.read()
        )
    if resp.status_code == 201:
        return resp.json()["id"]
    print(f"⚠️ อัปโหลดรูปไม่สำเร็จ: {resp.status_code} {resp.text}")
    return None

def create_post(row_data: dict, html_content: str) -> dict:
    """สร้าง WordPress post"""
    cat_id = get_or_create_term("categories", row_data["category"])

    tags = []
    for kw in row_data.get("focus_keyword", "").split(","):
        kw = kw.strip()
        if kw:
            tags.append(get_or_create_term("tags", kw))

    featured_media = upload_image(
        row_data.get("image_file", ""),
        row_data.get("title", "")
    )

    payload = {
        "title":   row_data["title"],
        "content": html_content,
        "status":  "publish",
        "slug":    row_data.get("url_slug", ""),
        "categories": [cat_id],
        "tags":    tags,
        "meta": {
            "rank_math_description":     row_data.get("meta_description", ""),
            "rank_math_focus_keyword":   row_data.get("focus_keyword", ""),
        }
    }
    if featured_media:
        payload["featured_media"] = featured_media

    resp = requests.post(
        f"{WP_URL}/wp-json/wp/v2/posts",
        json=payload,
        headers=WP_HEADERS
    )
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
    service = get_sheet_service()
    headers, rows = get_rows(service)

    # Column indexes
    ci = {col: col_index(headers, col) for col in [
        "day_number", "scheduled_date", "platform", "title",
        "meta_description", "url_slug", "focus_keyword",
        "category", "post_body_seed", "image_file",
        "status", "wp_url", "posted_at", "notes"
    ]}

    posted_count = 0
    for i, row in enumerate(rows):
        row_num = i + 2  # sheet row (1=header)

        def get(col): return row[ci[col]] if ci[col] < len(row) else ""

        scheduled = get("scheduled_date")
        status    = get("status")
        platform  = get("platform")

        if scheduled != TODAY_STR:
            continue
        if status != "Ready":
            continue
        if platform != "Blog/SEO":
            continue

        title = get("title")
        print(f"\n📝 กำลังโพสต์: {title}")

        row_data = {
            "title":            title,
            "meta_description": get("meta_description"),
            "url_slug":         get("url_slug"),
            "focus_keyword":    get("focus_keyword"),
            "category":         get("category"),
            "post_body_seed":   get("post_body_seed"),
            "image_file":       get("image_file"),
        }

        try:
            print("  🤖 กำลังสร้างเนื้อหาด้วย Claude...")
            html_content = generate_content(row_data)

            print("  📤 กำลังโพสต์ไปยัง WordPress...")
            wp_post = create_post(row_data, html_content)
            wp_url  = wp_post.get("link", "")
            posted_at = datetime.now(BKK_TZ).strftime("%Y-%m-%d %H:%M:%S")

            update_row(service, row_num, ci["status"],    "Posted")
            update_row(service, row_num, ci["wp_url"],    wp_url)
            update_row(service, row_num, ci["posted_at"], posted_at)

            print(f"  ✅ สำเร็จ! {wp_url}")
            send_line(f"✅ รู้ก่อนดี โพสต์ใหม่: {title}\n{wp_url}")
            posted_count += 1

        except Exception as e:
            err = str(e)
            print(f"  ❌ Error: {err}")
            update_row(service, row_num, ci["notes"], f"Error: {err[:200]}")
            send_line(f"❌ รู้ก่อนดี Error: {title}\n{err[:200]}")

    print(f"\n🎉 เสร็จสิ้น — โพสต์ทั้งหมด {posted_count} บทความ")

if __name__ == "__main__":
    main()
