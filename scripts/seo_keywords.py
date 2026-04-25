# -*- coding: utf-8 -*-
"""
seo_keywords.py — Weekly SEO keyword intelligence

ดึง long-tail keyword ที่คนค้นจริงบน Google จาก Google Suggest
(ฟรี ไม่ต้อง auth) ด้วย seed keyword หลัก 4 service
แล้วให้ Claude วิเคราะห์:
  - keyword ไหนมี intent เชิงซื้อ/ถามราคา/หาคลินิก (commercial intent)
  - keyword ไหนเรายังไม่มีบทความรองรับ
  - สรุปเป็น brief พร้อม title + meta description
  - แนะนำ content cluster สำหรับ SEO 1 เดือนข้างหน้า

ส่งอีเมลให้ทีมคอนเทนต์ใช้ร่วมกับ gen_content_plan.py

Run: ทุกวันจันทร์ 09:30 Bangkok (02:30 UTC)
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import anthropic

ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SECRET"]
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "team@roogondee.com")
MODEL = "claude-haiku-4-5-20251001"

# Seed keywords per service. Google Suggest ตอบ 10 autocomplete ต่อ seed.
SEED_KEYWORDS = {
    "std": [
        "ตรวจ hiv",
        "prep",
        "หนองใน อาการ",
        "ซิฟิลิส",
        "ตรวจโรคติดต่อทางเพศ",
        "ตรวจ std สมุทรสาคร",
        "pep ยา",
        "hpv วัคซีน ราคา",
    ],
    "glp1": [
        "ozempic",
        "ยาลดน้ำหนัก",
        "wegovy",
        "saxenda",
        "ลดน้ำหนัก glp",
        "ozempic ราคา",
        "ฉีด glp-1",
        "ผลข้างเคียง ozempic",
    ],
    "ckd": [
        "โรคไต",
        "egfr",
        "ckd อาการ",
        "อาหารคนเป็นโรคไต",
        "ค่า creatinine",
        "โรคไตเรื้อรัง",
        "ฟอสฟอรัสสูง",
        "ฟอกไต ราคา",
    ],
    "foreign": [
        "ตรวจสุขภาพแรงงานต่างด้าว",
        "ใบรับรองแพทย์ ตม",
        "ตรวจโรคพม่า",
        "ต่อวีซ่าแรงงาน",
        "ตรวจสุขภาพแรงงานกัมพูชา",
        "ตรวจ mou แรงงาน",
    ],
}


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


def google_suggest(seed: str) -> list:
    """Hit the public autocomplete endpoint. Thai locale."""
    url = (
        "https://suggestqueries.google.com/complete/search?"
        + urllib.parse.urlencode({"client": "firefox", "hl": "th", "q": seed})
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="ignore"))
        # Response shape: ["seed", ["sugg1","sugg2",…], [], {…}]
        if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
            return [s for s in data[1] if isinstance(s, str)]
    except Exception as e:  # noqa: BLE001
        print(f"  suggest failed for '{seed}': {e}", file=sys.stderr)
    return []


def gather_keywords() -> dict:
    out = {}
    for service, seeds in SEED_KEYWORDS.items():
        merged = []
        for seed in seeds:
            suggestions = google_suggest(seed)
            merged.append({"seed": seed, "suggestions": suggestions})
            time.sleep(0.4)  # be gentle
        out[service] = merged
    return out


def fetch_published_titles() -> list:
    return supa_get(
        "posts",
        {
            "select": "title,focus_kw,service",
            "status": "eq.published",
            "order": "published_at.desc",
            "limit": "120",
        },
    )


def build_prompt(kw_by_service: dict, published: list) -> str:
    kw_blocks = []
    for service, groups in kw_by_service.items():
        lines = [f"### {service}"]
        for g in groups:
            lines.append(f"- seed: {g['seed']}")
            for s in g["suggestions"]:
                lines.append(f"    · {s}")
        kw_blocks.append("\n".join(lines))

    published_block = "\n".join(
        f"- [{p.get('service','?')}] {p.get('title','')}"
        f"{'  (focus: ' + p['focus_kw'] + ')' if p.get('focus_kw') else ''}"
        for p in published[:80]
    )

    return f"""คุณเป็น SEO specialist ให้คลินิกสุขภาพ รู้ก่อนดี(รู้งี้) จ.สมุทรสาคร

ข้อมูลที่ได้:
A) Long-tail keywords จาก Google Suggest (autocomplete ที่คนไทยค้นจริง):
{chr(10).join(kw_blocks)}

B) บทความที่เราเผยแพร่แล้ว (เพื่อไม่แนะนำซ้ำ):
{published_block}

ให้ output เป็นภาษาไทย:

## 🎯 High-intent keywords (commercial / transactional)
list top 8-12 keyword ที่มี purchase intent สูงสุด (ถามราคา, ถามที่ไหน, ถามนัด, เปรียบเทียบ) ที่เรายังไม่มีบทความรองรับ

## 📝 Content brief (8 บทความถัดไป)
สำหรับแต่ละบทความให้:
- service
- title (ดึงดูด ≤ 60 ตัวอักษร)
- focus_kw (1 keyword หลักจากลิสต์ A)
- slug (อังกฤษ-kebab-case)
- meta_desc (120-155 ตัวอักษร)
- search intent (informational / transactional / navigational)

## 🔗 Content cluster strategy
เสนอ 2-3 topic cluster ที่ควรสร้าง (pillar + supporting articles) พร้อมเหตุผล

## ⚠️ Keyword-gap alerts
ชี้ 2-3 keyword ที่แข่งขันต่ำแต่ volume น่าจะสูง (อนุมานจาก suggestion ที่ซ้ำหลาย seed) และคลินิกใหญ่อื่นๆ น่าจะยังไม่จับ

ตอบกระชับ รวมไม่เกิน 700 คำ"""


def run_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=1800,
        messages=[{"role": "user", "content": prompt}],
    )
    return "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()


def send_email(summary: str, kw_count: int) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    html = f"""
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#f8faf8;padding:24px;border-radius:12px;">
  <h2 style="color:#2D4A3E;margin-top:0;">🎯 SEO Keyword Intelligence — {today}</h2>
  <p style="color:#666;font-size:13px;">keyword ที่ดึงจาก Google Suggest: <b>{kw_count}</b></p>
  <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:sans-serif;font-size:14px;line-height:1.6;color:#222;background:#fff;padding:16px;border-radius:8px;border:1px solid #e0ebe3;">
{summary}
  </pre>
</div>
""".strip()
    payload = json.dumps(
        {
            "from": "รู้ก่อนดี(รู้งี้) <onboarding@resend.dev>",
            "to": [NOTIFY_EMAIL],
            "subject": f"🎯 SEO Keywords — {today} ({kw_count} keywords)",
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
    print("Gathering Google Suggest keywords …")
    kw_by_service = gather_keywords()
    total = sum(len(g["suggestions"]) for groups in kw_by_service.values() for g in groups)
    print(f"  total suggestions gathered: {total}")

    if total < 20:
        print("Too few suggestions — possible network issue. Skipping.")
        return 0

    published = fetch_published_titles()
    print(f"  published posts (exclusion): {len(published)}")

    summary = run_claude(build_prompt(kw_by_service, published))
    print("\n" + "=" * 60)
    print(summary)
    print("=" * 60 + "\n")

    send_email(summary, total)
    return 0


if __name__ == "__main__":
    sys.exit(main())
