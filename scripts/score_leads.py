# -*- coding: utf-8 -*-
"""
score_leads.py — Hourly AI lead scoring

หา lead ที่ยังไม่เคยถูก score (ai_score IS NULL) อายุไม่เกิน 7 วัน
แล้วให้ Claude อ่านบริบททั้งหมด (note, service, source, lead_tier ที่มี
อยู่จาก quiz, ประวัติแชทใน chat_sessions ที่ link มา) แล้วให้คะแนน 1-100
+ เหตุผล + recommended_action

ผลลัพธ์อัปเดตกลับเข้า leads.ai_score / ai_score_reason / ai_score_action /
ai_scored_at เพื่อให้ /admin หน้า leads แสดง badge และเรียงตามคะแนนได้

ทำงานต่อเนื่องไม่ block ถ้า lead เดียวพัง (ข้ามไป lead ถัดไป)
แต่ละ run cap MAX_LEADS เพื่อคุม cost + runtime

Run: GitHub Actions ทุก ๆ ชั่วโมง
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
MODEL = "claude-haiku-4-5-20251001"

MAX_AGE_DAYS = 7      # ไม่ score lead เก่ากว่านี้ (น่าจะปิดดีลไปแล้ว)
MAX_LEADS = 30        # cap ต่อรอบ — กัน prompt cost/runtime


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
def fetch_unscored_leads() -> list:
    cutoff = iso_n_days_ago(MAX_AGE_DAYS)
    return supa_get(
        "leads",
        {
            "select": "id,first_name,phone,service,source,note,status,lead_tier,age,gender,created_at",
            "ai_score": "is.null",
            "created_at": f"gte.{cutoff}",
            "order": "created_at.desc",
            "limit": str(MAX_LEADS),
        },
    )


def fetch_chat_session_for_lead(lead_id: str) -> dict | None:
    rows = supa_get(
        "chat_sessions",
        {
            "select": "messages,service_hint,turn_count",
            "lead_id": f"eq.{lead_id}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def extract_chat_text(messages) -> str:
    """User-typed text only — skip tool_result blocks."""
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
    return " | ".join(t for t in out if t).strip()[:1200]


# ─── CLAUDE SCORING ────────────────────────────────────────────────────────
CLIENT = anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def score_lead(lead: dict, chat_text: str) -> dict | None:
    service = lead.get("service") or "general"
    prompt = f"""คุณเป็น sales analyst ของคลินิก รู้ก่อนดี(รู้งี้) จ.สมุทรสาคร

หน้าที่: ให้คะแนน lead ที่เพิ่งเข้ามา 1-100 เพื่อให้ทีม sales จัดลำดับโทร
(100 = พร้อมจ่ายเงินวันนี้, 1 = แค่อยากรู้ทั่วไป)

ข้อมูล lead:
- ชื่อ: {lead.get("first_name","")}
- เบอร์: {lead.get("phone","")}
- บริการที่สนใจ: {SERVICE_LABELS.get(service, service)}
- ช่องทางที่มา (source): {lead.get("source","")}
- สถานะปัจจุบัน: {lead.get("status","new")}
- Note: {(lead.get("note") or "")[:500]}
- Quiz tier (ถ้ามี): {lead.get("lead_tier") or "—"}
- อายุ/เพศ (ถ้ามี): {lead.get("age") or "—"} / {lead.get("gender") or "—"}

ประวัติแชทในเว็บ (เฉพาะข้อความลูกค้า):
{chat_text or "(ไม่มี chat session)"}

หลักการให้คะแนน:
- 80-100 (HOT): ระบุปัญหาเฉพาะ, ถามราคา, ขอนัด, มี urgency เช่น PEP/<72h, ระบุ symptom
- 60-79 (WARM): สนใจชัด แต่ยังศึกษาข้อมูล / เปรียบเทียบ
- 40-59 (LUKEWARM): สนใจทั่วไป ไม่มี trigger ชัด
- 20-39 (COLD): มาจาก campaign / curious / ไม่ระบุปัญหา
- 1-19 (LOW): noise / mistype / ไม่เกี่ยวข้อง

ปัจจัยเพิ่ม urgency:
- source='line-broadcast' จาก STD/PEP topic = +10
- มี chat history > 3 turns + ขอข้อมูลเฉพาะ = +15
- quiz tier = 'urgent' หรือ 'hot' = +20
- lead จากหน้า /quiz/std ที่เลือก '<72h' = +25

ตอบเป็น JSON อย่างเดียว ห้ามมี markdown / text อื่น:
{{
  "score": 1-100,
  "reason": "เหตุผลสั้นๆ ภาษาไทย ≤ 120 ตัวอักษร",
  "action": "คำแนะนำ action 1 บรรทัดให้ทีม sales (เช่น 'โทรเลยภายใน 15 นาที, เน้นถามอาการ', 'รอ 1 ชม. ค่อยทัก LINE หา')"
}}"""

    try:
        resp = CLIENT.messages.create(
            model=MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        data = json.loads(text)
        score = int(data.get("score") or 0)
        score = max(1, min(100, score))
        return {
            "score": score,
            "reason": (data.get("reason") or "").strip()[:200],
            "action": (data.get("action") or "").strip()[:200],
        }
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠️  score failed for lead {lead.get('id')}: {e}", file=sys.stderr)
        return None


def update_lead(lead_id: str, scored: dict) -> None:
    supa_patch(
        "leads",
        {"id": f"eq.{lead_id}"},
        {
            "ai_score": scored["score"],
            "ai_score_reason": scored["reason"],
            "ai_score_action": scored["action"],
            "ai_scored_at": datetime.now(timezone.utc).isoformat(),
        },
    )


# ─── MAIN ──────────────────────────────────────────────────────────────────
def main() -> int:
    print(f"Fetching unscored leads ≤ {MAX_AGE_DAYS} days old, cap {MAX_LEADS} …")
    leads = fetch_unscored_leads()
    print(f"  candidates: {len(leads)}")
    if not leads:
        print("Nothing to score.")
        return 0

    scored = 0
    skipped = 0
    for lead in leads:
        chat = fetch_chat_session_for_lead(lead["id"])
        chat_text = extract_chat_text(chat.get("messages") if chat else None)

        result = score_lead(lead, chat_text)
        if not result:
            skipped += 1
            continue

        update_lead(lead["id"], result)
        scored += 1
        print(
            f"  {lead.get('first_name','')[:15]:15s} {lead.get('service'):8s} "
            f"score={result['score']:3d}  {result['reason'][:60]}"
        )

    print(f"\nDone — scored {scored}, skipped {skipped}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
