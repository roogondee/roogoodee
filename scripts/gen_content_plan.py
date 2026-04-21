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
import urllib.request
import urllib.parse
from datetime import date, timedelta
import anthropic

# ─── CONFIG ────────────────────────────────────────────────────────────────────
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL  = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY  = os.environ["SUPABASE_SECRET"]

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

# ─── CLAUDE GENERATION ─────────────────────────────────────────────────────────

def generate_plan_entry(service: str, existing_slugs: set) -> dict | None:
    """ใช้ Claude สร้าง content plan entry ใหม่ที่ไม่ซ้ำกับที่มีอยู่"""
    ctx = SERVICE_CONTEXT[service]
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    prompt = f"""สร้างหัวข้อบทความสุขภาพสำหรับเว็บ roogondee.com

บริการ: {ctx['name']}
กลุ่มเป้าหมาย: {ctx['target']}
หัวข้อที่เกี่ยวข้อง: {ctx['topics']}

ต้องการ JSON ดังนี้:
{{
  "title": "หัวข้อบทความภาษาไทย น่าคลิก SEO-friendly 50-70 ตัวอักษร",
  "slug": "url-slug-english-or-thai-mixed-lowercase-hyphens-max-60-chars",
  "focus_kw": "keyword1,keyword2,keyword3 (3-4 คำ)",
  "meta_desc": "meta description ภาษาไทย 120-155 ตัวอักษร",
  "seed": "outline เนื้อหาหลัก 3-5 ประเด็น สำหรับเขียนบทความ 900-1200 คำ"
}}

กฎ:
- ห้ามใช้ slug ซ้ำกับที่มีอยู่แล้ว: {', '.join(list(existing_slugs)[:20])}
- หัวข้อต้องใหม่ ไม่ซ้ำ ตอบคำถามที่คนไทยค้นหาจริง
- ตอบ JSON เท่านั้น ไม่มีข้อความอื่น"""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    text = msg.content[0].text.strip()

    # Parse JSON
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    try:
        data = json.loads(text)
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

if __name__ == "__main__":
    main()
