# -*- coding: utf-8 -*-
"""
tiktok_scripts.py — Weekly TikTok / short-video scripts

คัด blog posts ที่เผยแพร่ 30 วันล่าสุด ให้ Claude เลือก 5 เรื่องที่ทำคลิปสั้น
แล้วได้ engagement สูง (topic ที่ relatable, emotional hook, ใช้ visual ง่าย)
จากนั้นเขียนสคริปต์ 30-60 วินาที พร้อม:
  - Hook 3 วิแรก (ต้องหยุดนิ้ว user)
  - Body (1-2 pain points + คำตอบ)
  - CTA ชัด
  - Visual cue (b-roll idea, caption, text overlay)
  - Hashtag suggestions

ส่งอีเมลให้ทีมมาร์เก็ตติ้งไปถ่ายได้เลย

Run: ทุกวันอังคาร 09:00 Bangkok (02:00 UTC)
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import anthropic

ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SECRET"]
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "team@roogondee.com")
MODEL = "claude-sonnet-4-6"   # creative writing — upgrade from Haiku

WINDOW_DAYS = 30
SCRIPTS_PER_RUN = 5


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


def iso_n_days_ago(d: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=d)).isoformat()


def fetch_recent_posts() -> list:
    cutoff = iso_n_days_ago(WINDOW_DAYS)
    posts = supa_get(
        "posts",
        {
            "select": "id,title,slug,excerpt,content,service,focus_kw,published_at",
            "status": "eq.published",
            "published_at": f"gte.{cutoff}",
            "order": "published_at.desc",
            "limit": "40",
        },
    )
    # mens vertical → ไม่ทำ TikTok script auto จนกว่าจะ phase 3
    # (CONTEXT §10 — TikTok mens เริ่มหลัง GLP-1 เดือน 4)
    # ตั้ง MENS_TIKTOK_ENABLE=1 เพื่อเปิดใช้
    if os.environ.get("MENS_TIKTOK_ENABLE") != "1":
        posts = [p for p in posts if p.get("service") != "mens"]
    return posts


def build_prompt(posts: list) -> str:
    post_block = "\n\n".join(
        f"[{idx}] service={p.get('service')}  title={p.get('title')}\n"
        f"    url: https://roogondee.com/blog/{p.get('slug')}\n"
        f"    excerpt: {(p.get('excerpt') or '')[:180]}\n"
        f"    content_preview: {(p.get('content') or '')[:450]}"
        for idx, p in enumerate(posts, 1)
    )
    return f"""คุณเป็น TikTok script writer ให้คลินิกสุขภาพในไทย (รู้ก่อนดี(รู้งี้) / W Medical Hospital)
target audience: คนไทย อายุ 18-45 บน TikTok / Reels / Shorts
ภาษา: ไทย เป็นกันเอง ไม่ medical jargon

ด้านล่างคือบทความที่เราเผยแพร่ใน {WINDOW_DAYS} วันล่าสุด:

{post_block}

งาน:
1) เลือก {SCRIPTS_PER_RUN} เรื่องที่มี potential viral สูงสุด — ให้ความสำคัญกับ:
   - topic ที่ relatable หรือเป็น pain point ของวัยทำงาน/คนเมือง
   - มี emotional hook หรือ myth-busting ได้
   - ถ่ายทำง่าย (ไม่ต้องทีม production ใหญ่)
   - AVOID topic ที่ละเอียดอ่อนเกินและอาจโดน TikTok restrict (เช่น STD อาจถูก suppress ถ้าเน้นภาพ
     — แต่ทำเป็น myth-busting หรือ storytelling ผู้หญิงพูดถึงการตรวจปกติได้)

2) สำหรับแต่ละเรื่อง เขียน:
   - post_index (เลขจากลิสต์ข้างบน)
   - why (1 บรรทัด ทำไมเรื่องนี้มี potential)
   - hook (3 วิแรก ≤ 15 คำ — ต้องทำให้คนหยุด scroll)
   - body (ความยาวพูด 40-50 วิ — แบ่งเป็น 3-4 beats มีทั้ง pain, myth vs fact, insight)
   - cta (5-7 วิสุดท้าย — ชวน save, comment, หรือทักแชทเว็บ roogondee.com)
   - visual_notes (b-roll / text overlay / transition ideas)
   - hashtags (6-8 อัน mix broad + niche, ห้ามใช้ hashtag ที่ชัดเจนเกินไปเรื่อง STD)

ตอบเป็น plain text ให้อ่านง่าย — แยก 5 สคริปต์ด้วย "═══════════"
ไม่ต้องใช้ markdown fence

เริ่มได้เลย"""


def run_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    return "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()


def send_email(scripts_text: str, post_count: int) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    html = f"""
<div style="font-family:sans-serif;max-width:700px;margin:0 auto;background:#f8faf8;padding:24px;border-radius:12px;">
  <h2 style="color:#2D4A3E;margin-top:0;">🎬 TikTok Scripts — {today}</h2>
  <p style="color:#666;font-size:13px;">เลือกจาก <b>{post_count}</b> บทความ {WINDOW_DAYS} วันล่าสุด</p>
  <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:sans-serif;font-size:13.5px;line-height:1.6;color:#222;background:#fff;padding:18px;border-radius:8px;border:1px solid #e0ebe3;">
{scripts_text}
  </pre>
</div>
""".strip()
    payload = json.dumps(
        {
            "from": "รู้ก่อนดี(รู้งี้) <onboarding@resend.dev>",
            "to": [NOTIFY_EMAIL],
            "subject": f"🎬 TikTok Scripts — {today}",
            "html": html,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"Email sent: {resp.status}")
    except Exception as e:  # noqa: BLE001
        print(f"Email send failed: {e}", file=sys.stderr)


def main() -> int:
    print(f"Fetching posts published within {WINDOW_DAYS} days …")
    posts = fetch_recent_posts()
    print(f"  posts: {len(posts)}")

    if len(posts) < 3:
        print("Too few posts to generate scripts. Skipping.")
        return 0

    scripts = run_claude(build_prompt(posts))
    print("\n" + "=" * 60)
    print(scripts)
    print("=" * 60 + "\n")

    send_email(scripts, len(posts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
