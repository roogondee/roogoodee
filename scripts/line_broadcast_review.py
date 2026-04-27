# -*- coding: utf-8 -*-
"""
line_broadcast_review.py — Weekly LINE OA broadcast performance summary

ปิด feedback loop ของ line_broadcast.py ที่รันทุกวัน 18:00:
  - หา post ที่ broadcast ใน 7 วันล่าสุด (posts.line_broadcast_at)
  - นับ lead ที่มาจากแต่ละ broadcast (leads.source='line-broadcast'
    + leads.note ที่มี utm_campaign=<post.slug>)
  - ดึงสถิติ delivery จาก LINE Insight API ต่อวัน
    (/v2/bot/message/delivery/broadcast?date=YYYYMMDD)
  - คำนวณ approximate CTR = leads / delivered
  - ส่งให้ Claude เขียน narrative summary (ตัว topic ไหนเวิร์ค,
    ควรปรับ caption ทิศไหน) แล้ว email ให้ทีม

Run: GitHub Actions ทุกวันอาทิตย์ 09:30 Bangkok (02:30 UTC)
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
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "team@roogondee.com")
MODEL = "claude-haiku-4-5-20251001"

WINDOW_DAYS = 7

SERVICE_LABELS = {
    "std": "STD & PrEP",
    "glp1": "GLP-1",
    "ckd": "CKD",
    "foreign": "แรงงาน",
    "general": "ทั่วไป",
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


def supa_count(path: str, params: dict) -> int:
    """HEAD with Prefer: count=exact returns a Content-Range header where the
    last segment is the total count."""
    qs = urllib.parse.urlencode(params, safe=",.()*%")
    url = f"{SUPABASE_URL}/rest/v1/{path}?{qs}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Prefer": "count=exact",
            "Range-Unit": "items",
            "Range": "0-0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        rng = resp.headers.get("Content-Range", "")  # e.g. "0-0/42"
        if "/" in rng:
            try:
                return int(rng.rsplit("/", 1)[-1])
            except ValueError:
                pass
        return len(json.loads(resp.read().decode("utf-8")))


# ─── LINE INSIGHT API ──────────────────────────────────────────────────────
def line_get(path: str) -> dict:
    req = urllib.request.Request(
        f"https://api.line.me/v2/bot{path}",
        headers={"Authorization": f"Bearer {LINE_TOKEN}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"  LINE API {path} → {e.code}: {body}", file=sys.stderr)
        return {}


def get_follower_count() -> int:
    """LINE Insight returns data 2-3 days in arrears; query 3 days back."""
    yyyymmdd = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y%m%d")
    data = line_get(f"/insight/followers?date={yyyymmdd}")
    return int(data.get("followers") or 0)


def get_broadcast_delivery(yyyymmdd: str) -> int:
    """Total messages delivered as broadcast on that day (Asia/Bangkok)."""
    data = line_get(f"/message/delivery/broadcast?date={yyyymmdd}")
    if data.get("status") != "ready":
        return 0
    return int(data.get("broadcast") or 0)


# ─── DATA ─────────────────────────────────────────────────────────────────
def fetch_recent_broadcasts() -> list:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)).isoformat()
    return supa_get(
        "posts",
        {
            "select": "id,title,slug,service,image_url,line_broadcast_at,line_broadcast_id",
            "line_broadcast_at": f"gte.{cutoff}",
            "order": "line_broadcast_at.desc",
            "limit": "30",
        },
    )


def count_leads_for_slug(slug: str) -> int:
    """Leads marked source='line-broadcast' and note containing utm_campaign=<slug>."""
    if not slug:
        return 0
    pattern = f"%utm_campaign={slug}%"
    return supa_count(
        "leads",
        {
            "select": "id",
            "source": "eq.line-broadcast",
            "note": f"ilike.{pattern}",
        },
    )


# ─── CLAUDE ────────────────────────────────────────────────────────────────
def summarize(rows: list, follower_count: int) -> str:
    rows_block = "\n".join(
        f"- [{r['service']}] {r['title']}\n"
        f"    broadcast_at={r['line_broadcast_at']}  delivered={r['delivered']}  "
        f"leads={r['leads']}  CTR={r['ctr_pct']}%"
        for r in rows
    )
    prompt = f"""คุณเป็น marketing analyst ของคลินิก รู้ก่อนดี(รู้งี้)

ข้อมูล LINE OA broadcast 7 วันล่าสุด (followers ปัจจุบัน ≈ {follower_count}):

{rows_block}

วิเคราะห์เป็นภาษาไทยให้ทีม content + sales:

## สรุปภาพรวม
1-2 บรรทัด: posts ทั้งหมดกี่ตัว, leads รวม, CTR เฉลี่ย, trend ที่เห็น

## 🥇 Top performers
1-2 posts ที่ CTR สูงสุด — เหตุผลที่น่าจะเวิร์ค (topic? service? angle?)

## 📉 Underperformers
1-2 posts ที่ CTR ต่ำกว่าเฉลี่ย — สมมติฐานว่าทำไม + ควรปรับอะไรในรอบหน้า
(caption tone? image angle? service mix?)

## 💡 Recommendations
2-3 ข้อสำหรับ caption agent + content team รอบหน้า

ตอบกระชับ ≤ 400 คำ"""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    return "\n".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()


# ─── EMAIL ─────────────────────────────────────────────────────────────────
def render_email(rows: list, follower_count: int, summary: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_leads = sum(r["leads"] for r in rows)
    total_delivered = sum(r["delivered"] for r in rows)
    avg_ctr = round(100 * total_leads / total_delivered, 2) if total_delivered else 0

    cards = "".join(
        f"""
<div style="background:#fff;border:1px solid #e0ebe3;border-radius:8px;padding:12px;margin-bottom:10px;">
  <div style="font-size:11px;color:#94a3b8;">{r['line_broadcast_at'][:10]} · {SERVICE_LABELS.get(r['service'], r['service'])}</div>
  <div style="font-weight:700;font-size:14px;color:#2D4A3E;margin-top:2px;">{r['title']}</div>
  <div style="font-size:13px;color:#444;margin-top:6px;">
    delivered <b>{r['delivered']:,}</b> · leads <b>{r['leads']}</b> · CTR <b style="color:#2D4A3E;">{r['ctr_pct']}%</b>
  </div>
</div>
""".strip()
        for r in rows
    )

    return f"""
<div style="font-family:sans-serif;max-width:680px;margin:0 auto;background:#f8faf8;padding:24px;border-radius:12px;">
  <h2 style="color:#2D4A3E;margin-top:0;">📊 LINE Broadcast Review — {today}</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:#555;margin-bottom:16px;">
    <div><b>Followers</b> ≈ {follower_count:,}</div>
    <div><b>Posts</b> {len(rows)}</div>
    <div><b>Total leads</b> {total_leads}</div>
    <div><b>Avg CTR</b> {avg_ctr}%</div>
  </div>
  <h3 style="color:#2D4A3E;margin-bottom:8px;">📦 Posts</h3>
  {cards or "<i style='color:#94a3b8'>ไม่มี broadcast ใน 7 วันล่าสุด</i>"}
  <h3 style="color:#2D4A3E;margin-top:16px;margin-bottom:8px;">🧠 Analysis</h3>
  <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:sans-serif;font-size:14px;line-height:1.6;color:#222;background:#fff;padding:16px;border-radius:8px;border:1px solid #e0ebe3;">
{summary}
  </pre>
</div>
""".strip()


def send_email(html: str, total_leads: int) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email send")
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    payload = json.dumps(
        {
            "from": "รู้ก่อนดี(รู้งี้) <onboarding@resend.dev>",
            "to": [NOTIFY_EMAIL],
            "subject": f"📊 LINE Broadcast Review — {today} ({total_leads} leads/wk)",
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


# ─── MAIN ──────────────────────────────────────────────────────────────────
def main() -> int:
    if not LINE_TOKEN:
        print("LINE_CHANNEL_ACCESS_TOKEN not set — skipping.")
        return 0

    print(f"Fetching broadcasts from last {WINDOW_DAYS} days …")
    posts = fetch_recent_broadcasts()
    print(f"  posts: {len(posts)}")
    if not posts:
        print("No broadcasts to review. Skipping email.")
        return 0

    print("Querying LINE Insight API …")
    follower_count = get_follower_count()
    print(f"  followers ≈ {follower_count}")

    rows = []
    for p in posts:
        broadcast_iso = p.get("line_broadcast_at") or ""
        try:
            dt = datetime.fromisoformat(broadcast_iso.replace("Z", "+00:00"))
            # LINE Insight uses Asia/Bangkok day boundaries — shift to BKK
            dt_bkk = dt + timedelta(hours=7)
            yyyymmdd = dt_bkk.strftime("%Y%m%d")
        except Exception:  # noqa: BLE001
            yyyymmdd = ""

        delivered = get_broadcast_delivery(yyyymmdd) if yyyymmdd else 0
        # If multiple broadcasts on same day, this is a daily total — split
        # evenly across same-day posts (best-effort, no per-broadcast metric
        # without setting up customAggregationUnit which needs more setup).
        leads = count_leads_for_slug(p.get("slug", ""))
        ctr = round(100 * leads / delivered, 2) if delivered else 0

        rows.append({
            **p,
            "delivered": delivered,
            "leads": leads,
            "ctr_pct": ctr,
        })
        print(f"  {p.get('slug','?'):40s}  delivered={delivered:6d}  leads={leads:3d}  CTR={ctr}%")

    # Adjust delivered when multiple posts share the same broadcast day
    by_date: dict[str, list] = {}
    for r in rows:
        key = (r["line_broadcast_at"] or "")[:10]
        by_date.setdefault(key, []).append(r)
    for date_key, group in by_date.items():
        if len(group) > 1 and group[0]["delivered"]:
            split = group[0]["delivered"] // len(group)
            for r in group:
                r["delivered"] = split
                r["ctr_pct"] = round(100 * r["leads"] / split, 2) if split else 0

    summary = summarize(rows, follower_count)
    print("\n" + "=" * 60)
    print(summary)
    print("=" * 60 + "\n")

    html = render_email(rows, follower_count, summary)
    total_leads = sum(r["leads"] for r in rows)
    send_email(html, total_leads)
    return 0


if __name__ == "__main__":
    sys.exit(main())
