# -*- coding: utf-8 -*-
"""
notify.py — แจ้งเตือนผ่านช่องทางที่เปิดใช้งานอยู่
LINE Notify ถูกยกเลิก 31 มี.ค. 2025 ต้องย้ายช่องทาง

เลือกช่องทางจาก ENV (ใช้ได้พร้อมกัน):
  - DISCORD_WEBHOOK_URL              (แนะนำ — ตั้งง่ายสุด)
  - LINE_CHANNEL_ACCESS_TOKEN +
    LINE_TARGET_ID                    (LINE Messaging API push)
  - SLACK_WEBHOOK_URL                 (incoming webhook)
  - LINE_NOTIFY_TOKEN                 (legacy — ใช้งานไม่ได้แล้ว แต่ยังคงไว้
                                       สำหรับสภาพแวดล้อม mock/test)
"""

import os
import json
import urllib.request
import urllib.error
from typing import Iterable


def _post(url: str, *, headers: dict, data: bytes, timeout: int = 10) -> None:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        urllib.request.urlopen(req, timeout=timeout).read()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        # ไม่ raise ออกไป — notify ล้มเหลวห้ามทำให้ pipeline หลักล้ม
        print(f"  ⚠️ notify failed ({url[:40]}...): {e}")


def _send_discord(message: str) -> bool:
    url = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
    if not url:
        return False
    payload = json.dumps({"content": message[:2000]}).encode("utf-8")
    _post(url, headers={"Content-Type": "application/json"}, data=payload)
    return True


def _send_slack(message: str) -> bool:
    url = os.environ.get("SLACK_WEBHOOK_URL", "").strip()
    if not url:
        return False
    payload = json.dumps({"text": message[:3000]}).encode("utf-8")
    _post(url, headers={"Content-Type": "application/json"}, data=payload)
    return True


def _send_line_messaging(message: str) -> bool:
    token = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
    target = os.environ.get("LINE_TARGET_ID", "").strip()
    if not token or not target:
        return False
    payload = json.dumps({
        "to": target,
        "messages": [{"type": "text", "text": message[:1900]}],
    }).encode("utf-8")
    _post(
        "https://api.line.me/v2/bot/message/push",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        data=payload,
    )
    return True


def _send_line_notify_legacy(message: str) -> bool:
    """ยังคงไว้ให้สำหรับ test/mock — production endpoint ปิดบริการแล้ว"""
    token = os.environ.get("LINE_NOTIFY_TOKEN", "").strip()
    if not token:
        return False
    payload = urllib.parse.urlencode({"message": message[:900]}).encode("utf-8")
    _post(
        "https://notify-api.line.me/api/notify",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data=payload,
    )
    return True


# `urllib.parse` import ที่ legacy ใช้
import urllib.parse  # noqa: E402


def notify(message: str) -> list[str]:
    """ส่ง message ไปทุกช่องทางที่เปิด — return list ของช่องที่ยิงสำเร็จ"""
    sent: list[str] = []
    if _send_discord(message):
        sent.append("discord")
    if _send_slack(message):
        sent.append("slack")
    if _send_line_messaging(message):
        sent.append("line_messaging")
    if _send_line_notify_legacy(message):
        sent.append("line_notify_legacy")
    if not sent:
        print(f"  ℹ️ ไม่มีช่อง notify เปิดใช้งาน — ข้าม: {message[:80]}")
    return sent
