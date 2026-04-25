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
from datetime import date, datetime, timedelta, timezone

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


def supa_post(path: str, rows: list) -> None:
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(rows).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()


def fetch_existing_slugs() -> set:
    cp = supa_get("content_plan", {"select": "slug", "status": "neq.error"})
    posts = supa_get("posts", {"select": "slug"})
    out: set = set()
    for r in cp + posts:
        s = r.get("slug")
        if s:
            out.add(s)
    return out


def next_scheduled_date() -> date:
    rows = supa_get(
        "content_plan",
        {"select": "scheduled_date", "order": "scheduled_date.desc", "limit": "1"},
    )
    if rows and rows[0].get("scheduled_date"):
        latest = datetime.fromisoformat(rows[0]["scheduled_date"]).date()
        return latest + timedelta(days=1)
    return (datetime.now(timezone.utc) + timedelta(days=1)).date()


def queue_briefs(briefs: list, existing_slugs: set) -> list:
    accepted = []
    used_slugs = set(existing_slugs)
    cursor = next_scheduled_date()
    for b in briefs:
        slug = (b.get("slug") or "").strip().lower()
        if not slug or slug in used_slugs:
            continue
        if b.get("service") not in ("std", "glp1", "ckd", "foreign"):
            continue
        if not (b.get("title") and b.get("focus_kw")):
            continue
        b["scheduled_date"] = cursor.isoformat()
        accepted.append(b)
        used_slugs.add(slug)
        cursor += timedelta(days=1)

    rows = [
        {
            "scheduled_date": b["scheduled_date"],
            "service": b["service"],
            "title": b["title"][:200],
            "focus_kw": b.get("focus_kw", "")[:120],
            "meta_desc": b.get("meta_desc", "")[:200],
            "slug": b["slug"][:120],
            "seed": b.get("seed", "")[:500],
            "status": "ready",
        }
        for b in accepted
    ]
    supa_post("content_plan", rows)
    return accepted


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


def build_prompt(questions: list, recent_titles: list, existing_slugs: set) -> str:
    q_block = "\n".join(f"- [{q['service']}] {q['text']}" for q in questions[:MAX_QUESTIONS])
    titles_block = "\n".join(f"- [{p['service']}] {p['title']}" for p in recent_titles)
    slug_hint = ", ".join(sorted(existing_slugs)[:30]) if existing_slugs else "(ยังไม่มี)"

    return f"""คุณเป็นบรรณาธิการคอนเทนต์สุขภาพของเว็บ รู้ก่อนดี(รู้งี้)

ข้อมูล:
A) คำถามจริงจากผู้ใช้ {WINDOW_DAYS} วันล่าสุด ({len(questions)} คำถาม):
{q_block}

B) บทความที่เผยแพร่แล้ว (ห้ามเสนอซ้ำ):
{titles_block}

C) Slug ใน pipeline (ห้ามใช้ซ้ำ):
{slug_hint}

งาน: cluster คำถามใน A หาเรื่องที่ถามซ้ำสูงสุดแต่เรายังไม่มีบทความ → สร้าง pillar
content brief 6 ชิ้น

ตอบเป็น JSON อย่างเดียว ห้ามมี markdown / text อื่น:

{{
  "summary": "1-2 ประโยคสรุปภาพรวม question landscape",
  "clusters": [
    {{ "topic": "ชื่อ cluster", "service": "std|glp1|ckd|foreign|general", "count_estimate": 5, "examples": ["คำถาม 1", "คำถาม 2"] }}
  ],
  "briefs": [
    {{
      "service": "std" | "glp1" | "ckd" | "foreign",
      "title": "หัวเรื่อง ≤ 60 ตัวอักษร",
      "focus_kw": "keyword หลัก",
      "slug": "english-kebab-case-unique",
      "meta_desc": "120-155 ตัวอักษร",
      "seed": "1-2 ประโยคบอก angle ของบทความ + อ้างถึง cluster ที่มาจาก",
      "rationale": "เหตุผลสั้นๆ"
    }}
  ],
  "gap_signals": [
    "1-2 pattern ที่น่าสังเกต (เช่น เรื่องราคา / ภาษา / segment)"
  ]
}}

กฎ: slug ต้องไม่ซ้ำลิสต์ C, title ห้ามเหมือนลิสต์ B"""


def run_claude(prompt: str) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    text = "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return json.loads(text)


def render_email(report: dict, accepted: list, q_count: int) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cluster_block = "".join(
        f"""
<div style="background:#fff;border:1px solid #e0ebe3;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
  <div style="font-weight:700;color:#2D4A3E;font-size:14px;">[{c.get("service","?")}] {c.get("topic","")} <span style="color:#94a3b8;font-weight:400;font-size:12px;">≈ {c.get("count_estimate","?")} คำถาม</span></div>
  <div style="font-size:12px;color:#555;margin-top:4px;">{" / ".join((c.get("examples") or [])[:2])}</div>
</div>
""".strip()
        for c in (report.get("clusters") or [])
    )
    brief_cards = "".join(
        f"""
<div style="background:#fff;border:1px solid #e0ebe3;border-radius:8px;padding:12px;margin-bottom:10px;">
  <div style="font-size:11px;color:#94a3b8;">{b.get("scheduled_date","")} · {b["service"]}</div>
  <div style="font-weight:700;font-size:15px;color:#2D4A3E;margin-top:2px;">{b["title"]}</div>
  <div style="font-size:12px;color:#666;margin-top:4px;">focus: <code>{b.get("focus_kw","")}</code> · slug: <code>{b.get("slug","")}</code></div>
  <div style="font-size:13px;color:#444;margin-top:6px;">{b.get("seed","")}</div>
</div>
""".strip()
        for b in accepted
    )
    gap_block = "<ul>" + "".join(f"<li>{g}</li>" for g in (report.get("gap_signals") or [])) + "</ul>"

    return f"""
<div style="font-family:sans-serif;max-width:680px;margin:0 auto;background:#f8faf8;padding:24px;border-radius:12px;">
  <h2 style="color:#2D4A3E;margin-top:0;">🔍 FAQ Mining — {today}</h2>
  <p style="color:#666;font-size:13px;">
    คำถามจาก {WINDOW_DAYS} วันล่าสุด: <b>{q_count}</b> · เพิ่มเข้า content plan: <b>{len(accepted)}</b> บทความ
  </p>
  <p style="color:#444;font-size:14px;">{report.get("summary","")}</p>
  <h3 style="color:#2D4A3E;margin-bottom:8px;">📊 Question clusters</h3>
  {cluster_block}
  <h3 style="color:#2D4A3E;margin-top:16px;margin-bottom:8px;">📝 Briefs ที่เพิ่มเข้า content_plan</h3>
  {brief_cards or "<i style='color:#94a3b8'>ไม่มี brief ใหม่ (อาจ slug ซ้ำหมด)</i>"}
  <h3 style="color:#2D4A3E;margin-top:16px;margin-bottom:8px;">⚠️ Gap signals</h3>
  {gap_block}
</div>
""".strip()


def send_email(report: dict, accepted: list, q_count: int) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    html = render_email(report, accepted, q_count)
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
    print(f"  recent posts (exclusion): {len(recent)}")

    existing_slugs = fetch_existing_slugs()
    print(f"  existing slugs (exclusion): {len(existing_slugs)}")

    try:
        report = run_claude(build_prompt(questions, recent, existing_slugs))
    except Exception as e:  # noqa: BLE001
        print(f"Claude returned non-JSON or failed: {e}", file=sys.stderr)
        return 1

    briefs = report.get("briefs") or []
    print(f"  briefs proposed: {len(briefs)}")
    accepted = queue_briefs(briefs, existing_slugs)
    print(f"  briefs inserted into content_plan: {len(accepted)}")

    print("\n" + "=" * 60)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("=" * 60 + "\n")

    send_email(report, accepted, len(questions))
    return 0


if __name__ == "__main__":
    sys.exit(main())
