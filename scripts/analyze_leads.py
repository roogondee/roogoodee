# -*- coding: utf-8 -*-
"""
analyze_leads.py — Daily AI summary of leads + chat sessions

สรุปและจัดลำดับ lead ของวันก่อน (24h) ด้วย Claude:
- ดึง leads + chat_sessions จาก Supabase ช่วง 24h ที่ผ่านมา
- ให้ Claude จัดอันดับ lead ตาม intent (hot / warm / cold) และแนะนำ action
- ส่งสรุปเข้าอีเมลทีมผ่าน Resend API
- พิมพ์สรุปลง stdout เพื่อให้ GitHub Actions log เก็บไว้

Run: GitHub Actions ทุกวัน 08:00 Bangkok (01:00 UTC)
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import anthropic

# ─── CONFIG ────────────────────────────────────────────────────────────────
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SECRET"]
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "team@roogondee.com")
MODEL = "claude-haiku-4-5-20251001"

SERVICE_LABELS = {
    "std": "STD & PrEP HIV",
    "glp1": "GLP-1 ลดน้ำหนัก",
    "ckd": "CKD โรคไต",
    "foreign": "แรงงานต่างด้าว",
    "general": "ทั่วไป",
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


# ─── DATA COLLECTION ───────────────────────────────────────────────────────
def iso_n_hours_ago(hours: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()


def fetch_recent_leads() -> list:
    cutoff = iso_n_hours_ago(24)
    return supa_get(
        "leads",
        {
            "select": "id,first_name,phone,service,source,note,status,created_at",
            "created_at": f"gte.{cutoff}",
            "order": "created_at.desc",
        },
    )


def fetch_recent_sessions() -> list:
    cutoff = iso_n_hours_ago(24)
    return supa_get(
        "chat_sessions",
        {
            "select": "id,service_hint,turn_count,lead_id,messages,updated_at",
            "updated_at": f"gte.{cutoff}",
            "order": "updated_at.desc",
            "limit": "100",
        },
    )


# ─── SUMMARIZATION ─────────────────────────────────────────────────────────
def extract_user_text(messages) -> str:
    """Pull only user-visible text (skip tool_result blocks) and truncate."""
    if not isinstance(messages, list):
        return ""
    out = []
    for m in messages:
        role = m.get("role")
        content = m.get("content")
        if role != "user":
            continue
        if isinstance(content, str):
            out.append(content)
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    out.append(block.get("text", ""))
    return " | ".join(t for t in out if t).strip()[:800]


def build_analysis_prompt(leads: list, sessions: list) -> str:
    lead_lines = []
    for idx, lead in enumerate(leads, 1):
        lead_lines.append(
            f"{idx}. [{lead.get('service','?')}] {lead.get('first_name','')} "
            f"{lead.get('phone','')} (src={lead.get('source','?')}, "
            f"status={lead.get('status','?')}) — note: {(lead.get('note') or '')[:200]}"
        )
    leads_block = "\n".join(lead_lines) if lead_lines else "(no leads)"

    session_lines = []
    for idx, s in enumerate(sessions, 1):
        snippet = extract_user_text(s.get("messages"))
        if not snippet:
            continue
        has_lead = "✓ lead" if s.get("lead_id") else "— no lead"
        session_lines.append(
            f"{idx}. [{s.get('service_hint','general')}] turns={s.get('turn_count',0)} "
            f"{has_lead}: {snippet[:400]}"
        )
    sessions_block = "\n".join(session_lines) if session_lines else "(no sessions)"

    return f"""คุณเป็นผู้ช่วยฝ่ายขายของคลินิกสุขภาพ รู้ก่อนดี(รู้งี้)
วิเคราะห์ข้อมูล 24 ชั่วโมงที่ผ่านมาและสรุปเป็น briefing สำหรับทีมขาย (ภาษาไทย)

LEADS ({len(leads)} ราย):
{leads_block}

CHAT SESSIONS ({len(sessions)} session):
{sessions_block}

ให้ output ในรูปแบบนี้:

## สรุปภาพรวม
- 1-2 บรรทัด: จำนวน lead, service ที่ความสนใจสูง, trend ที่เห็น

## Lead ลำดับความสำคัญ
จัดอันดับ lead แต่ละรายเป็น 🔥 HOT / ☀️ WARM / ❄️ COLD พร้อมเหตุผลสั้นๆ
(HOT = พร้อมซื้อ/มีอาการชัดเจน, WARM = สนใจแต่ยังศึกษา, COLD = แค่ถามข้อมูล)
ใส่ชื่อ + เบอร์ + service + เหตุผล 1 บรรทัด

## Chat sessions ที่น่าสนใจ (ยังไม่เป็น lead)
sessions ที่มี intent สูงแต่ยังไม่ให้ข้อมูลติดต่อ — ระบุ session id + สาเหตุ

## ข้อเสนอแนะสำหรับทีม
bullet 2-3 ข้อ: topic ที่ควรเพิ่มบทความ, service ที่ควรโปรโมตเพิ่ม, คำถามที่ลูกค้าถามซ้ำๆ

ตอบให้กระชับ ไม่เกิน 500 คำ"""


def run_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    parts = []
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "\n".join(parts).strip()


# ─── EMAIL ─────────────────────────────────────────────────────────────────
def send_email(summary: str, lead_count: int, session_count: int) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Plain-text summary rendered as <pre> so Claude's Markdown survives without
    # pulling in an extra renderer dependency.
    html = f"""
<div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; background: #f8faf8; padding: 24px; border-radius: 12px;">
  <h2 style="color: #2D4A3E; margin-top: 0;">🌿 Daily Lead Brief — {today}</h2>
  <p style="color: #666; font-size: 13px;">
    Leads: <b>{lead_count}</b> &nbsp;•&nbsp; Chat sessions: <b>{session_count}</b>
  </p>
  <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #222; background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e0ebe3;">
{summary}
  </pre>
  <div style="margin-top: 20px; text-align: center;">
    <a href="https://roogondee.com/admin" style="background: #2D4A3E; color: white; padding: 10px 24px; border-radius: 20px; text-decoration: none; font-size: 14px;">
      ดู Admin Dashboard
    </a>
  </div>
</div>
""".strip()

    payload = json.dumps(
        {
            "from": "รู้ก่อนดี(รู้งี้) <onboarding@resend.dev>",
            "to": [NOTIFY_EMAIL],
            "subject": f"🌿 Daily Lead Brief — {today} ({lead_count} leads)",
            "html": html,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"Email sent: {resp.status}")
    except Exception as e:  # noqa: BLE001
        print(f"Email send failed: {e}", file=sys.stderr)


# ─── MAIN ──────────────────────────────────────────────────────────────────
def main() -> int:
    print("Fetching recent leads and chat sessions …")
    leads = fetch_recent_leads()
    sessions = fetch_recent_sessions()
    print(f"  leads: {len(leads)}  sessions: {len(sessions)}")

    if not leads and not sessions:
        print("Nothing to summarize today. Skipping email.")
        return 0

    prompt = build_analysis_prompt(leads, sessions)
    print("Running Claude analysis …")
    summary = run_claude(prompt)
    print("\n" + "=" * 60)
    print(summary)
    print("=" * 60 + "\n")

    send_email(summary, len(leads), len(sessions))
    return 0


if __name__ == "__main__":
    sys.exit(main())
