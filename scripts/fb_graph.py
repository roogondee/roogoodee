# -*- coding: utf-8 -*-
"""
fb_graph.py — helper กลางสำหรับเรียก Facebook Graph API จาก scripts/

มีสองหน้าที่:
  1. preflight_page_token() — ตรวจ token ก่อนเริ่มงานหนัก (Claude / FLUX / Supabase Storage)
     เพื่อให้ cron ล้มเร็วพร้อมข้อความที่บอกวิธีแก้ แทนที่จะเผา quota แล้วค่อยพังตอนยิง Graph
  2. raise_for_fb_error() — แปลง error JSON ของ Graph API เป็นข้อความไทยที่ทำตามแล้วแก้ได้จริง
     (แทน raw JSON ที่ถูกตัดกลางคำใน alert)

Env:
  FB_PAGE_ID              จำเป็น
  FB_PAGE_ACCESS_TOKEN    จำเป็น — ต้องเป็น "Page" access token ไม่ใช่ user token
  FB_APP_ID + FB_APP_SECRET   optional — ถ้ามีจะเรียก /debug_token เช็ควันหมดอายุ + scope ให้ด้วย
  FB_GRAPH_VERSION        optional (default v19.0)

รันตรง ๆ เพื่อวินิจฉัย token:
  python scripts/fb_graph.py
"""

import hashlib
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone

import requests

GRAPH_VERSION = os.environ.get("FB_GRAPH_VERSION", "v19.0").strip() or "v19.0"
FB_API        = f"https://graph.facebook.com/{GRAPH_VERSION}"

FB_PAGE_ID    = os.environ.get("FB_PAGE_ID", "").strip()
FB_PAGE_TOKEN = os.environ.get("FB_PAGE_ACCESS_TOKEN", "").strip()
FB_APP_ID     = os.environ.get("FB_APP_ID", "").strip()
FB_APP_SECRET = os.environ.get("FB_APP_SECRET", "").strip()

RUNBOOK = "docs/fb-token-runbook.md"

# Graph error codes ที่แปลว่า "token ใช้ไม่ได้" — ต้องออก token ใหม่ ไม่ใช่ retry
AUTH_CODES = {102, 190, 458, 459, 463, 464, 467, 492}
# แปลว่า token ใช้ได้ แต่ขาดสิทธิ์/permission (App Review หรือ role บนเพจ)
PERMISSION_CODES = {3, 10, 200, 299}
# rate limit — retry วันหลังได้ ไม่ต้องแตะ token
RATE_LIMIT_CODES = {4, 17, 32, 613}

# scope ที่ต้องมีตอน "ใช้งาน" (โพสต์ story/รูปในนามเพจ)
REQUIRED_SCOPES = ("pages_manage_posts", "pages_read_engagement")
# scope ที่ต้องติ๊กตอน "ออก token" — pages_show_list ไม่ได้ใช้ตอนโพสต์
# แต่ถ้าไม่มี /me/accounts จะไม่คืนเพจออกมา เลยแตก Page token ไม่ได้ตั้งแต่ต้น
MINT_SCOPES = ("pages_show_list", "pages_read_engagement", "pages_manage_posts")


def token_fingerprint(token: str = "") -> str:
    """ลายนิ้วมือ token แบบปลอดภัย — เอาไว้เทียบว่า GitHub secret กับ Vercel เป็นตัวเดียวกันไหม"""
    tok = (token or FB_PAGE_TOKEN).strip()
    if not tok:
        return "(ไม่มีค่า)"
    digest = hashlib.sha256(tok.encode("utf-8")).hexdigest()[:8]
    return f"{tok[:4]}…len={len(tok)} sha256:{digest}"


# ─── ERROR TYPES ──────────────────────────────────────────────────────────────

class FbError(RuntimeError):
    """error จาก Graph API ที่ parse แล้ว"""

    def __init__(self, *, context: str, status: int, code: int, subcode: int,
                 err_type: str, message: str, trace: str = "", raw: str = ""):
        self.context  = context
        self.status   = status
        self.code     = code
        self.subcode  = subcode
        self.err_type = err_type
        self.fb_message = message
        self.trace    = trace
        self.raw      = raw
        super().__init__(self.describe())

    @property
    def is_rate_limit(self) -> bool:
        return self.code in RATE_LIMIT_CODES

    @property
    def is_permission(self) -> bool:
        return self.code in PERMISSION_CODES and not self.is_rate_limit

    @property
    def is_missing_page_grant(self) -> bool:
        """
        190 อีกสายพันธุ์: "Any of the pages_* permission(s) must be granted before
        impersonating a user's page" — token ยังมีตัวตนอยู่ (ไม่ได้หมดอายุ/โดน revoke)
        แต่แอปไม่เคยได้รับ page permission จากบัญชีที่ออก token
        คนละเรื่องกับ "must be an administrator, editor, or moderator" ซึ่งแปลว่า role หลุด
        ถ้าไม่แยก alert จะสั่งให้ไปไล่เช็ค role/2FA ทั้งที่ปัญหาอยู่ที่หน้า consent
        """
        msg = self.fb_message.lower()
        return self.code == 190 and "impersonating" in msg and "must be granted" in msg

    @property
    def is_auth(self) -> bool:
        # rate limit และ permission error ก็เป็น type=OAuthException เหมือนกัน
        # เช็ค code ก่อนเสมอ ไม่งั้นจะไปแนะนำให้ออก token ใหม่ทั้งที่ token ไม่ได้พัง
        if self.is_rate_limit or self.is_permission:
            return False
        return self.code in AUTH_CODES or (self.err_type == "OAuthException" and self.code != 0)

    @property
    def retryable(self) -> bool:
        """คุ้มที่จะรอ cron รอบหน้าไหม — auth/permission ต้องมีคนไปแก้ ไม่ใช่รอ"""
        return self.is_rate_limit or self.status >= 500

    def describe(self) -> str:
        head = f"{self.context}: HTTP {self.status}"
        bits = [f"code={self.code}"]
        if self.subcode:
            bits.append(f"subcode={self.subcode}")
        if self.err_type:
            bits.append(self.err_type)
        head += f" ({', '.join(bits)})"

        lines = [head, f"Graph: {self.fb_message}"]
        if self.is_rate_limit:
            lines.append("⏳ ติด rate limit ของเพจ — token ปกติ ไม่ต้องแก้อะไร cron รอบหน้าจะลองใหม่เอง")
        elif self.is_missing_page_grant:
            lines.append(grant_fix_steps())
        elif self.is_permission:
            lines.append(permission_fix_steps())
        elif self.is_auth:
            lines.append(auth_fix_steps())
        if self.trace:
            lines.append(f"fbtrace_id={self.trace}")
        return "\n".join(lines)


def auth_fix_steps() -> str:
    return (
        f"🔑 FB Page Access Token ใช้ไม่ได้ — ต้องออก token ใหม่ (retry เองไม่หาย)\n"
        f"token ปัจจุบัน: {token_fingerprint()}\n"
        f"ไล่เช็คตามลำดับ:\n"
        f"  1) บัญชีที่ออก token ยังเป็น admin/editor/moderator ของเพจ {FB_PAGE_ID or '(ไม่ได้ตั้ง FB_PAGE_ID)'} อยู่ไหม\n"
        f"  2) Business ของเพจบังคับ 2FA หรือเปล่า — ถ้าใช่ บัญชีนั้นต้องเปิด 2FA แล้วออก token ใหม่\n"
        f"  3) token หมดอายุ / ถูก revoke (เปลี่ยนรหัสผ่าน, ถอดแอป, เปลี่ยน App Secret) หรือไม่\n"
        f"  4) ค่าที่ใส่เป็น Page token จริงไหม — user token จะโดน error 190 แบบเดียวกันนี้\n"
        f"  5) อัปเดต FB_PAGE_ACCESS_TOKEN ทั้ง GitHub Secrets และ Vercel ให้เป็นตัวเดียวกัน\n"
        f"ขั้นตอนเต็ม: {RUNBOOK}"
    )


def grant_fix_steps() -> str:
    return (
        f"🙅 แอปยังไม่ได้รับสิทธิ์บนเพจ — token ไม่ได้หมดอายุ แต่ออก token ใหม่เฉย ๆ ก็ไม่หาย\n"
        f"token ปัจจุบัน: {token_fingerprint()}\n"
        f"Graph บอกว่าต้องมีอย่างน้อยหนึ่งใน pages_read_engagement / pages_show_list / …\n"
        f"สาเหตุที่เจอบ่อย เรียงจากมากไปน้อย:\n"
        f"  1) ตอนกด consent ไม่ได้ติ๊กเพจ {FB_PAGE_ID or '(ไม่ได้ตั้ง FB_PAGE_ID)'} ในหน้า\n"
        f"     \"เลือกเพจที่จะให้สิทธิ์\" — ให้สิทธิ์แอปแล้ว แต่ให้กับเพจอื่น\n"
        f"  2) token ถูกออกจาก \"คนละแอป\" กับที่ผ่าน App Review ไว้ (เทียบ app_id ด้านล่าง)\n"
        f"  3) บัญชีถอนสิทธิ์แอปทีหลังที่ Settings → Business Integrations → RooGonDee AutoPost\n"
        f"วิธีแก้: กด consent ใหม่โดยติ๊กครบทั้ง {', '.join(MINT_SCOPES)} และเลือกเพจให้ถูก\n"
        f"  python scripts/fb_page_token.py --consent-url     # ได้ลิงก์ consent ที่ scope ครบ\n"
        f"  python scripts/fb_page_token.py --user-token …    # แลก long-lived + แตก Page token\n"
        f"ขั้นตอนเต็ม: {RUNBOOK} (ข้อ 2B)"
    )


def permission_fix_steps() -> str:
    return (
        f"🚫 token ใช้ได้ แต่ขาดสิทธิ์ที่ต้องใช้ ({', '.join(REQUIRED_SCOPES)})\n"
        f"  1) เช็คสถานะ App Review ของแอป (pages_manage_posts / pages_read_engagement)\n"
        f"  2) ออก token ใหม่โดยติ๊ก scope ให้ครบ แล้วแลกเป็น long-lived Page token\n"
        f"ขั้นตอนเต็ม: {RUNBOOK}"
    )


def parse_fb_error(resp: requests.Response, context: str) -> FbError:
    try:
        err = (resp.json() or {}).get("error") or {}
    except ValueError:
        err = {}
    return FbError(
        context=context,
        status=resp.status_code,
        code=int(err.get("code") or 0),
        subcode=int(err.get("error_subcode") or 0),
        err_type=str(err.get("type") or ""),
        message=str(err.get("message") or resp.text[:300] or "(ไม่มีรายละเอียด)"),
        trace=str(err.get("fbtrace_id") or ""),
        raw=resp.text[:500],
    )


def raise_for_fb_error(resp: requests.Response, context: str) -> dict:
    """เช็ค response ของ Graph API — พังก็ raise FbError ที่อ่านรู้เรื่อง, ผ่านก็คืน JSON"""
    if resp.status_code >= 400:
        raise parse_fb_error(resp, context)
    try:
        return resp.json() or {}
    except ValueError:
        raise FbError(
            context=context, status=resp.status_code, code=0, subcode=0,
            err_type="", message=f"response ไม่ใช่ JSON: {resp.text[:200]}",
        )


def graph_post(edge: str, data: dict, *, context: str, timeout: int = 60) -> dict:
    """POST ไปยัง edge ของเพจ (ใส่ access_token ให้อัตโนมัติ)"""
    payload = {**data, "access_token": FB_PAGE_TOKEN}
    resp = requests.post(f"{FB_API}/{edge}", data=payload, timeout=timeout)
    return raise_for_fb_error(resp, context)


# ─── PREFLIGHT ────────────────────────────────────────────────────────────────

@dataclass
class TokenStatus:
    ok: bool
    summary: str
    warnings: list[str] = field(default_factory=list)

    def report(self) -> str:
        lines = [self.summary]
        lines.extend(f"⚠️  {w}" for w in self.warnings)
        return "\n".join(lines)


@dataclass
class TokenFacts:
    """สิ่งที่ /debug_token บอกได้เกี่ยวกับ token — ใช้ได้แม้ตอน GET /me พังไปแล้ว"""
    available: bool = False
    reason: str = ""
    app_id: str = ""
    app_name: str = ""
    token_type: str = ""
    profile_id: str = ""
    is_valid: bool = False
    expires_at: int = 0
    scopes: list[str] = field(default_factory=list)
    granular: dict[str, list[str]] = field(default_factory=dict)

    @property
    def days_left(self) -> int | None:
        if not self.expires_at:
            return None  # 0 = ไม่มีวันหมดอายุ (System User token)
        delta = datetime.fromtimestamp(self.expires_at, tz=timezone.utc) - datetime.now(timezone.utc)
        return delta.days

    @property
    def missing_scopes(self) -> list[str]:
        if not self.scopes:
            return []
        return [s for s in REQUIRED_SCOPES if s not in self.scopes]

    @property
    def wrong_app(self) -> bool:
        return bool(FB_APP_ID and self.app_id and self.app_id != FB_APP_ID)

    def scopes_not_covering_page(self) -> list[str]:
        """
        granular_scopes บอกว่าแต่ละ scope ถูกให้กับ "เพจไหนบ้าง"
        ถ้าเพจของเราไม่อยู่ใน target_ids แปลว่าตอน consent ติ๊กเพจอื่น —
        นี่คือสาเหตุอันดับหนึ่งของ error 190 "before impersonating a user's page"
        (scope ที่ไม่มี target_ids = ให้ครบทุกเพจ ไม่ต้องเตือน)
        """
        if not (FB_PAGE_ID and self.granular):
            return []
        return [
            scope for scope, targets in self.granular.items()
            if scope in REQUIRED_SCOPES + MINT_SCOPES and targets and FB_PAGE_ID not in targets
        ]

    def report_lines(self) -> list[str]:
        """ข้อเท็จจริงล้วน ๆ สำหรับแปะต่อท้าย alert — ไม่มี token จริงหลุดออกไป"""
        if not self.available:
            return [f"ℹ️  {self.reason}"]

        lines = [
            f"🔍 /debug_token: type={self.token_type or '?'} "
            f"app={self.app_name or '?'} ({self.app_id or '?'}) "
            f"profile_id={self.profile_id or '-'} valid={self.is_valid}"
        ]
        days = self.days_left
        if self.expires_at:
            lines.append(f"   หมดอายุ: อีก {days} วัน ({datetime.fromtimestamp(self.expires_at, tz=timezone.utc):%Y-%m-%d})")
        else:
            lines.append("   หมดอายุ: ไม่มีวันหมดอายุ")
        lines.append(f"   scopes: {', '.join(self.scopes) if self.scopes else '(ว่าง — นี่คือปัญหา)'}")

        if self.wrong_app:
            lines.append(
                f"   ⚠️  token ออกจากแอป {self.app_id} แต่ FB_APP_ID ตั้งไว้เป็น {FB_APP_ID} — "
                f"คนละแอปกัน สิทธิ์ที่ผ่าน App Review ไว้จะไม่ถูกใช้"
            )
        if self.token_type and self.token_type.upper() != "PAGE":
            lines.append(f"   ⚠️  นี่เป็น {self.token_type} token ไม่ใช่ Page token")
        if FB_PAGE_ID and self.token_type.upper() == "PAGE" and self.profile_id and self.profile_id != FB_PAGE_ID:
            lines.append(f"   ⚠️  เป็น Page token ของเพจ {self.profile_id} ไม่ใช่ {FB_PAGE_ID}")
        if self.missing_scopes:
            lines.append(f"   ⚠️  ขาด scope: {', '.join(self.missing_scopes)}")
        for scope in self.scopes_not_covering_page():
            lines.append(
                f"   ⚠️  {scope} ถูกให้กับเพจ {', '.join(self.granular.get(scope, [])) or '-'} "
                f"ไม่รวมเพจ {FB_PAGE_ID} — ตอน consent ติ๊กเพจผิด"
            )
        return lines


def debug_token(token: str = "") -> TokenFacts:
    """
    ถาม Graph ว่า token ตัวนี้คืออะไร — ต้องมี FB_APP_ID + FB_APP_SECRET
    เรียกได้ทั้งตอน preflight ผ่านและตอนพัง: /debug_token ใช้ app token ยิง
    เลยยังตอบได้แม้ token ที่กำลังตรวจจะใช้ยิง endpoint อื่นไม่ได้แล้ว
    """
    tok = (token or FB_PAGE_TOKEN).strip()
    if not tok:
        return TokenFacts(reason="ไม่มี FB_PAGE_ACCESS_TOKEN ให้ตรวจ")
    if not (FB_APP_ID and FB_APP_SECRET):
        return TokenFacts(
            reason=(
                "ตั้ง FB_APP_ID + FB_APP_SECRET ใน GitHub Secrets เพิ่ม แล้ว alert รอบหน้าจะบอกได้เลยว่า "
                f"token เป็นของแอปไหน มี scope อะไร และเหลืออายุกี่วัน ({RUNBOOK})"
            )
        )

    try:
        resp = requests.get(
            f"{FB_API}/debug_token",
            params={"input_token": tok, "access_token": f"{FB_APP_ID}|{FB_APP_SECRET}"},
            timeout=30,
        )
        data = (resp.json() or {}).get("data") or {}
    except (requests.RequestException, ValueError) as e:
        return TokenFacts(reason=f"เรียก /debug_token ไม่สำเร็จ: {e}")

    if not data:
        return TokenFacts(reason="/debug_token ไม่คืนข้อมูล — token อาจถูกออกจากแอปอื่น")

    granular = {
        str(g.get("scope") or ""): [str(t) for t in (g.get("target_ids") or [])]
        for g in (data.get("granular_scopes") or [])
    }
    return TokenFacts(
        available=True,
        app_id=str(data.get("app_id") or ""),
        app_name=str(data.get("application") or ""),
        token_type=str(data.get("type") or ""),
        profile_id=str(data.get("profile_id") or data.get("user_id") or ""),
        is_valid=bool(data.get("is_valid")),
        expires_at=int(data.get("expires_at") or 0),
        scopes=[str(x) for x in (data.get("scopes") or [])],
        granular=granular,
    )


def _debug_token_checks(status_warnings: list[str]) -> None:
    """เติม warning ตอน preflight ผ่าน — token ใช้ได้วันนี้ แต่จะพังวันไหน"""
    facts = debug_token()
    if not facts.available:
        return

    days = facts.days_left
    if days is not None and days <= 7:
        status_warnings.append(
            f"token จะหมดอายุใน {days} วัน — ออก long-lived Page token ใหม่ก่อน cron พัง ({RUNBOOK})"
        )
    if facts.missing_scopes:
        status_warnings.append(f"token ขาด scope: {', '.join(facts.missing_scopes)}")
    if facts.wrong_app:
        status_warnings.append(
            f"token ออกจากแอป {facts.app_id} ไม่ใช่ {FB_APP_ID} ที่ตั้งไว้ — เช็คว่าใช้แอปถูกตัว"
        )
    for scope in facts.scopes_not_covering_page():
        status_warnings.append(f"{scope} ไม่ครอบคลุมเพจ {FB_PAGE_ID} — ตอน consent ติ๊กเพจไม่ครบ")


def preflight_page_token() -> TokenStatus:
    """
    ยิง GET /me ด้วย Page token เพื่อดูว่ายังโพสต์ในนามเพจได้อยู่ไหม
    เรียกก่อนงานหนักเสมอ — auth พังแล้วไม่มีประโยชน์ที่จะ gen caption/รูปต่อ
    """
    warnings: list[str] = []

    if not FB_PAGE_ID or not FB_PAGE_TOKEN:
        missing = " และ ".join(
            n for n, v in (("FB_PAGE_ID", FB_PAGE_ID), ("FB_PAGE_ACCESS_TOKEN", FB_PAGE_TOKEN)) if not v
        )
        return TokenStatus(False, f"❌ ขาด env {missing}\nดู {RUNBOOK}")

    try:
        resp = requests.get(
            f"{FB_API}/me",
            params={"fields": "id,name,category", "access_token": FB_PAGE_TOKEN},
            timeout=30,
        )
    except requests.RequestException as e:
        # เครือข่ายพังไม่ใช่ปัญหา token — ปล่อยให้ไปเจอ error จริงตอนยิงจริง
        return TokenStatus(True, f"⚠️  เช็ค token ไม่ได้ (network: {e}) — ทำงานต่อ")

    if resp.status_code >= 400:
        err = parse_fb_error(resp, "preflight GET /me")
        # /debug_token ยิงด้วย app token เลยยังตอบได้แม้ GET /me เพิ่งพัง —
        # ไม่งั้น alert จะได้แค่ "ไล่เช็ค 5 ข้อ" โดยไม่มีข้อมูลว่าเช็คแล้วเจออะไร
        lines = [f"❌ {err.describe()}"] + debug_token().report_lines()
        return TokenStatus(False, "\n".join(lines))

    try:
        me = resp.json() or {}
    except ValueError:
        return TokenStatus(True, "⚠️  preflight ได้ response ที่ไม่ใช่ JSON — ทำงานต่อ")

    me_id   = str(me.get("id") or "")
    me_name = str(me.get("name") or "?")

    if not me.get("category"):
        return TokenStatus(
            False,
            f"❌ FB_PAGE_ACCESS_TOKEN เป็น user token ของ \"{me_name}\" ไม่ใช่ Page token\n"
            f"โพสต์ในนามเพจไม่ได้ (Graph จะตอบ code 190 \"must be an administrator…\")\n"
            f"{auth_fix_steps()}",
        )

    if me_id != FB_PAGE_ID:
        return TokenStatus(
            False,
            f"❌ token เป็นของเพจ \"{me_name}\" (id={me_id}) แต่ FB_PAGE_ID ตั้งไว้เป็น {FB_PAGE_ID}\n"
            f"แก้ให้ตรงกันอย่างใดอย่างหนึ่ง แล้วอัปเดต secret ทั้ง GitHub และ Vercel\n"
            f"ดู {RUNBOOK}",
        )

    _debug_token_checks(warnings)
    return TokenStatus(True, f"🔑 token ok — เพจ \"{me_name}\" ({me_id})", warnings)


def main() -> int:
    print(f"🔎 ตรวจ Facebook Page token — Graph {GRAPH_VERSION}")
    print(f"   FB_PAGE_ID={FB_PAGE_ID or '(ไม่ได้ตั้ง)'}")
    print(f"   token={token_fingerprint()}")
    if not (FB_APP_ID and FB_APP_SECRET):
        print("   ℹ️ ไม่มี FB_APP_ID/FB_APP_SECRET — ข้ามการเช็ควันหมดอายุและ scope")

    status = preflight_page_token()
    print(status.report())

    if not status.ok or status.warnings:
        try:
            from notify import notify as _notify
        except ImportError:
            return 0 if status.ok else 1
        icon = "✅" if status.ok else "❌"
        # 1900 ไม่ใช่ 1500 — เคส grant มีทั้งขั้นตอนแก้และบรรทัด /debug_token
        # ตัดที่ 1500 แล้วขั้นตอนแก้จะหายไปครึ่งท่อน (Discord เองตัดที่ 2000 อยู่แล้ว)
        _notify(f"{icon} รู้ก่อนดี FB token check\n{status.report()[:1900]}")

    return 0 if status.ok else 1


if __name__ == "__main__":
    sys.exit(main())
