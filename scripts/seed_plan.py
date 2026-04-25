# -*- coding: utf-8 -*-
"""
seed_plan.py — สั่งสร้าง content_plan ทันที ครอบคลุมจากวันนี้ไปอีก N วัน
ใช้ตอนตู้ว่าง (ไม่มี plan รอโพสต์) หรืออยากเติมล่วงหน้า

Usage:
    python scripts/seed_plan.py            # default 14 วัน
    python scripts/seed_plan.py 7          # 7 วันถัดไป
    python scripts/seed_plan.py 14 --from 2026-05-01

ทำงานเหมือน gen_content_plan แต่ไม่อิงวันสุดท้ายของ plan ที่มี — บังคับเริ่ม
จากวันนี้ (หรือวันที่กำหนดด้วย --from) เพื่อกันช่องว่างย้อนหลัง
"""

import sys
import argparse
from datetime import date, timedelta

import gen_content_plan as gcp


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("days", type=int, nargs="?", default=14)
    p.add_argument("--from", dest="start", default=None,
                   help="YYYY-MM-DD (default: วันนี้)")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    start = date.fromisoformat(args.start) if args.start else date.today()
    days = max(1, args.days)
    print(f"🌱 seed_plan: {days} วัน เริ่ม {start}")

    existing_slugs = gcp.get_existing_slugs()
    counts = gcp.get_service_count_by_date(start)
    print(f"📊 service counts (from {start}): {counts}")

    new_plans: list[dict] = []
    current = start
    skipped = 0

    for _ in range(days):
        min_count = min(counts.values())
        service = next(s for s in gcp.SERVICES_CYCLE if counts[s] == min_count)

        print(f"\n  📝 {current} [{service}]")
        entry = gcp.generate_plan_entry(service, existing_slugs)
        if entry:
            entry["service"] = service
            entry["scheduled_date"] = str(current)
            entry["status"] = "ready"
            new_plans.append(entry)
            existing_slugs.add(entry["slug"])
            counts[service] += 1
            print(f"  ✅ {entry['title'][:60]}")
        else:
            skipped += 1
            print(f"  ⚠️ ข้าม {current}")

        current += timedelta(days=1)

    if not new_plans:
        print("\n📭 ไม่มี plan ใหม่ — ทุกตัวล้มเหลว")
        return 1

    status = gcp.insert_plans(new_plans)
    print(f"\n🎉 เพิ่ม {len(new_plans)}/{days} plans (skip {skipped}) — HTTP {status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
