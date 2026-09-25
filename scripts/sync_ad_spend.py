# -*- coding: utf-8 -*-
"""
sync_ad_spend.py — ดึงค่าโฆษณา Meta รายวัน/รายแคมเปญ เข้าตาราง ad_spend_daily
เพื่อให้ /admin/growth คำนวณ "ต้นทุนต่อคนไข้ที่มาจริง" แยกตามบริการได้

ENV:
  META_ADS_ACCESS_TOKEN   — token ที่มีสิทธิ์ ads_read บน ad account
  META_AD_ACCOUNT_ID      — เลข ad account (มีหรือไม่มี "act_" นำหน้าก็ได้)
  SYNC_DAYS               — ย้อนหลังกี่วัน (default 7 — Meta แก้ตัวเลขย้อนหลังได้ถึงหลายวัน)
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET

ถ้าไม่ตั้ง META_ADS_* — script จะข้ามแบบเงียบ (exit 0)
Google / TikTok / LINE Ads ยังไม่มี API hookup → กรอกมือที่ /admin/growth

บริการของแคมเปญเดาจากชื่อแคมเปญ (เช่น RGD_GLP1_Quiz_Traffic_Aug2026 → glp1)
ตั้งชื่อแคมเปญใหม่ให้มีรหัสบริการเสมอ ไม่งั้นจะตกไปอยู่ 'unknown'
"""

import os
import re
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import date, timedelta

GRAPH_VERSION = "v21.0"

TOKEN      = os.environ.get("META_ADS_ACCESS_TOKEN", "").strip()
ACCOUNT_ID = os.environ.get("META_AD_ACCOUNT_ID", "").strip()
SYNC_DAYS  = int(os.environ.get("SYNC_DAYS", "7") or "7")

# Order matters: first match wins. Word-ish boundaries so "MIND" in a longer
# token still matches but "CKD" never matches inside another code.
SERVICE_PATTERNS = [
    ("glp1",    r"GLP-?1"),
    ("ckd",     r"CKD"),
    ("std",     r"STD|PREP|HIV"),
    ("mens",    r"MENS|MEN40"),
    ("women",   r"WOMEN|WMN"),
    ("mind",    r"MIND|MND"),
    ("dna",     r"DNA"),
    ("foreign", r"FRN|FOREIGN|MOU|WORK-?PERMIT|WP2569|HEALTH-?PROGRAM"),
    ("advice",  r"ADVICE"),
]


def service_from_campaign(name: str) -> str:
    upper = (name or "").upper().replace(" ", "_")
    for service, pattern in SERVICE_PATTERNS:
        if re.search(rf"(^|[^A-Z0-9]){pattern}([^A-Z0-9]|$)", upper):
            return service
    return "unknown"


def fetch_insights(since: date, until: date) -> list[dict]:
    account = ACCOUNT_ID if ACCOUNT_ID.startswith("act_") else f"act_{ACCOUNT_ID}"
    params = {
        "level": "campaign",
        "time_increment": "1",
        "time_range": json.dumps({"since": since.isoformat(), "until": until.isoformat()}),
        "fields": "campaign_name,spend,impressions,clicks,date_start",
        "limit": "500",
        "access_token": TOKEN,
    }
    url = f"https://graph.facebook.com/{GRAPH_VERSION}/{account}/insights?{urllib.parse.urlencode(params)}"
    rows: list[dict] = []
    while url:
        try:
            data = json.loads(urllib.request.urlopen(url, timeout=60).read())
        except urllib.error.HTTPError as e:
            # Graph error bodies explain the fix (expired token, missing
            # ads_read) and never echo the token back.
            raise SystemExit(f"Meta Insights HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:500]}")
        rows.extend(data.get("data", []))
        url = data.get("paging", {}).get("next")
    return rows


def upsert(rows: list[dict]) -> None:
    supabase_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SECRET"]
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/ad_spend_daily?on_conflict=spend_date,platform,service,campaign",
        data=json.dumps(rows).encode("utf-8"),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )
    urllib.request.urlopen(req, timeout=60).read()


def main() -> None:
    if not (TOKEN and ACCOUNT_ID):
        print("META_ADS_ACCESS_TOKEN / META_AD_ACCOUNT_ID not set — skipping")
        return

    until = date.today() - timedelta(days=1)
    since = until - timedelta(days=max(SYNC_DAYS - 1, 0))
    insights = fetch_insights(since, until)

    rows = []
    for r in insights:
        name = r.get("campaign_name") or ""
        rows.append({
            "spend_date":  r["date_start"],
            "platform":    "meta",
            "service":     service_from_campaign(name),
            "campaign":    name[:200],
            "spend":       float(r.get("spend") or 0),
            "impressions": int(r.get("impressions") or 0),
            "clicks":      int(r.get("clicks") or 0),
            "source":      "meta_api",
        })

    if rows:
        upsert(rows)
    unknown = sorted({r["campaign"] for r in rows if r["service"] == "unknown"})
    print(f"synced {len(rows)} campaign-days ({since} → {until})")
    if unknown:
        print("campaigns with no service code in the name (counted as 'unknown'):")
        for name in unknown:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
