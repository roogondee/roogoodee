# -*- coding: utf-8 -*-
"""
cron_failure_alert.py — แจ้งเตือนเมื่อ GitHub Actions cron ตัวใดตัวหนึ่งล้มเหลว

อ่าน context ของ workflow_run ที่ trigger เรา (จาก env) แล้ว push
ข้อความเข้า LINE staff group + ส่งอีเมลผ่าน Resend ให้ทีม

Trigger: .github/workflows/cron_failure_alert.yml (workflow_run จาก
ทุก cron ใน repo) — ตัว alert workflow ตั้งให้รันก็ต่อเมื่อ
conclusion == 'failure' เท่านั้น แต่ก็ guard ใน script อีกชั้นเผื่อ
ใครเรียกผิด

Env (ผ่านมาจาก yml):
  WORKFLOW_NAME, WORKFLOW_PATH, RUN_ID, RUN_URL, CONCLUSION,
  HEAD_SHA, HEAD_BRANCH, EVENT_NAME, ACTOR, ATTEMPT
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

LINE_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
LINE_TARGET = os.environ.get("LINE_TARGET_ID", "").strip()
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "team@roogondee.com")

WORKFLOW_NAME = os.environ.get("WORKFLOW_NAME", "(unknown)")
WORKFLOW_PATH = os.environ.get("WORKFLOW_PATH", "")
RUN_ID = os.environ.get("RUN_ID", "")
RUN_URL = os.environ.get("RUN_URL", "")
CONCLUSION = os.environ.get("CONCLUSION", "")
HEAD_SHA = os.environ.get("HEAD_SHA", "")[:7]
HEAD_BRANCH = os.environ.get("HEAD_BRANCH", "")
EVENT_NAME = os.environ.get("EVENT_NAME", "")
ACTOR = os.environ.get("ACTOR", "")
ATTEMPT = os.environ.get("ATTEMPT", "1")


def line_push(text: str) -> None:
    if not LINE_TOKEN or not LINE_TARGET:
        print("LINE token/target not set — skipping LINE push")
        return
    payload = json.dumps(
        {
            "to": LINE_TARGET,
            "messages": [{"type": "text", "text": text[:1900]}],
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.line.me/v2/bot/message/push",
        data=payload,
        headers={
            "Authorization": f"Bearer {LINE_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"LINE alert sent: {resp.status}")
    except Exception as e:  # noqa: BLE001
        print(f"LINE alert failed: {e}", file=sys.stderr)


def send_email(subject: str, html: str) -> None:
    if not RESEND_KEY:
        print("RESEND_API_KEY not set — skipping email")
        return
    payload = json.dumps(
        {
            "from": "รู้ก่อนดี(รู้งี้) <onboarding@resend.dev>",
            "to": [NOTIFY_EMAIL],
            "subject": subject,
            "html": html,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"Email alert sent: {resp.status}")
    except Exception as e:  # noqa: BLE001
        print(f"Email alert failed: {e}", file=sys.stderr)


def main() -> int:
    # Defensive guard — workflow yml already filters on failure but if someone
    # runs the script manually with conclusion != failure we don't want to spam.
    if CONCLUSION not in ("failure", "timed_out", "cancelled"):
        print(f"conclusion='{CONCLUSION}' is not a failure state — skipping alert")
        return 0

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    text = (
        f"🚨 Cron FAILED\n"
        f"workflow: {WORKFLOW_NAME}\n"
        f"branch: {HEAD_BRANCH} @ {HEAD_SHA}\n"
        f"trigger: {EVENT_NAME} (attempt #{ATTEMPT})\n"
        f"by: {ACTOR}\n"
        f"time: {now}\n"
        f"\n"
        f"ดู log: {RUN_URL}"
    )
    print(text)
    line_push(text)

    html = f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fef2f2;padding:24px;border-radius:12px;border:1px solid #fca5a5;">
  <h2 style="color:#b91c1c;margin-top:0;">🚨 Cron FAILED</h2>
  <table style="width:100%;font-size:14px;color:#222;">
    <tr><td style="padding:4px 0;color:#666;width:120px;">Workflow</td><td><b>{WORKFLOW_NAME}</b></td></tr>
    <tr><td style="padding:4px 0;color:#666;">Path</td><td><code>{WORKFLOW_PATH}</code></td></tr>
    <tr><td style="padding:4px 0;color:#666;">Branch / SHA</td><td>{HEAD_BRANCH} @ <code>{HEAD_SHA}</code></td></tr>
    <tr><td style="padding:4px 0;color:#666;">Trigger</td><td>{EVENT_NAME} (attempt #{ATTEMPT})</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Actor</td><td>{ACTOR}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Conclusion</td><td><b style="color:#b91c1c;">{CONCLUSION}</b></td></tr>
    <tr><td style="padding:4px 0;color:#666;">Time (UTC)</td><td>{now}</td></tr>
  </table>
  <div style="margin-top:18px;text-align:center;">
    <a href="{RUN_URL}" style="background:#b91c1c;color:#fff;padding:10px 24px;border-radius:20px;text-decoration:none;font-size:14px;">
      ดู Run + Logs
    </a>
  </div>
</div>
""".strip()
    send_email(f"🚨 Cron FAILED: {WORKFLOW_NAME}", html)
    return 0


if __name__ == "__main__":
    sys.exit(main())
