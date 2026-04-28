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

import html as _html
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

# GitHub API access (for fetching the failed job's log excerpt)
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "")  # "owner/repo"

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


def gh_api(path: str) -> bytes:
    """GET against the GitHub REST API. Returns raw bytes (logs are plaintext)."""
    url = f"https://api.github.com{path}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "roogondee-cron-alert",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def fetch_failure_excerpt(max_lines: int = 25) -> str:
    """Fetch the failed job's log and return the last `max_lines` of signal.

    Returns "" on any error so the alert still goes out — a missing excerpt is
    better than a missing alert. Looks for the first job with conclusion in
    {failure, timed_out, cancelled} and pulls its plaintext log.
    """
    if not (GITHUB_TOKEN and GITHUB_REPOSITORY and RUN_ID):
        return ""
    try:
        jobs_raw = gh_api(f"/repos/{GITHUB_REPOSITORY}/actions/runs/{RUN_ID}/jobs")
        jobs = json.loads(jobs_raw).get("jobs", [])
        failed = next(
            (j for j in jobs if j.get("conclusion") in ("failure", "timed_out", "cancelled")),
            None,
        )
        if not failed:
            return ""
        log_bytes = gh_api(f"/repos/{GITHUB_REPOSITORY}/actions/jobs/{failed['id']}/logs")
        text = log_bytes.decode("utf-8", errors="ignore")
    except Exception as e:  # noqa: BLE001
        print(f"fetch_failure_excerpt: {type(e).__name__}: {e}", file=sys.stderr)
        return ""

    # Strip the "2026-04-28T17:14:32.1234567Z " timestamp prefix Actions adds
    # to every line — it eats budget without adding signal.
    cleaned: list[str] = []
    for line in text.splitlines():
        if len(line) > 28 and line[4] == "-" and line[10] == "T" and "Z " in line[:32]:
            cleaned.append(line.split("Z ", 1)[1])
        else:
            cleaned.append(line)

    # Prefer lines around our structured FAIL marker or a Python traceback if
    # one exists — otherwise fall back to the tail of the log.
    markers = ("FAIL step=", "Traceback (most recent call last)", "Error:", "##[error]")
    anchor = -1
    for i, line in enumerate(cleaned):
        if any(m in line for m in markers):
            anchor = i  # keep last match — the final error is usually most useful
    if anchor >= 0:
        start = max(0, anchor - 5)
        excerpt = cleaned[start : anchor + max_lines]
    else:
        excerpt = cleaned[-max_lines:]

    return "\n".join(line for line in excerpt if line.strip())


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
    excerpt = fetch_failure_excerpt()

    text_parts = [
        "🚨 Cron FAILED",
        f"workflow: {WORKFLOW_NAME}",
        f"branch: {HEAD_BRANCH} @ {HEAD_SHA}",
        f"trigger: {EVENT_NAME} (attempt #{ATTEMPT})",
        f"by: {ACTOR}",
        f"time: {now}",
    ]
    if excerpt:
        # LINE text limit is 5000 chars; line_push already truncates to 1900.
        # Reserve ~600 chars of header room → cap excerpt at 1200.
        text_parts.append("")
        text_parts.append("— log excerpt —")
        text_parts.append(excerpt[-1200:])
    text_parts.append("")
    text_parts.append(f"ดู log: {RUN_URL}")
    text = "\n".join(text_parts)
    print(text)
    line_push(text)

    excerpt_html = ""
    if excerpt:
        # html.escape avoids breaking the email layout when the log contains
        # angle brackets (e.g. <urlopen error ...>, json fragments).
        excerpt_html = (
            "<h3 style=\"margin:18px 0 6px 0;font-size:13px;color:#555;\">Log excerpt</h3>"
            "<pre style=\"background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;"
            "font-size:11px;line-height:1.5;overflow-x:auto;white-space:pre-wrap;"
            "word-break:break-word;max-height:360px;\">"
            f"{_html.escape(excerpt[-3000:])}"
            "</pre>"
        )

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
  {excerpt_html}
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
