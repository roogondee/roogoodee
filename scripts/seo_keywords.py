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
from datetime import datetime, timedelta, timezone

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
    # mens — Pillar A focus (วัยทอง พลังงาน lifestyle).
    # หลีกเลี่ยง keyword Pillar B (ED) เพื่อลด ad-policy risk
    "mens": [
        "วัยทองชาย",
        "อาการวัยทองผู้ชาย",
        "testosterone ต่ำ",
        "อ่อนเพลีย ผู้ชาย 40",
        "ตรวจฮอร์โมนชาย",
        "ฮอร์โมนเพศชาย",
        "andropause อาการ",
        "ตรวจสุขภาพชาย 40",
        "PSA ต่อมลูกหมาก",
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


def fetch_existing_slugs() -> set:
    """Slugs already in content_plan or posts — don't re-queue these."""
    cp = supa_get("content_plan", {"select": "slug", "status": "neq.error"})
    posts = supa_get("posts", {"select": "slug"})
    out: set = set()
    for r in cp + posts:
        s = r.get("slug")
        if s:
            out.add(s)
    return out


def next_scheduled_date():
    """Find the latest scheduled_date in content_plan and start the day after.
    If table is empty, start tomorrow."""
    rows = supa_get(
        "content_plan",
        {"select": "scheduled_date", "order": "scheduled_date.desc", "limit": "1"},
    )
    if rows and rows[0].get("scheduled_date"):
        latest = datetime.fromisoformat(rows[0]["scheduled_date"]).date()
        return latest + timedelta(days=1)
    return (datetime.now(timezone.utc) + timedelta(days=1)).date()


def build_prompt(kw_by_service: dict, published: list, existing_slugs: set) -> str:
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

    slug_hint = ", ".join(sorted(existing_slugs)[:30]) if existing_slugs else "(ยังไม่มี)"

    return f"""คุณเป็น SEO specialist ให้คลินิกสุขภาพ รู้ก่อนดี(รู้งี้) จ.สมุทรสาคร

ข้อมูล:
A) Long-tail keywords จาก Google Suggest (autocomplete ที่คนไทยค้นจริง):
{chr(10).join(kw_blocks)}

B) บทความที่เผยแพร่แล้ว (ห้ามเสนอซ้ำเรื่องเดียวกัน):
{published_block}

C) Slug ที่มีอยู่แล้วใน pipeline (ห้ามใช้ซ้ำ):
{slug_hint}

งาน: เลือก 8 keyword ที่มี commercial / transactional intent สูงสุด ที่เรายัง
ไม่มีบทความรองรับ แล้วสร้าง content brief 1 ชิ้นต่อ 1 keyword

ตอบเป็น JSON อย่างเดียว ห้ามมี markdown / text อื่น โครงสร้าง:

{{
  "summary": "1-2 ประโยคสรุปภาพรวม keyword landscape สัปดาห์นี้",
  "briefs": [
    {{
      "service": "std" | "glp1" | "ckd" | "foreign" | "mens",
      "title": "หัวเรื่อง ≤ 60 ตัวอักษร",
      "focus_kw": "keyword หลัก 1 คำ ตรงจากลิสต์ A",
      "slug": "english-kebab-case-slug-unique",
      "meta_desc": "120-155 ตัวอักษร",
      "seed": "1-2 ประโยคบอก angle/มุมที่อยากให้บทความนี้เน้น (ใช้เป็น input ให้ writer ต่อ)",
      "intent": "informational" | "transactional" | "navigational",
      "rationale": "เหตุผลสั้นๆ ว่าทำไมเลือก keyword นี้"
    }}
  ],
  "cluster_ideas": [
    "1-2 ประโยคต่อ cluster, อย่างน้อย 2 cluster"
  ],
  "gap_alerts": [
    "1-2 ประโยคต่อ alert"
  ]
}}

กฎสำคัญ:
- slug ต้องไม่ซ้ำกับลิสต์ C และไม่ซ้ำกันเองในชุดนี้
- title ห้ามเหมือนหรือใกล้เคียงบทความในลิสต์ B
- focus_kw ต้องเป็น keyword จริงจากลิสต์ A เท่านั้น"""


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


def queue_briefs(briefs: list, existing_slugs: set) -> list:
    """Insert valid briefs into content_plan with status='ready', staggered dates.
    Returns the list of accepted briefs (with scheduled_date attached)."""
    accepted = []
    used_slugs = set(existing_slugs)
    cursor = next_scheduled_date()
    for b in briefs:
        slug = (b.get("slug") or "").strip().lower()
        if not slug or slug in used_slugs:
            continue
        if b.get("service") not in ("std", "glp1", "ckd", "foreign", "mens"):
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


def render_email(report: dict, accepted: list, kw_count: int) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    brief_cards = "".join(
        f"""
<div style="background:#fff;border:1px solid #e0ebe3;border-radius:8px;padding:12px;margin-bottom:10px;">
  <div style="font-size:11px;color:#94a3b8;">{b.get("scheduled_date","")} · {b["service"]} · {b.get("intent","")}</div>
  <div style="font-weight:700;font-size:15px;color:#2D4A3E;margin-top:2px;">{b["title"]}</div>
  <div style="font-size:12px;color:#666;margin-top:4px;">focus: <code>{b.get("focus_kw","")}</code> · slug: <code>{b.get("slug","")}</code></div>
  <div style="font-size:13px;color:#444;margin-top:6px;">{b.get("seed","")}</div>
</div>
""".strip()
        for b in accepted
    )
    cluster_block = "<ul>" + "".join(f"<li>{c}</li>" for c in (report.get("cluster_ideas") or [])) + "</ul>"
    gap_block = "<ul>" + "".join(f"<li>{g}</li>" for g in (report.get("gap_alerts") or [])) + "</ul>"

    return f"""
<div style="font-family:sans-serif;max-width:680px;margin:0 auto;background:#f8faf8;padding:24px;border-radius:12px;">
  <h2 style="color:#2D4A3E;margin-top:0;">🎯 SEO Keyword Intelligence — {today}</h2>
  <p style="color:#666;font-size:13px;">
    Google Suggest: <b>{kw_count}</b> keywords · เพิ่มเข้า content plan: <b>{len(accepted)}</b> บทความ
  </p>
  <p style="color:#444;font-size:14px;">{report.get("summary","")}</p>
  <h3 style="color:#2D4A3E;margin-bottom:8px;">📝 Briefs ที่เพิ่มเข้า content_plan</h3>
  {brief_cards or "<i style='color:#94a3b8'>ไม่มี brief ใหม่ (อาจ slug ซ้ำหมด)</i>"}
  <h3 style="color:#2D4A3E;margin-top:16px;margin-bottom:8px;">🔗 Cluster strategy</h3>
  {cluster_block}
  <h3 style="color:#2D4A3E;margin-top:16px;margin-bottom:8px;">⚠️ Gap alerts</h3>
  {gap_block}
</div>
""".strip()


def send_email(report: dict, accepted: list, kw_count: int) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    html = render_email(report, accepted, kw_count)
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

    existing_slugs = fetch_existing_slugs()
    print(f"  existing slugs (exclusion): {len(existing_slugs)}")

    try:
        report = run_claude(build_prompt(kw_by_service, published, existing_slugs))
    except Exception as e:  # noqa: BLE001
        print(f"Claude returned non-JSON or failed: {e}", file=sys.stderr)
        return 1

    briefs = report.get("briefs") or []
    print(f"  briefs proposed by Claude: {len(briefs)}")
    accepted = queue_briefs(briefs, existing_slugs)
    print(f"  briefs accepted + inserted into content_plan: {len(accepted)}")

    print("\n" + "=" * 60)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("=" * 60 + "\n")

    send_email(report, accepted, total)
    return 0


if __name__ == "__main__":
    sys.exit(main())
