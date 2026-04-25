# -*- coding: utf-8 -*-
"""
nurture_leads.py — Daily lead re-engagement drafts for the sales team

Pulls leads that are still open (status new|contacted) and were first seen
between MIN_DAYS and MAX_DAYS ago, skips any already nurtured inside
COOLDOWN_DAYS, and asks Claude to write a personalized Thai follow-up
message for each. Output is ranked by urgency and emailed to the team
so they can copy-paste into a phone call / LINE / SMS.

Every draft is logged to lead_nurture_log so the same lead is not queued
again within the cooldown window.

Run: GitHub Actions daily 09:30 Bangkok (02:30 UTC)
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

MIN_DAYS = 2       # don't touch leads fresher than this (team is working them)
MAX_DAYS = 14      # after this they're too cold; archive elsewhere
COOLDOWN_DAYS = 5  # don't re-queue a lead we already drafted within this
MAX_LEADS = 10     # cap email length / Claude calls per run

SERVICE_LABELS = {
    "std": "STD & PrEP HIV",
    "glp1": "GLP-1 ลดน้ำหนัก",
    "ckd": "CKD โรคไต",
    "foreign": "แรงงานต่างด้าว",
    "general": "ทั่วไป",
}

CHANNEL_LABELS = {
    "phone_call": "📞 โทรหา",
    "line": "💬 LINE",
    "sms": "📱 SMS",
}

TRIGGER_LABELS = {
    "check_in": "ถามไถ่",
    "promo": "เสนอโปร",
    "education": "ให้ข้อมูลเพิ่ม",
    "book_now": "ชวนนัด",
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


def supa_post(path: str, rows: list) -> None:
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


def iso_n_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


# ─── DATA FETCH ────────────────────────────────────────────────────────────
def fetch_eligible_leads() -> list:
    """Leads created between MIN and MAX days ago, still open.
    urllib.urlencode can't emit duplicate `created_at` keys for a range,
    so we fetch by lower bound and apply the upper bound in Python."""
    lower = iso_n_days_ago(MAX_DAYS)
    upper_dt = datetime.now(timezone.utc) - timedelta(days=MIN_DAYS)
    rows = supa_get(
        "leads",
        {
            "select": "id,first_name,phone,service,source,note,status,created_at",
            "status": "in.(new,contacted)",
            "created_at": f"gte.{lower}",
            "order": "created_at.asc",
        },
    )
    out = []
    for r in rows:
        try:
            created = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
        except Exception:  # noqa: BLE001
            continue
        if created <= upper_dt:
            out.append(r)
    return out


def fetch_recent_nurture_log() -> set:
    """Lead IDs we've nurtured inside the cooldown window."""
    cutoff = iso_n_days_ago(COOLDOWN_DAYS)
    rows = supa_get(
        "lead_nurture_log",
        {"select": "lead_id", "created_at": f"gte.{cutoff}"},
    )
    return {r["lead_id"] for r in rows}


def fetch_chat_session(lead_id: str) -> dict | None:
    rows = supa_get(
        "chat_sessions",
        {
            "select": "messages,service_hint,turn_count",
            "lead_id": f"eq.{lead_id}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def extract_user_text(messages) -> str:
    if not isinstance(messages, list):
        return ""
    out = []
    for m in messages:
        if m.get("role") != "user":
            continue
        c = m.get("content")
        if isinstance(c, str):
            out.append(c)
        elif isinstance(c, list):
            for block in c:
                if isinstance(block, dict) and block.get("type") == "text":
                    out.append(block.get("text", ""))
    return " | ".join(t for t in out if t).strip()[:600]


# ─── CLAUDE ────────────────────────────────────────────────────────────────
CLIENT = anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def days_since(iso_ts: str) -> int:
    try:
        then = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        return max(0, (datetime.now(timezone.utc) - then).days)
    except Exception:  # noqa: BLE001
        return 0


def draft_for_lead(lead: dict, chat_snippet: str) -> dict | None:
    service = lead.get("service") or "general"
    prompt = f"""คุณเป็นผู้ช่วยการตลาดของคลินิก รู้ก่อนดี(รู้งี้) / W Medical Hospital จ.สมุทรสาคร
งานคุณคือร่างข้อความ follow-up ส่วนตัวให้ทีมขายโทร/LINE/SMS ลูกค้าที่ยังไม่ปิดดีล

ข้อมูลลูกค้า:
- ชื่อ: {lead.get("first_name", "")}
- เบอร์: {lead.get("phone", "")}
- บริการที่สนใจ: {SERVICE_LABELS.get(service, service)}
- ช่องทางที่มา: {lead.get("source", "")}
- สถานะปัจจุบัน: {lead.get("status", "new")}
- จำนวนวันหลังติดต่อครั้งแรก: {days_since(lead.get("created_at", ""))}
- Note จากทีม/แชท: {(lead.get("note") or "")[:400]}

ประวัติแชทในเว็บ (เฉพาะข้อความลูกค้า):
{chat_snippet or "(ไม่มี chat session)"}

สร้างร่างข้อความให้ทีม โดย:
1. อ้างอิงความสนใจเฉพาะของลูกค้า ไม่ใช่ข้อความทั่วๆ ไป
2. สั้น กระชับ 2-3 ประโยค (40-90 คำ)
3. มี CTA ชัดเจนแต่ไม่กดดัน
4. ใช้ภาษาไทย สุภาพ เป็นมิตร ไม่ตัดสิน (สำคัญมากสำหรับ STD)
5. ห้ามสัญญาเรื่องการรักษา ห้ามระบุราคาถ้าไม่ได้อยู่ใน note

ตอบเป็น JSON อย่างเดียว (ห้ามมี markdown / text อื่น):
{{
  "message": "ข้อความร่างภาษาไทย",
  "channel": "phone_call" หรือ "line" หรือ "sms",
  "trigger": "check_in" | "promo" | "education" | "book_now",
  "urgency": เลข 1-5 (5=เร่งด่วนสุด),
  "reason": "เหตุผลที่ให้คะแนน urgency นี้ สั้นๆ"
}}"""

    try:
        resp = CLIENT.messages.create(
            model=MODEL,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        text = ""
        for block in resp.content:
            if getattr(block, "type", None) == "text":
                text += block.text
        text = text.strip()
        # Strip accidental markdown fences
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        data = json.loads(text)
        # Minimal shape validation
        if not isinstance(data.get("message"), str):
            return None
        data["urgency"] = int(data.get("urgency") or 3)
        data["urgency"] = max(1, min(5, data["urgency"]))
        return data
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠️  draft failed for lead {lead.get('id')}: {e}", file=sys.stderr)
        return None


# ─── EMAIL ─────────────────────────────────────────────────────────────────
def render_email(drafts: list) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cards = []
    for d in drafts:
        lead = d["lead"]
        draft = d["draft"]
        urgency = draft["urgency"]
        urgency_color = {5: "#b91c1c", 4: "#d97706", 3: "#2563eb", 2: "#0891b2", 1: "#64748b"}.get(urgency, "#64748b")
        urgency_label = {5: "🔥 HOT", 4: "⚡ HIGH", 3: "☀️ MEDIUM", 2: "🌤 LOW", 1: "❄️ COLD"}.get(urgency, "—")
        channel = CHANNEL_LABELS.get(draft.get("channel", ""), draft.get("channel", ""))
        trigger = TRIGGER_LABELS.get(draft.get("trigger", ""), draft.get("trigger", ""))
        service = SERVICE_LABELS.get(lead.get("service", "general"), lead.get("service", "—"))
        phone = lead.get("phone", "")
        days = days_since(lead.get("created_at", ""))

        cards.append(
            f"""
<div style="background:#fff;border:1px solid #e0ebe3;border-radius:10px;padding:16px;margin-bottom:14px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
    <div>
      <div style="font-weight:700;font-size:15px;color:#2D4A3E;">
        {lead.get("first_name", "—")} ·
        <a href="tel:{phone}" style="color:#2D4A3E;">{phone}</a>
      </div>
      <div style="font-size:12px;color:#666;margin-top:2px;">
        {service} · ติดต่อครั้งแรก {days} วันก่อน · {channel} · {trigger}
      </div>
    </div>
    <span style="background:{urgency_color};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;white-space:nowrap;">
      {urgency_label}
    </span>
  </div>
  <div style="background:#f8faf8;border-left:3px solid #2D4A3E;padding:10px 12px;margin-top:10px;font-size:14px;line-height:1.55;color:#222;white-space:pre-wrap;">{draft["message"]}</div>
  <div style="font-size:11px;color:#94a3b8;margin-top:6px;">reason: {draft.get("reason", "—")}</div>
</div>
""".strip()
        )

    return f"""
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#f8faf8;padding:24px;border-radius:12px;">
  <h2 style="color:#2D4A3E;margin-top:0;">💌 Lead Nurture — {today}</h2>
  <p style="color:#666;font-size:13px;margin-top:0;">
    ร่างข้อความ follow-up สำหรับ <b>{len(drafts)}</b> lead ที่ยังไม่ปิด (อายุ {MIN_DAYS}–{MAX_DAYS} วัน)
    — เรียงตามความเร่งด่วน คัดลอกข้อความไปใช้ได้เลย
  </p>
  {"".join(cards)}
  <div style="margin-top:16px;text-align:center;">
    <a href="https://roogondee.com/admin" style="background:#2D4A3E;color:#fff;padding:10px 24px;border-radius:20px;text-decoration:none;font-size:14px;">
      ดู Admin Dashboard
    </a>
  </div>
</div>
""".strip()


def send_email(drafts: list) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    payload = json.dumps(
        {
            "from": "รู้ก่อนดี(รู้งี้) <onboarding@resend.dev>",
            "to": [NOTIFY_EMAIL],
            "subject": f"💌 Lead Nurture — {today} ({len(drafts)} leads)",
            "html": render_email(drafts),
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
    print(f"Fetching eligible leads ({MIN_DAYS}–{MAX_DAYS} days old, open status) …")
    leads = fetch_eligible_leads()
    print(f"  candidates: {len(leads)}")

    cooldown_ids = fetch_recent_nurture_log()
    print(f"  in cooldown: {len(cooldown_ids)}")

    queue = [l for l in leads if l["id"] not in cooldown_ids][:MAX_LEADS]
    print(f"  to draft: {len(queue)}")

    if not queue:
        print("Nothing to nurture today.")
        return 0

    drafts = []
    for lead in queue:
        chat = fetch_chat_session(lead["id"])
        chat_snippet = extract_user_text(chat.get("messages") if chat else None)
        print(f"  drafting for {lead.get('first_name')} ({lead.get('service')}) …")
        draft = draft_for_lead(lead, chat_snippet)
        if draft:
            drafts.append({"lead": lead, "draft": draft})

    if not drafts:
        print("No drafts produced.")
        return 0

    drafts.sort(key=lambda d: -d["draft"]["urgency"])

    # Log before email so re-running after email failure doesn't resend everything
    supa_post(
        "lead_nurture_log",
        [
            {
                "lead_id": d["lead"]["id"],
                "message": d["draft"]["message"],
                "channel": d["draft"].get("channel"),
                "trigger": d["draft"].get("trigger"),
                "urgency": d["draft"].get("urgency"),
                "reason": d["draft"].get("reason"),
            }
            for d in drafts
        ],
    )

    # Plain-text console dump for GH Actions log
    print("\n" + "=" * 60)
    for d in drafts:
        u = d["draft"]["urgency"]
        print(f"[{u}] {d['lead'].get('first_name')} · {d['lead'].get('phone')} · "
              f"{d['draft'].get('channel')} · {d['draft'].get('trigger')}")
        print(f"    {d['draft']['message']}")
    print("=" * 60 + "\n")

    send_email(drafts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
