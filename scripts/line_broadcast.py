# -*- coding: utf-8 -*-
"""
line_broadcast.py — Daily LINE OA broadcast with image + lead-gen CTA

หยิบ post ที่เผยแพร่แล้วและยังไม่เคย broadcast บน LINE → ใช้ Claude เขียน
caption สั้น (≤ 60 คำ) เน้น hook → สร้าง Flex Message พร้อม:
  - hero image (รูปจาก post.image_url ที่ FLUX gen ไว้แล้ว)
  - title + caption
  - ปุ่มหลัก "💬 สนใจรับข้อมูล" → roogondee.com/lead/line?service=...&utm_*
  - ปุ่มรอง "📖 อ่านบทความ" → roogondee.com/blog/...

Broadcast ผ่าน LINE Messaging API (ฟรี tier 200-1000 messages/เดือน
ขึ้นกับ plan) → mark posts.line_broadcast_at + line_broadcast_id
เพื่อกัน broadcast ซ้ำ

Run: GitHub Actions ทุกวัน 18:00 Bangkok (11:00 UTC)
ถ้า LINE_CHANNEL_ACCESS_TOKEN ไม่ตั้งค่า → exit 0 ไม่ทำอะไร (รอ user ตั้งค่า)
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import anthropic

# ─── CONFIG ────────────────────────────────────────────────────────────────
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SECRET"]
LINE_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
LIFF_ID = os.environ.get("LIFF_ID", "").strip()  # if set, lead button uses liff.line.me/<id>
SITE_BASE = os.environ.get("SITE_BASE_URL", "https://roogondee.com").rstrip("/")
MODEL = "claude-haiku-4-5-20251001"

SERVICE_LABELS = {
    "std": "STD & PrEP HIV",
    "glp1": "GLP-1 ลดน้ำหนัก",
    "ckd": "CKD โรคไต",
    "foreign": "ตรวจสุขภาพแรงงาน",
    "general": "ปรึกษาทั่วไป",
}


# ─── SUPABASE HELPERS ──────────────────────────────────────────────────────
def supa_get(path: str, params: dict) -> list:
    qs = urllib.parse.urlencode(params, safe=",.()")
    url = f"{SUPABASE_URL}/rest/v1/{path}?{qs}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def supa_patch(path: str, params: dict, body: dict) -> None:
    qs = urllib.parse.urlencode(params, safe=",.()")
    url = f"{SUPABASE_URL}/rest/v1/{path}?{qs}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="PATCH",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()


# ─── PICK POST ─────────────────────────────────────────────────────────────
def pick_post() -> dict | None:
    """Latest published post that has an image and hasn't been broadcast yet."""
    rows = supa_get(
        "posts",
        {
            "select": "id,title,slug,excerpt,service,image_url,published_at",
            "status": "eq.published",
            "line_broadcast_at": "is.null",
            "image_url": "not.is.null",
            "order": "published_at.desc",
            "limit": "5",
        },
    )
    # filter out empty image urls — Supabase ILIKE on null is fine but empty-string
    # rows may have slipped past the not.is.null check
    for r in rows:
        if r.get("image_url") and r["image_url"].startswith("https://"):
            return r
    return None


# ─── CLAUDE: caption ───────────────────────────────────────────────────────
def write_caption(post: dict) -> str:
    service = post.get("service", "general")
    prompt = f"""คุณเป็น copywriter ของ LINE OA คลินิก รู้ก่อนดี(รู้งี้)

โพสต์ที่จะโปรโมต:
- Title: {post.get("title","")}
- Service: {SERVICE_LABELS.get(service, service)}
- Excerpt: {(post.get("excerpt") or "")[:300]}

เขียน caption สำหรับ Flex Message LINE OA ที่:
1. ดึงดูด hook ใน 1 ประโยคแรก (≤ 12 คำ)
2. ตามด้วย 1-2 ประโยค pain/insight
3. ปิดด้วยคำชวนแบบนุ่มนวล (ห้าม hard-sell, ห้ามใช้ภาษา clickbait)
4. รวมทั้งหมด **40-60 คำ** ภาษาไทยเป็นกันเอง
5. ห้ามใส่ emoji เกิน 2 ตัว ห้ามใช้ hashtag (LINE Flex แสดงไม่ดี)
6. ห้ามสัญญาเรื่องการรักษา ห้ามระบุราคา

ตอบกลับเป็นข้อความ caption อย่างเดียว ห้ามมี markdown / quote"""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()


# ─── FLEX MESSAGE ──────────────────────────────────────────────────────────
def build_flex(post: dict, caption: str) -> dict:
    service = post.get("service", "general")
    # truncate title to fit Flex layout safely
    title = (post.get("title") or "")[:80]
    image_url = post["image_url"]
    blog_url = f"{SITE_BASE}/blog/{post.get('slug','')}"
    # Prefer the LIFF entry URL when configured — opens inside LINE with full
    # SDK access so we can capture the user's LINE userId silently. Falls back
    # to the plain landing page when LIFF_ID is unset.
    if LIFF_ID:
        lead_base = f"https://liff.line.me/{LIFF_ID}"
    else:
        lead_base = f"{SITE_BASE}/lead/line"
    lead_url = (
        f"{lead_base}"
        f"?service={urllib.parse.quote(service)}"
        f"&utm_source=line&utm_medium=broadcast&utm_campaign={urllib.parse.quote(post.get('slug','') or 'daily')}"
    )

    return {
        "type": "flex",
        "altText": f"{title} — {SERVICE_LABELS.get(service, service)}",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "hero": {
                "type": "image",
                "url": image_url,
                "size": "full",
                "aspectRatio": "1.91:1",
                "aspectMode": "cover",
                "action": {"type": "uri", "uri": blog_url},
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "text",
                        "text": SERVICE_LABELS.get(service, "สุขภาพ"),
                        "size": "xs",
                        "color": "#5B8C7B",
                        "weight": "bold",
                    },
                    {
                        "type": "text",
                        "text": title,
                        "size": "lg",
                        "weight": "bold",
                        "color": "#2D4A3E",
                        "wrap": True,
                    },
                    {
                        "type": "text",
                        "text": caption,
                        "size": "sm",
                        "color": "#555555",
                        "wrap": True,
                        "margin": "md",
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#2D4A3E",
                        "action": {
                            "type": "uri",
                            "label": "💬 สนใจรับข้อมูล",
                            "uri": lead_url,
                        },
                    },
                    {
                        "type": "button",
                        "style": "secondary",
                        "action": {
                            "type": "uri",
                            "label": "📖 อ่านบทความ",
                            "uri": blog_url,
                        },
                    },
                ],
            },
        },
    }


# ─── LINE BROADCAST ────────────────────────────────────────────────────────
def line_broadcast(message: dict) -> str:
    """POST broadcast and return the X-Line-Request-Id header for audit."""
    payload = json.dumps({"messages": [message]}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.line.me/v2/bot/message/broadcast",
        data=payload,
        headers={
            "Authorization": f"Bearer {LINE_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        # 200 OK with empty body on success
        request_id = resp.headers.get("X-Line-Request-Id", "")
        return request_id or "ok"


def mark_broadcast(post_id: str, broadcast_id: str) -> None:
    supa_patch(
        "posts",
        {"id": f"eq.{post_id}"},
        {
            "line_broadcast_at": datetime.now(timezone.utc).isoformat(),
            "line_broadcast_id": broadcast_id,
        },
    )


# ─── MAIN ──────────────────────────────────────────────────────────────────
def main() -> int:
    if not LINE_TOKEN:
        print("LINE_CHANNEL_ACCESS_TOKEN not set — skipping (not configured yet).")
        return 0

    post = pick_post()
    if not post:
        print("No eligible post to broadcast (all caught up or none have image).")
        return 0

    print(f"Picked post: {post.get('title')!r} (service={post.get('service')})")
    caption = write_caption(post)
    print(f"Caption: {caption!r}")

    flex = build_flex(post, caption)
    try:
        request_id = line_broadcast(flex)
    except urllib.error.HTTPError as e:  # noqa: PERF203
        body = e.read().decode("utf-8", errors="ignore")
        print(f"LINE broadcast failed ({e.code}): {body}", file=sys.stderr)
        return 1

    print(f"Broadcast OK — request_id={request_id}")
    mark_broadcast(post["id"], request_id)
    print("Marked posts.line_broadcast_at — done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
