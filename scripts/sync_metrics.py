# -*- coding: utf-8 -*-
"""
sync_metrics.py — ดึงสถิติ traffic ของ blog posts มาเก็บใน Supabase
ตอนนี้รองรับ Plausible Stats API (https://plausible.io/docs/stats-api)

ENV:
  PLAUSIBLE_API_KEY    — Plausible API token
  PLAUSIBLE_SITE_ID    — Plausible site domain (เช่น roogondee.com)
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET

ถ้าไม่ตั้ง PLAUSIBLE_* — script จะข้ามแบบเงียบ (exit 0)
"""

import os
import json
import urllib.request
import urllib.parse
from datetime import date, timedelta


PLAUSIBLE_KEY  = os.environ.get("PLAUSIBLE_API_KEY", "").strip()
PLAUSIBLE_SITE = os.environ.get("PLAUSIBLE_SITE_ID", "").strip()
SUPABASE_URL   = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SUPABASE_KEY   = os.environ["SUPABASE_SECRET"]

SUPA_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def fetch_post_slugs() -> dict[str, str]:
    """Return mapping slug → post_id"""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/posts?select=id,slug&status=eq.published",
        headers=SUPA_HEADERS,
    )
    data = json.loads(urllib.request.urlopen(req, timeout=30).read())
    return {row["slug"]: row["id"] for row in data if row.get("slug")}


def fetch_plausible_breakdown(period: str = "7d") -> list[dict]:
    """ดึง pageviews ต่อ page path (ระดับ aggregate ของ period นั้น ๆ)"""
    if not (PLAUSIBLE_KEY and PLAUSIBLE_SITE):
        return []
    qs = urllib.parse.urlencode({
        "site_id": PLAUSIBLE_SITE,
        "period":  period,
        "property": "event:page",
        "metrics": "visitors,pageviews",
        "limit":   "200",
    })
    req = urllib.request.Request(
        f"https://plausible.io/api/v1/stats/breakdown?{qs}",
        headers={"Authorization": f"Bearer {PLAUSIBLE_KEY}"},
    )
    data = json.loads(urllib.request.urlopen(req, timeout=30).read())
    return data.get("results", [])


def upsert_metrics(rows: list[dict]) -> int:
    if not rows:
        return 0
    # ใช้ upsert ผ่าน Prefer: resolution=merge-duplicates
    body = json.dumps(rows).encode("utf-8")
    headers = {**SUPA_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/post_metrics?on_conflict=post_id,date",
        data=body, headers=headers, method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=30).read()
        return len(rows)
    except Exception as e:
        print(f"  ❌ upsert failed: {e}")
        return 0


def main() -> int:
    if not (PLAUSIBLE_KEY and PLAUSIBLE_SITE):
        print("ℹ️ ไม่ได้ตั้ง PLAUSIBLE_API_KEY/PLAUSIBLE_SITE_ID — ข้าม sync_metrics")
        return 0

    print(f"📊 sync_metrics — site={PLAUSIBLE_SITE}")
    slug_to_id = fetch_post_slugs()
    print(f"  posts ที่ track: {len(slug_to_id)}")

    breakdown = fetch_plausible_breakdown(period="7d")
    today = date.today()
    rows: list[dict] = []
    matched = 0

    for entry in breakdown:
        page = entry.get("page", "")
        # เก็บเฉพาะ /blog/<slug>
        if not page.startswith("/blog/"):
            continue
        slug = page.split("/blog/")[1].rstrip("/")
        post_id = slug_to_id.get(slug)
        if not post_id:
            continue
        rows.append({
            "post_id":  post_id,
            "date":     today.isoformat(),
            "views":    int(entry.get("pageviews", 0)),
            "visitors": int(entry.get("visitors", 0)),
            "source":   "plausible",
        })
        matched += 1

    print(f"  จับคู่ post → metrics ได้ {matched} แถว")
    saved = upsert_metrics(rows)
    print(f"🎉 บันทึก {saved} แถวลง post_metrics")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
