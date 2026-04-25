# -*- coding: utf-8 -*-
"""
gen_content_plan.py — Auto-generate content plan for next 14 days
ใช้ Claude สร้าง title/slug/focus_kw/meta_desc/seed ใหม่
สลับ 4 services: std → ckd → glp1 → foreign → วนซ้ำ
Run: GitHub Actions ทุกวันอาทิตย์ 08:00 Bangkok (01:00 UTC)
"""

import os
import re
import json
import time
import urllib.request
import urllib.parse
from datetime import date, timedelta
import anthropic

# ─── CONFIG ────────────────────────────────────────────────────────────────────
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL  = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY  = os.environ["SUPABASE_SECRET"]

from notify import notify as _line_notify  # ใช้ alias เดิมให้โค้ดอื่นไม่ต้องเปลี่ยน

SERVICES_CYCLE = ["std", "ckd", "glp1", "foreign"]  # วนซ้ำ

SERVICE_CONTEXT = {
    "std": {
        "name": "ตรวจ STD & PrEP HIV",
        "target": "ผู้หญิงวัยทำงาน 18-35 ปี กลุ่มเสี่ยง",
        "topics": "ตรวจ STD, PrEP, วัคซีน HPV, โรคติดต่อทางเพศสัมพันธ์, ความปลอดภัยทางเพศ, Condom, HIV AIDS"
    },
    "ckd": {
        "name": "CKD Clinic โรคไตเรื้อรัง",
        "target": "ผู้ป่วยและผู้ดูแล อายุ 40-65 ปี",
        "topics": "โรคไตเรื้อรัง CKD, ไตวาย, ฟอกไต, ล้างไต, อาหารผู้ป่วยไต, เบาหวานกับไต, ความดันกับไต, eGFR, creatinine"
    },
    "glp1": {
        "name": "GLP-1 ลดน้ำหนัก & ฮอร์โมน",
        "target": "ผู้หญิง 25-45 ปี ต้องการลดน้ำหนัก",
        "topics": "GLP-1, Ozempic, Wegovy, Saxenda, semaglutide, ลดน้ำหนัก, ฮอร์โมน, เบาหวาน type 2, BMI, อ้วน"
    },
    "foreign": {
        "name": "ตรวจสุขภาพแรงงานต่างด้าว",
        "target": "HR นายจ้าง และแรงงานต่างด้าวในสมุทรสาคร",
        "topics": "ตรวจสุขภาพแรงงาน, ใบรับรองแพทย์, โรคต้องห้าม, MOU, work permit, ตรวจหมู่คณะ, สมุทรสาคร"
    }
}

# ─── CHECK EXISTING PLANS ──────────────────────────────────────────────────────

def get_existing_slugs() -> set:
    """ดึง slug ที่มีอยู่แล้วเพื่อไม่ให้ซ้ำ"""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/content_plan?select=slug&status=neq.error",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    slugs = {row.get('slug', '') for row in data}

    # Also check posts table
    req2 = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/posts?select=slug",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    with urllib.request.urlopen(req2) as resp:
        data2 = json.loads(resp.read().decode('utf-8'))
    slugs.update({row.get('slug', '') for row in data2})

    return slugs

def get_latest_scheduled_date() -> date:
    """หาวันสุดท้ายที่มี plan อยู่แล้ว"""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/content_plan?select=scheduled_date&order=scheduled_date.desc&limit=1",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    if data:
        return date.fromisoformat(data[0]['scheduled_date'])
    return date.today()

def get_service_count_by_date(start_date: date) -> dict:
    """นับจำนวน service แต่ละตัวที่มีอยู่แล้ว เพื่อ balance การสลับ"""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/content_plan?select=service&scheduled_date=gte.{start_date}",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    counts = {"std": 0, "ckd": 0, "glp1": 0, "foreign": 0}
    for row in data:
        svc = row.get('service', '')
        if svc in counts:
            counts[svc] += 1
    return counts


def get_top_topics(service: str, limit: int = 5) -> list[dict]:
    """ดึงโพสต์ที่ traffic ดีของ service นี้ (ผ่าน view post_performance_30d)
    เงียบถ้าไม่มี view (ก่อน migration จะรัน) — ใช้เป็น context เสริมให้ Claude
    """
    try:
        url = (
            f"{SUPABASE_URL}/rest/v1/post_performance_30d"
            f"?service=eq.{service}"
            f"&order=views_30d.desc&limit={limit}"
            f"&select=title,focus_kw,views_30d"
        )
        req = urllib.request.Request(
            url,
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return [r for r in data if (r.get("views_30d") or 0) > 0]
    except Exception as e:
        # view ยังไม่มี / network — ไม่ใช่ blocker
        print(f"  ℹ️ ข้าม top topics feedback: {e}")
        return []

# ─── CLAUDE GENERATION ─────────────────────────────────────────────────────────

def generate_plan_entry(service: str, existing_slugs: set) -> dict | None:
    """ใช้ Claude สร้าง content plan entry ใหม่ที่ไม่ซ้ำกับที่มีอยู่"""
    ctx = SERVICE_CONTEXT[service]
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    top = get_top_topics(service)
    perf_block = ""
    if top:
        items = "\n".join(
            f"- {r['title']} (focus: {r.get('focus_kw','')}, views: {r['views_30d']})"
            for r in top
        )
        perf_block = (
            f"\n\nหัวข้อที่ traffic ดีในช่วง 30 วันที่ผ่านมา (ใช้เป็นแรงบันดาลใจ "
            f"แต่ห้ามซ้ำหัวข้อเดิม — ให้ขยายความ ตอบลึก หรือมุมใหม่ที่เกี่ยวข้อง):\n{items}"
        )

    prompt = f"""สร้างหัวข้อบทความสุขภาพสำหรับเว็บ roogondee.com

บริการ: {ctx['name']}
กลุ่มเป้าหมาย: {ctx['target']}
หัวข้อที่เกี่ยวข้อง: {ctx['topics']}{perf_block}

ต้องการ JSON object เดียว (ไม่ใช่ array) ดังนี้:
{{
  "title": "หัวข้อบทความภาษาไทย น่าคลิก SEO-friendly 50-70 ตัวอักษร",
  "slug": "english-slug-lowercase-with-hyphens-only",
  "focus_kw": "keyword1,keyword2,keyword3 (3-4 คำ)",
  "meta_desc": "meta description ภาษาไทย 120-155 ตัวอักษร",
  "seed": "outline สั้น ๆ 3-5 ประเด็น (ไม่เกิน 250 ตัวอักษร)"
}}

กฎสำคัญ:
- slug ต้องเป็นภาษาอังกฤษตัวพิมพ์เล็ก + ตัวเลข + hyphen เท่านั้น (regex: ^[a-z0-9-]+$) ห้ามมีอักษรไทย อักขระพิเศษ หรือช่องว่าง
- slug ยาวไม่เกิน 60 ตัวอักษร ให้ transliterate ไทย → อังกฤษ (เช่น "ผู้หญิง" → "women", "ตรวจ" → "check")
- meta_desc ต้องสั้นระหว่าง 120-155 ตัวอักษร
- seed ต้องสั้นไม่เกิน 250 ตัวอักษร
- ห้ามใช้ slug ซ้ำกับที่มีอยู่แล้ว: {', '.join(list(existing_slugs)[:20])}
- หัวข้อต้องใหม่ ไม่ซ้ำ ตอบคำถามที่คนไทยค้นหาจริง
- ตอบ JSON object เดียวเท่านั้น ไม่ต้องห่อด้วย array ไม่มีข้อความอื่น"""

    last_err: Exception | None = None
    msg = None
    for attempt in range(3):
        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=3000,
                messages=[{"role": "user", "content": prompt}]
            )
            break
        except Exception as e:
            last_err = e
            print(f"  ↻ Claude call attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** attempt)
    if msg is None:
        print(f"  ❌ Claude call ล้มเหลวทุกครั้ง: {last_err}")
        return None
    text = msg.content[0].text.strip()

    # Parse JSON
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    try:
        data = json.loads(text)
        # Unwrap if Claude returned [{ ... }] instead of { ... }
        if isinstance(data, list):
            if not data:
                print("  ❌ Claude คืน array ว่าง")
                return None
            data = data[0]
        if data.get('slug') in existing_slugs:
            print(f"  ⚠️ slug ซ้ำ: {data['slug']} — ข้าม")
            return None
        issues = validate_plan_entry(data)
        if issues:
            print(f"  ⚠️ plan ไม่ผ่าน validation: {'; '.join(issues)}")
            return None
        return data
    except Exception as e:
        print(f"  ❌ Parse JSON failed: {e}\n  Raw: {text[:200]}")
        return None

# ─── PLAN VALIDATION ───────────────────────────────────────────────────────────

def validate_plan_entry(data: dict) -> list[str]:
    """Check title/slug/focus_kw/meta_desc/seed for obvious issues."""
    issues: list[str] = []

    for field in ("title", "slug", "focus_kw", "meta_desc", "seed"):
        if not (data.get(field) or "").strip():
            issues.append(f"ขาดฟิลด์ {field}")

    title = (data.get("title") or "").strip()
    if title and not (20 <= len(title) <= 100):
        issues.append(f"title ยาว {len(title)} ตัวอักษร (ควร 20-100)")

    slug = (data.get("slug") or "").strip()
    if slug and not re.fullmatch(r"[a-z0-9\-]+", slug):
        issues.append(f"slug มีอักขระไม่อนุญาต: {slug}")
    if slug and len(slug) > 80:
        issues.append(f"slug ยาวเกิน ({len(slug)})")

    meta = (data.get("meta_desc") or "").strip()
    if meta and not (80 <= len(meta) <= 200):
        issues.append(f"meta_desc ยาว {len(meta)} ตัวอักษร (ควร 80-200)")

    seed = (data.get("seed") or "").strip()
    if seed and len(seed) < 50:
        issues.append(f"seed สั้นเกินไป ({len(seed)} ตัวอักษร)")

    # Placeholder detection across all text fields
    combined = " ".join(str(data.get(f, "")) for f in ("title", "meta_desc", "seed", "focus_kw")).lower()
    for ph in ("lorem ipsum", "[todo]", "{placeholder}", "xxxx"):
        if ph in combined:
            issues.append(f"พบ placeholder: {ph}")

    return issues

# ─── INSERT TO SUPABASE ────────────────────────────────────────────────────────

def insert_plans(plans: list[dict]) -> int:
    if not plans:
        return 0
    data = json.dumps(plans).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/content_plan",
        data=data,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status

# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print("📅 รู้ก่อนดี — Auto-Generate Content Plan")

    existing_slugs = get_existing_slugs()
    latest_date = get_latest_scheduled_date()

    # สร้างแผนสำหรับ 14 วันถัดจากวันสุดท้ายที่มีอยู่
    start_date = latest_date + timedelta(days=1)
    print(f"📋 มี plan ถึง: {latest_date} | สร้างต่อจาก: {start_date}")

    # หา service ที่ต้องใช้ต่อ (วนตาม cycle)
    # นับ service ที่มีอยู่จาก today เพื่อ balance
    counts = get_service_count_by_date(date.today())
    print(f"📊 Service counts: {counts}")

    new_plans = []
    current_date = start_date

    for i in range(14):
        # เลือก service แบบ round-robin สมดุล
        min_count = min(counts.values())
        # หา service ที่มีน้อยที่สุด (เรียงตาม cycle ถ้าเท่ากัน)
        service = None
        for svc in SERVICES_CYCLE:
            if counts[svc] == min_count:
                service = svc
                break

        print(f"\n  📝 {current_date} [{service}] — กำลัง generate...")

        entry = generate_plan_entry(service, existing_slugs)
        if entry:
            entry['service'] = service
            entry['scheduled_date'] = str(current_date)
            entry['status'] = 'ready'
            new_plans.append(entry)
            existing_slugs.add(entry['slug'])
            counts[service] += 1
            print(f"  ✅ {entry['title'][:50]}")
        else:
            # Fallback: skip วันนี้
            print(f"  ⚠️ ข้าม {current_date}")

        current_date += timedelta(days=1)

    if new_plans:
        status = insert_plans(new_plans)
        print(f"\n🎉 เพิ่ม {len(new_plans)} plans สำเร็จ (HTTP {status})")
    else:
        print("\n📭 ไม่มี plan ใหม่")

    target = 14
    skip_rate = (target - len(new_plans)) / target
    if skip_rate >= 0.3:
        _line_notify(
            f"⚠️ รู้ก่อนดี gen_content_plan: skip rate สูง "
            f"({len(new_plans)}/{target} ผ่าน) — ตรวจสอบ Claude/Supabase"
        )

if __name__ == "__main__":
    main()
