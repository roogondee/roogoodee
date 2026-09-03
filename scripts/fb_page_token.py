# -*- coding: utf-8 -*-
"""
fb_page_token.py — ออก Page access token ใหม่แบบไม่ต้องไล่ copy curl ทีละคำสั่ง

มีไว้แก้ error 190 สายพันธุ์ "…must be granted before impersonating a user's page"
ซึ่ง **ออก token ใหม่เฉย ๆ ไม่หาย** เพราะปัญหาอยู่ที่หน้า consent (ไม่ได้ติ๊กเพจ หรือ
ติ๊ก scope ไม่ครบ) ไม่ใช่ที่ตัว token

ใช้ยังไง:

  # 1) ได้ลิงก์ consent ที่ scope ครบ — เปิดในเบราว์เซอร์ที่ล็อกอินบัญชีแอดมินเพจ
  python scripts/fb_page_token.py --consent-url

  # 2) เอา user token ที่ได้มาแลกเป็น long-lived แล้วแตกเป็น Page token
  python scripts/fb_page_token.py --user-token "EAA…"

  # 3) เห็นค่าจริงเพื่อเอาไปวางใน GitHub Secrets / Vercel
  python scripts/fb_page_token.py --user-token "EAA…" --show-token

  # ตรวจ token ที่ตั้งอยู่ตอนนี้เฉย ๆ (ไม่ออกใหม่)
  python scripts/fb_graph.py

Env ที่ต้องมี: FB_APP_ID, FB_APP_SECRET, FB_PAGE_ID
(user token ใส่ผ่าน --user-token หรือ env FB_USER_ACCESS_TOKEN ก็ได้)

ค่า token ไม่ถูกพิมพ์ออกมาถ้าไม่สั่ง --show-token — ปกติจะเห็นแค่ fingerprint
เพื่อให้ paste log ให้คนอื่นดูได้โดยไม่หลุด token
"""

import argparse
import os
import sys
import urllib.parse

import requests

from fb_graph import (
    FB_API,
    FB_APP_ID,
    FB_APP_SECRET,
    FB_PAGE_ID,
    MINT_SCOPES,
    REQUIRED_SCOPES,
    RUNBOOK,
    debug_token,
    raise_for_fb_error,
    token_fingerprint,
)

# หน้า consent ของ Facebook ต้องมี redirect_uri ที่อยู่ใน Valid OAuth Redirect URIs ของแอป
# ค่านี้เป็นหน้า "login success" ของ Facebook เอง ใช้กับ desktop flow ได้โดยไม่ต้องมีเซิร์ฟเวอร์
DESKTOP_REDIRECT = "https://www.facebook.com/connect/login_success.html"

# task ที่ต้องมีบนเพจถึงจะโพสต์ story/รูปได้
REQUIRED_TASK = "CREATE_CONTENT"


def consent_url(scopes: tuple[str, ...] = MINT_SCOPES) -> str:
    params = {
        "client_id":     FB_APP_ID,
        "redirect_uri":  DESKTOP_REDIRECT,
        "response_type": "token",
        "scope":         ",".join(scopes),
        "auth_type":     "rerequest",  # บังคับให้แสดงหน้า consent ใหม่แม้เคยกดอนุญาตไปแล้ว
    }
    return f"https://www.facebook.com/{os.environ.get('FB_GRAPH_VERSION', 'v19.0')}/dialog/oauth?" + \
        urllib.parse.urlencode(params)


def print_consent_instructions() -> int:
    if not FB_APP_ID:
        print("❌ ต้องตั้ง FB_APP_ID ก่อน")
        return 1
    print("🔗 เปิดลิงก์นี้ในเบราว์เซอร์ที่ล็อกอินบัญชีซึ่งเป็นแอดมินของเพจ:\n")
    print(f"   {consent_url()}\n")
    print("บนหน้า consent:")
    print(f"  • กด \"แก้ไขการตั้งค่า\" แล้วติ๊กเพจ {FB_PAGE_ID or '(ตั้ง FB_PAGE_ID ด้วย)'} ให้แน่ใจ")
    print("    (ข้ามขั้นนี้แล้วจะได้ token ที่ยิงเพจนี้ไม่ได้ — คือ error ที่กำลังเจออยู่)")
    print(f"  • scope ที่ขอไป: {', '.join(MINT_SCOPES)}")
    print("\nพอ redirect เสร็จ ลอกค่า access_token จาก URL bar (หลัง #access_token=) มาใส่:")
    print("   python scripts/fb_page_token.py --user-token \"EAA…\"")
    print(f"\nถ้าลิงก์ขึ้น \"URL Blocked\" ให้เพิ่ม {DESKTOP_REDIRECT}")
    print("ใน App → Facebook Login → Settings → Valid OAuth Redirect URIs")
    print("หรือใช้ Graph API Explorer แทน (ดู " + RUNBOOK + " ข้อ 3A)")
    return 0


def exchange_long_lived(user_token: str) -> str:
    """short-lived user token (~1-2 ชม.) → long-lived (~60 วัน). ใส่ long-lived มาซ้ำก็ไม่พัง"""
    resp = requests.get(
        f"{FB_API}/oauth/access_token",
        params={
            "grant_type":        "fb_exchange_token",
            "client_id":         FB_APP_ID,
            "client_secret":     FB_APP_SECRET,
            "fb_exchange_token": user_token,
        },
        timeout=30,
    )
    data = raise_for_fb_error(resp, "แลก long-lived user token")
    token = str(data.get("access_token") or "")
    if not token:
        raise RuntimeError("Graph ไม่คืน access_token กลับมา")
    return token


def list_pages(user_token: str) -> list[dict]:
    """/me/accounts — ต้องมี scope pages_show_list ไม่งั้นได้ list ว่าง"""
    resp = requests.get(
        f"{FB_API}/me/accounts",
        params={"fields": "id,name,access_token,tasks", "access_token": user_token, "limit": 100},
        timeout=30,
    )
    return list(raise_for_fb_error(resp, "GET /me/accounts").get("data") or [])


def mint(user_token: str, page_id: str, *, show_token: bool) -> int:
    missing_env = [n for n, v in (("FB_APP_ID", FB_APP_ID), ("FB_APP_SECRET", FB_APP_SECRET)) if not v]
    if missing_env:
        print(f"❌ ขาด env {' และ '.join(missing_env)} — ดู {RUNBOOK}")
        return 1
    if not page_id:
        print("❌ ไม่รู้ว่าจะออก token ให้เพจไหน — ตั้ง FB_PAGE_ID หรือใส่ --page-id")
        return 1

    print(f"1/4 แลกเป็น long-lived user token …")
    long_user = exchange_long_lived(user_token)
    user_facts = debug_token(long_user)
    if user_facts.available:
        print(f"    scopes ที่ได้: {', '.join(user_facts.scopes) or '(ว่าง)'}")
        lacking = [s for s in MINT_SCOPES if user_facts.scopes and s not in user_facts.scopes]
        if lacking:
            print(f"    ⚠️  user token ขาด {', '.join(lacking)} — กด consent ใหม่ด้วย --consent-url")

    print("2/4 ดึงรายการเพจจาก /me/accounts …")
    pages = list_pages(long_user)
    if not pages:
        print("❌ ไม่มีเพจในลิสต์เลย — แปลว่า scope pages_show_list ไม่ถูกให้ หรือบัญชีนี้ไม่ได้เป็นแอดมินเพจไหน")
        print(f"   กด consent ใหม่: python scripts/fb_page_token.py --consent-url")
        return 1

    print(f"    เจอ {len(pages)} เพจ: " + ", ".join(f"{p.get('name')} ({p.get('id')})" for p in pages))
    match = next((p for p in pages if str(p.get("id")) == page_id), None)
    if not match:
        print(f"❌ เพจ {page_id} ไม่อยู่ในลิสต์ — ตอน consent ไม่ได้ติ๊กเพจนี้ (หรือบัญชีไม่ได้เป็นแอดมิน)")
        print("   นี่คือสาเหตุของ error 190 \"must be granted before impersonating a user's page\"")
        print(f"   กด consent ใหม่แล้วติ๊กเพจให้ถูก: python scripts/fb_page_token.py --consent-url")
        return 1

    tasks = [str(t) for t in (match.get("tasks") or [])]
    if tasks and REQUIRED_TASK not in tasks:
        print(f"    ⚠️  บัญชีนี้ไม่มีสิทธิ์ {REQUIRED_TASK} บนเพจ (มีแค่ {', '.join(tasks)}) — โพสต์ไม่ได้")
        print("       ให้แอดมินเพจอัปเกรด role เป็น Content/Full access ก่อน")

    page_token = str(match.get("access_token") or "")
    if not page_token:
        print("❌ entry ของเพจไม่มี access_token — scope ไม่ครบ")
        return 1

    print("3/4 ตรวจ Page token ที่ได้ …")
    facts = debug_token(page_token)
    for line in facts.report_lines():
        print(f"    {line}")
    if facts.available and facts.scopes:
        lacking = [s for s in REQUIRED_SCOPES if s not in facts.scopes]
        if lacking:
            print(f"    ⚠️  ขาด {', '.join(lacking)} — โพสต์จะพังด้วย error 200")

    print("4/4 ยิง GET /me ด้วย Page token ใหม่ …")
    resp = requests.get(f"{FB_API}/me", params={"fields": "id,name,category", "access_token": page_token}, timeout=30)
    if resp.status_code >= 400:
        from fb_graph import parse_fb_error
        print(f"❌ {parse_fb_error(resp, 'ทดสอบ GET /me').describe()}")
        return 1
    me = resp.json() or {}
    print(f"    ✅ โพสต์ในนามเพจ \"{me.get('name')}\" ({me.get('id')}) ได้แล้ว")

    print()
    print(f"🔑 Page token ใหม่: {token_fingerprint(page_token)}")
    if facts.available and not facts.expires_at:
        print("   ไม่มีวันหมดอายุ (แตกจาก long-lived user token)")
    if show_token:
        print()
        print(page_token)
    else:
        print("   ใส่ --show-token เพื่อพิมพ์ค่าจริงออกมา (อย่ารันในที่ที่ log ถูกเก็บ)")
    print()
    print("เอาไปวางให้ครบทั้งสองที่ ไม่งั้นจะเป็น \"cron ผ่าน แต่เว็บพัง\":")
    print("  • GitHub → Settings → Secrets and variables → Actions → FB_PAGE_ACCESS_TOKEN")
    print("  • Vercel → Settings → Environment Variables → FB_PAGE_ACCESS_TOKEN (แล้ว redeploy)")
    print(f"เทียบ fingerprint ทั้งสองที่ให้ตรงกันด้วย — ดู {RUNBOOK} ข้อ 5")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="ออก Facebook Page access token ใหม่")
    ap.add_argument("--consent-url", action="store_true", help="พิมพ์ลิงก์ consent ที่ scope ครบ แล้วจบ")
    ap.add_argument("--user-token", default=os.environ.get("FB_USER_ACCESS_TOKEN", "").strip(),
                    help="user token จากหน้า consent (short หรือ long-lived ก็ได้)")
    ap.add_argument("--page-id", default=FB_PAGE_ID, help="เพจที่จะออก token ให้ (default: FB_PAGE_ID)")
    ap.add_argument("--show-token", action="store_true", help="พิมพ์ค่า token จริง (default: แค่ fingerprint)")
    args = ap.parse_args()

    if args.consent_url:
        return print_consent_instructions()

    if not args.user_token:
        print("❌ ต้องมี user token — ใส่ --user-token หรือ env FB_USER_ACCESS_TOKEN")
        print("   ยังไม่มี? เริ่มที่: python scripts/fb_page_token.py --consent-url")
        return 1

    try:
        return mint(args.user_token, str(args.page_id).strip(), show_token=args.show_token)
    except Exception as e:  # FbError มี describe() ไทยอยู่แล้ว
        print(f"❌ {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
