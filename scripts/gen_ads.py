"""
gen_ads.py — Auto-generate Facebook ad drafts for Roogondee
รู้ก่อนดี (RuGonDee) — Claude (copy) + FLUX.1 (creative) → policy lint → draft

Default mode: DRY-RUN (saves to data/ad_drafts/<timestamp>.json + Supabase, no Meta POST)
Once Meta Marketing API permissions land, flip --live to publish as paused campaigns.

Run:
  python scripts/gen_ads.py                    # dry-run, all 3 services, 3 angles each
  python scripts/gen_ads.py --service glp1     # one service only
  python scripts/gen_ads.py --live             # POST to Meta as paused campaigns (requires SYSTEM_USER_TOKEN + AD_ACCOUNT_ID)

Env required:
  ANTHROPIC_API_KEY, TOGETHER_API_KEY
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET (optional, persists drafts)
Env required for --live (later, when permissions ready):
  FB_SYSTEM_USER_TOKEN, FB_AD_ACCOUNT_ID, FB_PAGE_ID, NEXT_PUBLIC_META_PIXEL_ID
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import anthropic
import requests

ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
TOGETHER_KEY = os.environ["TOGETHER_API_KEY"]
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET", "")

BKK_TZ = ZoneInfo("Asia/Bangkok")
SITE_BASE = os.environ.get("SITE_BASE_URL", "https://roogondee.com").rstrip("/")
OUT_DIR = Path("data/ad_drafts")

# ─── BRIEF CONSTRAINTS ──────────────────────────────────────────────────────

SERVICES = {
    "glp1": {
        "name": "GLP-1 ลดน้ำหนัก",
        "voucher": "FBS + HbA1c ฟรี (มูลค่า 500 บาท)",
        "cta_url": f"{SITE_BASE}/quiz/glp1",
        "audience": "ชาย+หญิง 28-55, BMI 27+",
        "angles": ["pain_led", "benefit_led", "social_proof"],
    },
    "std": {
        "name": "STD/HIV ตรวจฟรี",
        "voucher": "ตรวจ HIV + Syphilis ฟรี รู้ผลใน 1 ชั่วโมง",
        "cta_url": f"{SITE_BASE}/quiz/std",
        "audience": "ทุกเพศ 18-45",
        "angles": ["privacy_led", "prep_awareness", "reassurance"],
    },
    "ckd": {
        "name": "CKD ตรวจไต",
        "voucher": "ตรวจโปรตีนในปัสสาวะ ฟรี",
        "cta_url": f"{SITE_BASE}/quiz/ckd",
        "audience": "40+ ที่มีญาติเป็นเบาหวาน/ความดัน",
        "angles": ["family_led", "awareness", "caregiver"],
    },
}

ANGLE_HINTS = {
    "pain_led": "เริ่มด้วยปัญหาที่ user เจอ เช่น 'น้ำหนักลงยาก หิวบ่อย'",
    "benefit_led": "เน้นประโยชน์ + ฟรี ตรง ๆ",
    "social_proof": "ใช้ตัวเลขลูกค้า/บทพิสูจน์ (ระวัง claim ที่ตรวจสอบไม่ได้)",
    "privacy_led": "เน้นความส่วนตัว ไม่ตัดสิน",
    "prep_awareness": "อธิบาย PrEP เป็น preventive medicine",
    "reassurance": "เน้น 'รู้ก่อน = สบายใจ'",
    "family_led": "พูดถึงคนในบ้าน ผู้สูงอายุ",
    "awareness": "ให้ความรู้ — โรคไตระยะแรกไม่มีอาการ",
    "caregiver": "พูดกับลูกที่ดูแลพ่อแม่",
}

META_POLICY_RULES = """
ห้าม:
1. ใช้ before/after photos
2. Implicate user (ห้าม "คุณอ้วน" / "คุณติดเชื้อ")
3. Numerical health claims เฉพาะเจาะจง ("ลด 10 กิโล", "100% หาย")
4. Personal pronouns กับ body imagery
5. คำว่า "AIDS" ตรง ๆ ใน STD ad
6. Syringe / needle / blood imagery (STD)
7. Distressed / scared faces
8. Discrimination based on protected attributes
"""

# ─── CLAUDE: GENERATE COPY ──────────────────────────────────────────────────

def generate_ad_copy(service_key: str, angle: str) -> dict:
    s = SERVICES[service_key]
    angle_hint = ANGLE_HINTS[angle]
    prompt = f"""เขียน Facebook ad copy ภาษาไทย สำหรับโปรโมท: {s['name']} — {s['voucher']}
ที่ W Medical Hospital สมุทรสาคร

Audience: {s['audience']}
Angle: {angle} — {angle_hint}

ข้อกำหนด Meta:
- Primary text: ≤ 125 ตัวอักษร (รวมเว้นวรรค)
- Headline: ≤ 40 ตัวอักษร
- Description: ≤ 30 ตัวอักษร

Constraints:
{META_POLICY_RULES}

ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown ห่อ:
{{
  "primary_text": "...",
  "headline": "...",
  "description": "...",
  "cta_button": "Sign Up | Learn More | Get Offer"
}}
"""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1].lstrip("json").strip()
    return json.loads(text)


# ─── CLAUDE: POLICY LINTER ──────────────────────────────────────────────────

def lint_copy(service_key: str, copy: dict) -> dict:
    """Use Claude as a quick policy linter. Returns {pass: bool, reasons: [...]}."""
    prompt = f"""ตรวจ ad copy นี้ตาม Meta health-ad policy

Service: {SERVICES[service_key]['name']}
Copy:
- Primary: {copy['primary_text']}
- Headline: {copy['headline']}
- Description: {copy['description']}

Rules:
{META_POLICY_RULES}

ตอบ JSON:
{{
  "pass": true/false,
  "reasons": ["...", "..."]
}}
"""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1].lstrip("json").strip()
    return json.loads(text)


# ─── FLUX.1: GENERATE CREATIVE ──────────────────────────────────────────────

CREATIVE_PROMPTS = {
    "glp1": "healthy modern Thai kitchen, fresh vegetables and water, soft mint green tones, clean minimal lifestyle, no people, no scales, no measuring tape, professional photo",
    "std": "soft pastel sunset Bangkok skyline, abstract calm composition, mint and coral tones, no people, no medical equipment, no needles, no blood, peaceful atmosphere",
    "ckd": "warm light family living room, three generations silhouette, tone soft amber, no medical equipment, no clinical setting, comforting atmosphere",
}

def generate_creative(service_key: str) -> str | None:
    prompt = CREATIVE_PROMPTS.get(service_key, "healthcare professional, soft tones")
    try:
        resp = requests.post(
            "https://api.together.xyz/v1/images/generations",
            headers={"Authorization": f"Bearer {TOGETHER_KEY}", "Content-Type": "application/json"},
            json={
                "model": "black-forest-labs/FLUX.1-schnell",
                "prompt": prompt + ", high quality photography, 1:1 square",
                "width": 1080, "height": 1080,
                "steps": 4, "n": 1,
                "response_format": "url",
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["url"]
    except Exception as e:
        print(f"  ⚠️  Image gen failed for {service_key}: {e}")
        return None


# ─── META MARKETING API (live mode) ─────────────────────────────────────────

def post_to_meta_paused(ad: dict) -> dict:
    """Stub for live mode — implement when permissions land.
    Should create: campaign (PAUSED) → ad set → creative → ad
    Returns the IDs from Meta API."""
    raise NotImplementedError(
        "Meta Marketing API integration ยังไม่ได้ implement — "
        "รอ ads_management permission + System User Token + Ad Account ID"
    )


# ─── PIPELINE ───────────────────────────────────────────────────────────────

def build_one(service_key: str, angle: str) -> dict | None:
    print(f"  ✏️  copy: {service_key} / {angle}")
    try:
        copy = generate_ad_copy(service_key, angle)
    except Exception as e:
        print(f"     ⚠️  copy failed: {e}")
        return None

    print("  🛡  lint")
    try:
        lint = lint_copy(service_key, copy)
    except Exception as e:
        print(f"     ⚠️  lint failed: {e}")
        lint = {"pass": False, "reasons": [f"lint error: {e}"]}

    if not lint.get("pass"):
        print(f"     ❌ rejected: {lint.get('reasons')}")
        return None

    print("  🎨 image")
    image_url = generate_creative(service_key)

    s = SERVICES[service_key]
    utm = f"?utm_source=facebook&utm_medium=cpc&utm_campaign={service_key}_{angle}_auto"
    return {
        "service": service_key,
        "angle": angle,
        "audience": s["audience"],
        "copy": copy,
        "image_url": image_url,
        "landing_url": s["cta_url"] + utm,
        "lint_pass": True,
        "generated_at": datetime.now(BKK_TZ).isoformat(),
        "voucher_offer": s["voucher"],
    }


def save_drafts(drafts: list[dict], out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(drafts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n💾 saved {len(drafts)} drafts → {out_path}")


def save_to_supabase(drafts: list[dict]) -> int:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⏭  no Supabase creds, skipping DB persist")
        return 0
    try:
        from supabase import create_client
    except ImportError:
        print("⏭  supabase package not installed, skipping")
        return 0
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    rows = [{
        "service": d["service"],
        "angle": d["angle"],
        "primary_text": d["copy"]["primary_text"],
        "headline": d["copy"]["headline"],
        "description": d["copy"]["description"],
        "cta_button": d["copy"].get("cta_button"),
        "image_url": d["image_url"],
        "landing_url": d["landing_url"],
        "audience": d["audience"],
        "status": "draft",
        "lint_pass": d["lint_pass"],
        "generated_at": d["generated_at"],
    } for d in drafts]
    try:
        sb.table("ad_drafts").insert(rows).execute()
        return len(rows)
    except Exception as e:
        print(f"⚠️  supabase insert failed (table missing?): {e}")
        return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--service", choices=list(SERVICES.keys()) + ["all"], default="all")
    parser.add_argument("--live", action="store_true",
                        help="POST to Meta Marketing API as paused campaigns (requires permissions)")
    args = parser.parse_args()

    services = list(SERVICES.keys()) if args.service == "all" else [args.service]
    print(f"🚀 generating ads for: {services} (live={args.live})\n")

    drafts: list[dict] = []
    for sk in services:
        for angle in SERVICES[sk]["angles"]:
            d = build_one(sk, angle)
            if d:
                drafts.append(d)
            time.sleep(1)

    if not drafts:
        print("\n❌ no drafts produced")
        sys.exit(1)

    ts = datetime.now(BKK_TZ).strftime("%Y%m%d-%H%M%S")
    save_drafts(drafts, OUT_DIR / f"{ts}.json")
    persisted = save_to_supabase(drafts)
    if persisted:
        print(f"💽 persisted {persisted} rows to Supabase ad_drafts")

    if args.live:
        print("\n🛰  --live mode: POSTing to Meta…")
        for d in drafts:
            try:
                ids = post_to_meta_paused(d)
                print(f"   ✅ {d['service']}/{d['angle']} → {ids}")
            except NotImplementedError as e:
                print(f"   ⏭  {e}")
                break
    else:
        print("\n✅ DRY-RUN done (no Meta POST). flip --live เมื่อพร้อม")


if __name__ == "__main__":
    main()
