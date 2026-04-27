# -*- coding: utf-8 -*-
"""
line_push_followup.py — Daily 1-on-1 LINE push follow-up

ดึง lead ที่มี line_id (จาก LIFF), ยังเปิดอยู่ (status new|contacted),
และมี cooldown ห่างจาก push ก่อนหน้าอย่างน้อย MIN_GAP_DAYS วัน
แล้วให้ Claude เขียนข้อความ personalized 1-2 ประโยค ภาษาไทย
ส่งผ่าน LINE Messaging API push endpoint หาเจ้าของเลย

ต่างจาก broadcast (ส่งให้ทุก follower) — ตัวนี้ส่งเฉพาะลูกค้าที่ตั้ง
สถานะไว้แล้ว ใช้ quota ต่อ lead ไม่ใช่ต่อ follower

Cap MAX_PER_RUN ต่อรอบเพื่อคุม LINE quota + cost
Cap MAX_PUSHES_PER_LEAD ต่อ lead ตลอดอายุ — ห้ามส่งเกิน 2 ครั้ง

Run: GitHub Actions ทุกวัน 10:00 Bangkok (03:00 UTC)
no-op ถ้า LINE_CHANNEL_ACCESS_TOKEN ไม่ตั้ง
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
LINE_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
SITE_BASE = os.environ.get("SITE_BASE_URL", "https://roogondee.com").rstrip("/")
LIFF_ID = os.environ.get("LIFF_ID", "").strip()
MODEL = "claude-haiku-4-5-20251001"

MIN_AGE_DAYS = 1            # อย่ารบกวน lead ที่เพิ่งเข้ามา (ทีมยังโทรอยู่)
MAX_AGE_DAYS = 30           # หลัง 30 วันถือว่าเย็นเกิน
MIN_GAP_DAYS = 3            # cooldown ระหว่าง push
MAX_PUSHES_PER_LEAD = 2     # cap lifetime — ส่งเกินนี้ถือ spam
MAX_PER_RUN = 20            # cap LINE quota + Claude cost ต่อรอบ

SERVICE_LABELS = {
    "std": "STD & PrEP HIV",
    "glp1": "GLP-1 ลดน้ำหนัก",
    "ckd": "CKD โรคไต",
    "foreign": "ตรวจสุขภาพแรงงาน",
    "general": "ปรึกษาทั่วไป",
}


# ─── SUPABASE ──────────────────────────────────────────────────────────────
def supa_get(path: str, params: dict) -> list:
    qs = urllib.parse.urlencode(params, safe=",.()*%")
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
    qs = urllib.parse.urlencode(params, safe=",.()*%")
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


def iso_n_days_ago(d: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=d)).isoformat()


# ─── DATA ──────────────────────────────────────────────────────────────────
def fetch_eligible_leads() -> list:
    """Filter in Python because PostgREST URL params can't easily express
    'pushed_at IS NULL OR pushed_at < cutoff'."""
    upper = iso_n_days_ago(MIN_AGE_DAYS)
    lower = iso_n_days_ago(MAX_AGE_DAYS)
    rows = supa_get(
        "leads",
        {
            "select": "id,first_name,phone,service,source,note,status,line_id,"
                      "line_pushed_at,line_push_count,ai_score,ai_score_action,"
                      "lead_tier,created_at",
            "line_id": "not.is.null",
            "status": "in.(new,contacted)",
            "created_at": f"gte.{lower}",
            "line_push_count": f"lt.{MAX_PUSHES_PER_LEAD}",
            "order": "ai_score.desc.nullslast,created_at.asc",
            "limit": "200",
        },
    )

    upper_dt = datetime.fromisoformat(upper.replace("Z", "+00:00"))
    cooldown_dt = datetime.now(timezone.utc) - timedelta(days=MIN_GAP_DAYS)

    out = []
    for r in rows:
        try:
            created = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
        except Exception:  # noqa: BLE001
            continue
        if created > upper_dt:
            continue  # too fresh
        if r.get("line_pushed_at"):
            try:
                last = datetime.fromisoformat(r["line_pushed_at"].replace("Z", "+00:00"))
                if last >= cooldown_dt:
                    continue  # still in cooldown
            except Exception:  # noqa: BLE001
                pass
        out.append(r)
        if len(out) >= MAX_PER_RUN:
            break
    return out


def fetch_chat_session_for_lead(lead_id: str) -> str:
    rows = supa_get(
        "chat_sessions",
        {"select": "messages", "lead_id": f"eq.{lead_id}", "limit": "1"},
    )
    if not rows:
        return ""
    messages = rows[0].get("messages")
    if not isinstance(messages, list):
        return ""
    out = []
    for m in messages:
        if not isinstance(m, dict) or m.get("role") != "user":
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


def write_message(lead: dict, chat_text: str) -> str | None:
    service = lead.get("service") or "general"
    push_n = (lead.get("line_push_count") or 0) + 1
    days = days_since(lead.get("created_at", ""))

    # Tone shifts with how many times we've already pinged this person and how
    # long they've been sitting in the queue — softer first, more concrete second.
    tone_hint = (
        "ครั้งแรก — เริ่มด้วย check-in อบอุ่น ถามว่ายังสนใจอยู่ไหม"
        if push_n == 1
        else "ครั้งที่สอง — เพิ่มประโยคเสนอข้อมูลเฉพาะ (เช่น แพ็กเกจ/วิธีนัด) ที่ดูช่วยตัดสินใจได้"
    )

    prompt = f"""คุณเป็นผู้ช่วย LINE OA ของคลินิก รู้ก่อนดี(รู้งี้)
หน้าที่: เขียนข้อความ 1-on-1 personalized ส่งกลับหา lead ที่ทิ้งไว้
ให้รู้สึกเหมือนคนจริงที่จำเขาได้ ไม่ใช่ blast marketing

ข้อมูลลูกค้า:
- ชื่อ: {lead.get("first_name","")}
- บริการที่สนใจ: {SERVICE_LABELS.get(service, service)}
- จำนวนวันหลังลงทะเบียน: {days}
- AI score: {lead.get("ai_score") or "—"} ({(lead.get("ai_score_action") or "")[:80]})
- Note: {(lead.get("note") or "")[:300]}
- Quiz tier: {lead.get("lead_tier") or "—"}

ประวัติแชทในเว็บ (ถ้ามี):
{chat_text or "(ไม่มี)"}

แนวทาง: {tone_hint}

กฎข้อความ:
1. ภาษาไทยเป็นกันเอง ใช้ "ค่ะ" หรือ "ครับ" — เลือกตามชื่อให้ดูธรรมชาติ ถ้าไม่แน่ใจใช้ "ค่ะ"
2. ทักด้วยชื่อ ({lead.get("first_name","")}) ในประโยคแรก
3. **40-80 คำ** ห้ามยาวกว่านี้ (LINE message ต้องสั้น)
4. ห้าม emoji เกิน 2 ตัว ห้าม hashtag ห้าม URL ใน text (ใส่ URL ในปุ่ม Flex แยก)
5. ห้ามสัญญาเรื่องการรักษา ห้ามระบุราคา ห้าม hard-sell
6. ปิดด้วย CTA นุ่มๆ (เช่น "พิมพ์มาคุยได้ไม่ต้องเกรงใจค่ะ" หรือ "อยากให้แพทย์โทรหามั้ยคะ")

ตอบกลับเป็นข้อความอย่างเดียว — ไม่ต้องมี JSON, markdown, หรือ quote"""

    try:
        resp = CLIENT.messages.create(
            model=MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()
        # Sanity cap on length — LINE rejects > 5000 chars but our copy should
        # never approach that; 600 is a tighter UX guard.
        return text[:600] or None
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠️  Claude failed for lead {lead.get('id')}: {e}", file=sys.stderr)
        return None


# ─── LINE PUSH ─────────────────────────────────────────────────────────────
def line_push(line_id: str, message: str) -> str | None:
    """Send to a single user via Messaging API push. Returns request id on
    success, None on failure (caller logs + skips marking)."""
    # Build a Flex message with the text + a "ทักทีมเลย" follow-up button
    # that opens the LIFF (or fallback /lead/line) so the user can confirm
    # interest with one tap. If LIFF_ID is missing we still send plain text.
    if LIFF_ID:
        followup_url = f"https://liff.line.me/{LIFF_ID}?utm_source=line&utm_medium=push"
    else:
        followup_url = f"{SITE_BASE}/lead/line?utm_source=line&utm_medium=push"

    flex = {
        "type": "flex",
        "altText": message[:200],
        "contents": {
            "type": "bubble",
            "size": "kilo",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "text",
                        "text": "🌿 รู้ก่อนดี(รู้งี้)",
                        "size": "xs",
                        "color": "#5B8C7B",
                        "weight": "bold",
                    },
                    {
                        "type": "text",
                        "text": message,
                        "size": "sm",
                        "color": "#222222",
                        "wrap": True,
                        "margin": "md",
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#2D4A3E",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "ทักทีมเลย",
                            "uri": followup_url,
                        },
                    }
                ],
            },
        },
    }

    payload = json.dumps({"to": line_id, "messages": [flex]}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.line.me/v2/bot/message/push",
        data=payload,
        headers={
            "Authorization": f"Bearer {LINE_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.headers.get("X-Line-Request-Id", "ok")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        # 400 invalid uid — likely the user blocked the OA or never linked
        # properly. Don't crash the run, just skip.
        print(f"  ⚠️  push to {line_id[:12]}… failed ({e.code}): {body[:200]}", file=sys.stderr)
        return None


def mark_pushed(lead_id: str, current_count: int) -> None:
    supa_patch(
        "leads",
        {"id": f"eq.{lead_id}"},
        {
            "line_pushed_at": datetime.now(timezone.utc).isoformat(),
            "line_push_count": current_count + 1,
        },
    )


# ─── MAIN ──────────────────────────────────────────────────────────────────
def main() -> int:
    if not LINE_TOKEN:
        print("LINE_CHANNEL_ACCESS_TOKEN not set — skipping (not configured).")
        return 0

    print(f"Fetching eligible leads — age {MIN_AGE_DAYS}-{MAX_AGE_DAYS} days, "
          f"cooldown {MIN_GAP_DAYS} days, max {MAX_PUSHES_PER_LEAD} pushes/lead, "
          f"cap {MAX_PER_RUN}/run …")
    leads = fetch_eligible_leads()
    print(f"  candidates: {len(leads)}")
    if not leads:
        print("Nothing to push.")
        return 0

    pushed = 0
    skipped = 0
    for lead in leads:
        chat_text = fetch_chat_session_for_lead(lead["id"])
        message = write_message(lead, chat_text)
        if not message:
            skipped += 1
            continue

        request_id = line_push(lead["line_id"], message)
        if not request_id:
            skipped += 1
            continue

        mark_pushed(lead["id"], lead.get("line_push_count") or 0)
        pushed += 1
        print(
            f"  ✅ {lead.get('first_name','')[:15]:15s} {lead.get('service'):8s} "
            f"push#{(lead.get('line_push_count') or 0) + 1} — {message[:80]}"
        )

    print(f"\nDone — pushed {pushed}, skipped {skipped}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
