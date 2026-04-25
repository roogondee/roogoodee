# -*- coding: utf-8 -*-
"""
faq_mine.py — Weekly FAQ mining

รวมคำถามของจริงจากเว็บ 14 วันล่าสุด:
  - qa_posts (ผู้ใช้พิมพ์คำถามใน /ask)
  - chat_sessions (user text ใน widget)

ให้ Claude:
  - จัด cluster คำถามที่ถามซ้ำๆ ตาม service
  - แนะนำ pillar article / content cluster ที่ควรเขียน
  - ชี้ "question-gap" ที่ยังไม่มีในบล็อก

ส่งสรุปทางอีเมลทุกวันอาทิตย์ให้ทีมคอนเทนต์ใช้วางแผน

Run: GitHub Actions ทุกวันอาทิตย์ 09:00 Bangkok (02:00 UTC)
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
MODEL = "claude-haiku-4-5-20251001"

WINDOW_DAYS = 14
MAX_QUESTIONS = 250  # cap prompt size


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


def fetch_qa_posts() -> list:
    cutoff = iso_n_days_ago(WINDOW_DAYS)
    return supa_get(
        "qa_posts",
        {
            "select": "question,service,created_at",
            "created_at": f"gte.{cutoff}",
            "order": "created_at.desc",
            "limit": str(MAX_QUESTIONS),
        },
    )


def fetch_chat_sessions() -> list:
    cutoff = iso_n_days_ago(WINDOW_DAYS)
    return supa_get(
        "chat_sessions",
        {
            "select": "messages,service_hint,turn_count,updated_at",
            "updated_at": f"gte.{cutoff}",
            "order": "updated_at.desc",
            "limit": str(MAX_QUESTIONS),
        },
    )


def fetch_published_posts() -> list:
    """Recent blog titles so we don't re-suggest what's already written."""
    return supa_get(
        "posts",
        {
            "select": "title,service",
            "status": "eq.published",
            "order": "published_at.desc",
            "limit": "80",
        },
    )


def extract_first_user_text(messages) -> str:
    if not isinstance(messages, list):
        return ""
    for m in messages:
        if m.get("role") != "user":
            continue
        c = m.get("content")
        if isinstance(c, str):
            return c[:300]
        if isinstance(c, list):
            for block in c:
                if isinstance(block, dict) and block.get("type") == "text":
                    return (block.get("text") or "")[:300]
    return ""


def build_prompt(questions: list, recent_titles: list) -> str:
    q_block = "\n".join(f"- [{q['service']}] {q['text']}" for q in questions[:MAX_QUESTIONS])
    titles_block = "\n".join(f"- [{p['service']}] {p['title']}" for p in recent_titles)
    return f"""คุณเป็นบรรณาธิการคอนเทนต์สุขภาพของเว็บ รู้ก่อนดี(รู้งี้)

ด้านล่างคือคำถามของจริงที่ผู้ใช้ถามในเว็บ {WINDOW_DAYS} วันล่าสุด ({len(questions)} คำถาม):

{q_block}

บทความที่เราเผยแพร่ไปแล้วล่าสุด:
{titles_block}

ทำ analysis ให้เป็นภาษาไทย:

## Top question clusters
จัด cluster คำถามที่ถามซ้ำ (5-8 cluster) — ระบุ service, topic, จำนวน/สัดส่วน, และคำถาม example 1-2 คำถาม

## Pillar articles ที่ควรเขียนเพิ่ม
แนะนำ 5-8 บทความที่ยังไม่มีในลิสต์เผยแพร่ พร้อม:
- title (ภาษาไทย, SEO-friendly)
- focus_kw (keyword หลัก)
- service (std/glp1/ckd/foreign)
- เหตุผลสั้นๆ ว่าทำไมควรเขียน (อ้างจาก cluster ข้างบน)

## Content-gap signals
ระบุ 2-3 pattern ที่น่าสังเกต (เช่น มีคำถามเรื่องราคามากแต่เว็บไม่มีหน้า pricing ชัด, คำถามภาษาเมียนมาเยอะผิดปกติ ฯลฯ)

ตอบกระชับ ไม่เกิน 600 คำ"""


def run_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()


def send_email(summary: str, q_count: int) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    html = f"""
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#f8faf8;padding:24px;border-radius:12px;">
  <h2 style="color:#2D4A3E;margin-top:0;">🔍 FAQ Mining — {today}</h2>
  <p style="color:#666;font-size:13px;">คำถามจริงจากเว็บ {WINDOW_DAYS} วันล่าสุด: <b>{q_count}</b> คำถาม</p>
  <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:sans-serif;font-size:14px;line-height:1.6;color:#222;background:#fff;padding:16px;border-radius:8px;border:1px solid #e0ebe3;">
{summary}
  </pre>
</div>
""".strip()
    payload = json.dumps(
        {
            "from": "รู้ก่อนดี(รู้งี้) <onboarding@resend.dev>",
            "to": [NOTIFY_EMAIL],
            "subject": f"🔍 FAQ Mining — {today} ({q_count} questions)",
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
    print(f"Mining {WINDOW_DAYS}-day FAQ window …")
    qa = fetch_qa_posts()
    sessions = fetch_chat_sessions()

    questions = [{"text": (r["question"] or "").strip()[:300], "service": r.get("service", "general")}
                 for r in qa if r.get("question")]
    for s in sessions:
        t = extract_first_user_text(s.get("messages"))
        if t:
            questions.append({"text": t, "service": s.get("service_hint", "general")})

    # dedupe near-identical questions
    seen = set()
    deduped = []
    for q in questions:
        key = q["text"][:80].lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(q)
    questions = deduped[:MAX_QUESTIONS]

    print(f"  qa_posts: {len(qa)}  chat sessions: {len(sessions)}  unique: {len(questions)}")

    if len(questions) < 5:
        print("Not enough questions to analyse. Skipping.")
        return 0

    recent = fetch_published_posts()
    print(f"  recent posts (exclusion list): {len(recent)}")

    summary = run_claude(build_prompt(questions, recent))
    print("\n" + "=" * 60)
    print(summary)
    print("=" * 60 + "\n")

    send_email(summary, len(questions))
    return 0


if __name__ == "__main__":
    sys.exit(main())
