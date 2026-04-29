"""
roogondee-autopost: fb_caption.py
รู้ก่อนดี (RuGonDee) — Facebook Daily Caption
ดึงโพสต์ล่าสุดจากเว็บไซต์ roogondee.com (ผ่าน Supabase) → สร้าง caption ด้วย Claude → โพสต์ Facebook Page
Company: บริษัท เจียรักษา จำกัด | roogondee.com
"""

import os
import re
import sys
import requests
from datetime import date, datetime
from zoneinfo import ZoneInfo

import anthropic
from supabase import create_client

# ─── CONFIG ────────────────────────────────────────────────────────────────────
ANTHROPIC_KEY     = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL      = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY      = os.environ["SUPABASE_SECRET"]
FB_PAGE_ID        = os.environ.get("FB_PAGE_ID", "")
FB_PAGE_TOKEN     = os.environ.get("FB_PAGE_ACCESS_TOKEN", "")
LINE_TOKEN        = os.environ.get("LINE_NOTIFY_TOKEN", "")
SITE_BASE         = os.environ.get("SITE_BASE_URL", "https://www.roogondee.com").rstrip("/")

BKK_TZ    = ZoneInfo("Asia/Bangkok")
TODAY_STR = date.today().strftime("%Y-%m-%d")

SERVICE_HASHTAGS = {
    "std":     "#สุขภาพทางเพศ #ตรวจโรคติดต่อทางเพศสัมพันธ์ #STD",
    "glp1":    "#GLP1 #ลดน้ำหนัก #ฮอร์โมน #สุขภาพ",
    "ckd":     "#โรคไต #CKD #ดูแลไต #สุขภาพ",
    "foreign": "#แรงงานต่างด้าว #ตรวจสุขภาพ #ใบรับรองแพทย์",
    # mens — Pillar A only (วัยทอง / พลังงาน / lifestyle).
    # ห้ามใช้ #ED #PrEP #แข็งตัว — Meta จะ flag
    "mens":    "#สุขภาพชาย #วัยทองชาย #ฮอร์โมนชาย #ชายวัย40 #andropause",
}

# ─── SUPABASE ──────────────────────────────────────────────────────────────────

def get_sb():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_post_to_share() -> dict | None:
    """
    เลือกโพสต์ 1 บทความสำหรับโพสต์ Facebook วันนี้
    ลำดับความสำคัญ:
      1. บทความที่ published_at = วันนี้ และยังไม่เคยโพสต์ Facebook
      2. บทความ published ล่าสุดที่ยังไม่เคยโพสต์ Facebook
    """
    sb = get_sb()

    today_iso_start = datetime.now(BKK_TZ).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # 1) โพสต์ของวันนี้ที่ยังไม่โพสต์ FB
    todays = (
        sb.table("posts")
        .select("*")
        .eq("status", "published")
        .is_("fb_posted_at", "null")
        .gte("published_at", today_iso_start)
        .order("published_at", desc=True)
        .limit(1)
        .execute()
    )
    if todays.data:
        return todays.data[0]

    # 2) โพสต์ล่าสุดที่ยังไม่โพสต์ FB
    latest = (
        sb.table("posts")
        .select("*")
        .eq("status", "published")
        .is_("fb_posted_at", "null")
        .order("published_at", desc=True)
        .limit(1)
        .execute()
    )
    return latest.data[0] if latest.data else None

def mark_fb_posted(post_id: str, fb_post_id: str, caption: str) -> None:
    sb = get_sb()
    sb.table("posts").update({
        "fb_posted_at": datetime.now(BKK_TZ).isoformat(),
        "fb_post_id":   fb_post_id,
        "fb_caption":   caption,
    }).eq("id", post_id).execute()

# ─── CAPTION GENERATION (CLAUDE) ──────────────────────────────────────────────

def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def generate_caption(post: dict, link: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    excerpt = post.get("excerpt") or _strip_html(post.get("content", ""))[:600]
    service = post.get("service", "")
    tags    = SERVICE_HASHTAGS.get(service, "#สุขภาพ #roogondee")
    is_mens = service == "mens"

    system_prompt = (
        "คุณเป็นแอดมินเพจสุขภาพ รู้ก่อนดี (roogondee.com) โดยบริษัท เจียรักษา จำกัด\n"
        "เขียน caption Facebook ภาษาไทย กระชับ อ่านง่าย ชวนคลิกลิงก์\n"
        "กฎ:\n"
        "- ความยาว 3-5 บรรทัด (ไม่เกิน 500 ตัวอักษรก่อนรวม hashtag)\n"
        "- เริ่มด้วย hook สะดุดตา 1 บรรทัด (อาจใช้คำถามหรือสถิติ)\n"
        "- สรุปประเด็นสำคัญ 2-3 ข้อแบบ bullet (ใช้ • หรือ ✅)\n"
        "- ลงท้ายด้วย CTA อ่านต่อที่ลิงก์ + ติดต่อ LINE @roogondee\n"
        "- จบด้วย hashtag ที่เกี่ยวข้อง 3-5 อัน\n"
        "- ห้ามใช้ Markdown เช่น ** หรือ ##\n"
        "- ห้ามใส่ emoji เกิน 4 ตัวในทั้ง caption"
    )
    if is_mens:
        system_prompt += (
            "\n\n⚠️ COMPLIANCE สำหรับโพสต์สุขภาพชาย (บังคับ):\n"
            "- ห้ามใช้คำว่า ED, แข็งตัว, สมรรถภาพทางเพศ, เพิ่มขนาด, อึด, ทน X นาที\n"
            "- ห้ามระบุชื่อยา (sildenafil, tadalafil, Viagra, Cialis, Nebido)\n"
            "- ห้ามใช้ 'รักษาหายขาด', '100%', 'การันตี', 'แจกยา', 'ยาฟรี'\n"
            "- เน้น Pillar A: พลังงาน อารมณ์ สุขภาพรวม ฮอร์โมนเชิงให้ความรู้\n"
            "- tone: ให้ความรู้ ไม่ตัดสิน ไม่ขายของ\n"
            "- เพิ่มประโยค 'ปรึกษาแพทย์ที่ W Medical Hospital'"
        )

    user_prompt = f"""เขียน caption Facebook สำหรับบทความนี้:

ชื่อเรื่อง: {post['title']}
หมวด: {post.get('category', '')}
Focus keyword: {post.get('focus_kw', '')}
Meta description: {post.get('meta_desc', '')}
Excerpt/เนื้อหาย่อ: {excerpt[:800]}

ลิงก์บทความ: {link}
Hashtag แนะนำ: {tags}

ส่งคืนเฉพาะข้อความ caption ไม่ต้องมีคำอธิบายอื่น"""

    def _call_claude() -> str:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=700,
            messages=[{"role": "user", "content": user_prompt}],
            system=system_prompt,
        )
        return msg.content[0].text.strip()

    caption = _call_claude()

    # Mens compliance gate — retry up to 3 times if forbidden words detected.
    if is_mens:
        from compliance import check_caption_compliance
        ok, issues = check_caption_compliance(caption, service)
        attempt = 1
        while not ok and attempt < 3:
            print(f"  ⚠️ caption compliance fail (try {attempt}): {issues}")
            caption = _call_claude()
            ok, issues = check_caption_compliance(caption, service)
            attempt += 1
        if not ok:
            raise RuntimeError(f"mens caption compliance ไม่ผ่าน: {' | '.join(issues)}")

    # ensure link is present
    if link not in caption:
        caption = f"{caption}\n\n🔗 {link}"

    return caption

# ─── FACEBOOK GRAPH API ────────────────────────────────────────────────────────

FB_API = "https://graph.facebook.com/v19.0"

def post_to_facebook(caption: str, link: str, image_url: str | None) -> str:
    """
    โพสต์ไปยัง Facebook Page แบบ Link Preview
    ใช้ /feed + link เสมอ → Facebook ดึง OG image/title จาก URL
    ผู้ใช้กดที่การ์ดหรือรูปแล้วเข้าสู่บทความได้โดยตรง
    คืนค่า fb_post_id
    """
    if not FB_PAGE_ID or not FB_PAGE_TOKEN:
        raise RuntimeError("ขาด FB_PAGE_ID หรือ FB_PAGE_ACCESS_TOKEN")

    resp = requests.post(
        f"{FB_API}/{FB_PAGE_ID}/feed",
        data={
            "message":       caption,
            "link":          link,
            "access_token":  FB_PAGE_TOKEN,
        },
        timeout=60,
    )

    if resp.status_code >= 400:
        raise RuntimeError(f"Facebook API error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    # /photos → {id, post_id}, /feed → {id}
    return data.get("post_id") or data.get("id", "")

# ─── LINE NOTIFY ───────────────────────────────────────────────────────────────

from notify import notify as _notify

def send_line(message: str) -> None:
    """legacy name — เรียก notify ใหม่ที่รองรับ Discord/Slack/LINE Messaging"""
    _notify(message)

# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main() -> int:
    print(f"📘 รู้ก่อนดี Facebook Caption — {TODAY_STR}")

    post = get_post_to_share()
    if not post:
        print("📭 ไม่มีบทความให้แชร์ (posts ทั้งหมดถูกแชร์ Facebook แล้ว)")
        return 0

    title = post["title"]
    slug  = post["slug"]
    link  = f"{SITE_BASE}/blog/{slug}"
    image = post.get("image_url") or None

    print(f"📝 เลือกบทความ: {title}")
    print(f"🔗 {link}")

    try:
        print("🤖 กำลังสร้าง caption ด้วย Claude...")
        caption = generate_caption(post, link)
        print("---- caption ----")
        print(caption)
        print("-----------------")

        print("📤 กำลังโพสต์ไปยัง Facebook Page...")
        fb_post_id = post_to_facebook(caption, link, image)
        print(f"✅ Facebook post: {fb_post_id}")

        mark_fb_posted(post["id"], fb_post_id, caption)
        return 0

    except Exception as e:
        err = str(e)
        print(f"❌ Error: {err}")
        send_line(f"❌ รู้ก่อนดี FB Error: {title}\n{err[:300]}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
