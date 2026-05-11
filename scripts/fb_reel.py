"""
roogondee-autopost: fb_reel.py
รู้ก่อนดี (RuGonDee) — Facebook Page Reel daily poster
หมุน 3 verticals (glp1/std/ckd) → gen Seedance video 8 วิ + audio
แล้วโพสต์เป็น FB Reel ผ่าน Graph API resumable upload.

Required env:
  ANTHROPIC_API_KEY                 (Claude Haiku — script + visual prompt)
  KIE_API_KEY                       (kie.ai — Seedance 1.5 Pro)
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET
  FB_PAGE_ID
  FB_PAGE_ACCESS_TOKEN              ต้องมี pages_manage_posts
  SITE_BASE_URL                     (default https://www.roogondee.com)

Optional env:
  REEL_FORCE_SERVICE=glp1|std|ckd   override การหมุนวัน
  REEL_DRY_RUN=1                    skip Seedance + FB API, gen prompt อย่างเดียว
  REEL_LOCAL_ONLY=1                 gen video แต่ไม่โพสต์ FB (ดูคุณภาพก่อน)
  REEL_DURATION=8                   ความยาวคลิป 4/8/12 วิ (default 8)
  REEL_RESOLUTION=1080p             480p/720p/1080p (default 1080p)
"""

import os
import json
import re
import sys
import time
import urllib.parse
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
import anthropic
from supabase import create_client

from notify import notify as _notify

# ─── CONFIG ────────────────────────────────────────────────────────────────────

ANTHROPIC_KEY  = os.environ["ANTHROPIC_API_KEY"]
KIE_API_KEY    = os.environ.get("KIE_API_KEY", "").strip()
SUPABASE_URL   = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_SECRET"]
FB_PAGE_ID     = os.environ.get("FB_PAGE_ID", "").strip()
FB_PAGE_TOKEN  = os.environ.get("FB_PAGE_ACCESS_TOKEN", "").strip()
SITE_BASE      = os.environ.get("SITE_BASE_URL", "https://www.roogondee.com").rstrip("/")

FORCE_SERVICE  = os.environ.get("REEL_FORCE_SERVICE", "").strip().lower()
DRY_RUN        = os.environ.get("REEL_DRY_RUN", "0") == "1"
LOCAL_ONLY     = os.environ.get("REEL_LOCAL_ONLY", "0") == "1"
DURATION       = int(os.environ.get("REEL_DURATION", "8"))
RESOLUTION     = os.environ.get("REEL_RESOLUTION", "1080p").strip()

BKK_TZ    = ZoneInfo("Asia/Bangkok")
TODAY     = datetime.now(BKK_TZ).date()
TODAY_STR = TODAY.strftime("%Y-%m-%d")

FB_API   = "https://graph.facebook.com/v19.0"
KIE_API  = "https://api.kie.ai/api/v1/jobs"

# ─── SERVICE ROTATION ──────────────────────────────────────────────────────────

ROTATION = ["glp1", "std", "ckd"]

SERVICE_META: dict[str, dict] = {
    "glp1": {
        "label":         "GLP-1 & ลดน้ำหนัก",
        "voucher_hint":  "ตรวจ FBS+HbA1c ฟรี (มูลค่า 500฿)",
        "scene_hint":    ("Healthy active Thai woman in her 30s walking briskly in a sunlit park, "
                           "fresh fruits and a glass of water on a wooden table in foreground, "
                           "mint green and warm white color palette, clean minimalist healthcare aesthetic, "
                           "shallow depth of field, vertical 9:16, cinematic, no text overlay, no logos"),
        "audio_hint":    "uplifting subtle ambient music, no dialogue",
    },
    "std": {
        "label":         "ตรวจสุขภาพทางเพศ",
        "voucher_hint":  "ตรวจ HIV+ซิฟิลิส ฟรี รู้ผล 1 ชม.",
        "scene_hint":    ("Modern medical clinic interior, soft teal-and-white tones, "
                           "Thai young adult professional in casual clothing checking a phone with a calm relieved expression, "
                           "discrete and respectful framing, blurred clinic equipment in background, "
                           "vertical 9:16, cinematic, no text overlay, no logos"),
        "audio_hint":    "calm reassuring ambient pad, no dialogue",
    },
    "ckd": {
        "label":         "ดูแลไต CKD",
        "voucher_hint":  "ตรวจปัสสาวะวัดโปรตีนรั่ว ฟรี",
        "scene_hint":    ("Calm hospital consultation room, Thai senior man holding a glass of water near a window, "
                           "soft blue and white tones, nephrology brochure on table, kind nurse blurred in background, "
                           "vertical 9:16, cinematic, warm caring atmosphere, no text overlay, no logos"),
        "audio_hint":    "warm gentle ambient music, no dialogue",
    },
}

# วน 4 รูปแบบ reel — สไตล์ภาพต่างกัน
REEL_TYPES = ["lifestyle", "clinic_visit", "before_after_mood", "voucher_promo"]

REEL_TYPE_BRIEF = {
    "lifestyle":        "ฉาก lifestyle ที่สะท้อนผลลัพธ์เชิงบวก (ออกกำลังกาย / กินดี / มั่นใจ)",
    "clinic_visit":     "ฉากผู้ป่วยเข้ารับการตรวจที่คลินิก บรรยากาศอุ่นใจ ไม่น่ากลัว",
    "before_after_mood":"แสดงอารมณ์ 'รู้ผลแล้วโล่งใจ' หรือ 'รู้ก่อนป้องกันได้'",
    "voucher_promo":    "เน้นโปรของวอเชอร์ฟรี ใส่ภาพหมอ/พยาบาลกับเอกสาร voucher",
}


def pick_service():
    if FORCE_SERVICE and FORCE_SERVICE in ROTATION:
        return FORCE_SERVICE
    return ROTATION[TODAY.toordinal() % len(ROTATION)]


def pick_reel_type():
    return REEL_TYPES[TODAY.toordinal() % len(REEL_TYPES)]


# ─── SUPABASE ──────────────────────────────────────────────────────────────────

def get_sb():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def already_posted_today(service: str) -> bool:
    try:
        sb = get_sb()
        res = (
            sb.table("fb_reels")
            .select("id")
            .eq("posted_date", TODAY_STR)
            .eq("service", service)
            .eq("status", "posted")
            .limit(1)
            .execute()
        )
        return bool(res.data)
    except Exception as e:
        print(f"  ⚠️ ตรวจซ้ำไม่ได้ (สมมติว่ายังไม่โพสต์): {e}")
        return False


def log_reel(record: dict) -> None:
    try:
        sb = get_sb()
        sb.table("fb_reels").insert(record).execute()
    except Exception as e:
        print(f"  ⚠️ log reel failed: {e}")


def upload_video_to_storage(video_bytes: bytes, key: str) -> str:
    sb = get_sb()
    file_path = f"fb-reels/{key}.mp4"
    sb.storage.from_("images").upload(
        file_path,
        video_bytes,
        {"content-type": "video/mp4", "upsert": "true"},
    )
    return sb.storage.from_("images").get_public_url(file_path)


# ─── CLAUDE: GENERATE SCRIPT + VISUAL PROMPT ──────────────────────────────────

SYSTEM_PROMPT = """คุณเป็นแอดมินเพจสุขภาพ "รู้ก่อนดี (รู้งี้)" / roogondee.com
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร
กำลังสร้าง Facebook Reel สั้น (ภาพ 8 วินาที + เสียง ambient)
ภาพเป็น AI generation จึงต้องบรรยายเป็น **ภาษาอังกฤษ** ที่ละเอียด
ส่วน caption + headline เขียนเป็นภาษาไทย กระชับ คล้ายเพื่อนคุยให้ฟัง

ส่งคืนเป็น JSON เท่านั้น (ไม่มี markdown fence) ตาม schema:
{
  "visual_prompt": "บรรยายฉากภาพเป็นภาษาอังกฤษ 30-80 คำ — รวมตัวละคร, สถานที่, การเคลื่อนไหวกล้อง, mood/lighting, อารมณ์, palette สี",
  "headline":      "ข้อความ hook ภาษาไทยสำหรับ caption บรรทัดแรก 4-10 คำ",
  "caption":       "caption ฉบับเต็มลง FB Reel 2-4 บรรทัด ≤320 ตัวอักษร พร้อม CTA ทักไลน์ @roogondee + ลิงก์ roogondee.com",
  "cta":           "ประโยค CTA สั้น ≤6 คำ"
}

กฎ:
- visual_prompt ต้องเป็น English อย่างเดียว เพื่อส่งให้ Seedance AI
- caption + headline + cta เป็นไทยอย่างเดียว
- caption ใส่ emoji ได้ไม่เกิน 2 ตัว
- ห้าม markdown ทุกฟิลด์
- ห้ามคำชวนตัดสินรูปร่าง (อ้วน/พุงยื่น/น่าเกลียด)
- visual_prompt ห้ามมี text overlay, logo, watermark
- visual_prompt ห้ามมีคนเปลือยกาย ไม่ว่าบริการอะไร
- ลิงก์ใน caption ใช้ roogondee.com หรือ LINE @roogondee เท่านั้น"""


def _client():
    return anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def generate_script(service: str, reel_type: str) -> dict:
    meta  = SERVICE_META[service]
    brief = REEL_TYPE_BRIEF[reel_type]

    user = f"""สร้าง Facebook Reel สำหรับ vertical: {meta['label']}
รูปแบบ reel: {reel_type} — {brief}
ข้อมูลโปร: {meta['voucher_hint']}
สถานที่ตรวจ: W Medical Hospital สมุทรสาคร
ลิงก์เว็บ: {SITE_BASE}

base scene (ใช้เป็นแรงบันดาลใจ ปรับได้):
{meta['scene_hint']}
audio brief: {meta['audio_hint']}

ข้อสำคัญ:
- visual_prompt ต้องสะท้อน reel_type "{reel_type}" ไม่ใช่ scene เดิม ๆ
- caption ต้องเป็นไทย ชวนคุย ไม่ขายตรง
- ส่งคืน JSON ตาม schema เท่านั้น"""

    last_err: Exception | None = None
    for attempt in range(3):
        try:
            msg = _client().messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1000,
                messages=[{"role": "user", "content": user}],
                system=SYSTEM_PROMPT,
            )
            text = msg.content[0].text.strip()
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```\s*$", "", text)
            data = json.loads(text)
            for key in ("visual_prompt", "headline", "caption", "cta"):
                if not isinstance(data.get(key), str) or not data[key].strip():
                    raise ValueError(f"missing field: {key}")
                data[key] = data[key].strip()
            return data
        except Exception as e:
            last_err = e
            print(f"  ↻ script attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** attempt)

    raise RuntimeError(f"generate_script failed: {last_err}")


# ─── SEEDANCE (kie.ai) ────────────────────────────────────────────────────────

SEEDANCE_MODEL = "bytedance/seedance-1.5-pro"


def seedance_create(visual_prompt: str, audio_hint: str) -> str:
    """createTask → returns taskId"""
    full_prompt = f"{visual_prompt}\n\nAudio: {audio_hint}"
    payload = {
        "model": SEEDANCE_MODEL,
        "input": {
            "prompt":         full_prompt,
            "aspect_ratio":   "9:16",
            "resolution":     RESOLUTION,
            "duration":       DURATION,
            "generate_audio": True,
            "fixed_lens":     False,
        },
    }
    resp = requests.post(
        f"{KIE_API}/createTask",
        headers={
            "Authorization": f"Bearer {KIE_API_KEY}",
            "Content-Type":  "application/json",
        },
        json=payload,
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Seedance createTask {resp.status_code}: {resp.text[:300]}")
    body = resp.json()
    if body.get("code") != 200:
        raise RuntimeError(f"Seedance createTask err: {body}")
    task_id = body["data"]["taskId"]
    print(f"   taskId={task_id}")
    return task_id


def seedance_poll(task_id: str, max_wait_sec: int = 600) -> str:
    """Poll until success — returns video URL"""
    start = time.time()
    backoff = 6
    while time.time() - start < max_wait_sec:
        resp = requests.get(
            f"{KIE_API}/recordInfo",
            headers={"Authorization": f"Bearer {KIE_API_KEY}"},
            params={"taskId": task_id},
            timeout=30,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Seedance recordInfo {resp.status_code}: {resp.text[:200]}")
        data = resp.json().get("data", {})
        state = data.get("state", "unknown")
        progress = data.get("progress", 0)
        elapsed = int(time.time() - start)
        print(f"   [{elapsed:3}s] state={state} progress={progress}%")

        if state == "success":
            result_json = data.get("resultJson") or "{}"
            try:
                result = json.loads(result_json) if isinstance(result_json, str) else result_json
            except json.JSONDecodeError:
                raise RuntimeError(f"Seedance resultJson parse error: {result_json[:200]}")
            urls = result.get("resultUrls") or []
            if not urls:
                raise RuntimeError(f"Seedance success but no resultUrls: {result}")
            return urls[0]

        if state == "fail":
            raise RuntimeError(f"Seedance failed: {data.get('failMsg') or data.get('failCode')}")

        time.sleep(backoff)
        backoff = min(backoff + 2, 15)

    raise TimeoutError(f"Seedance polling timeout after {max_wait_sec}s")


def download_video(url: str) -> bytes:
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    return resp.content


# ─── FACEBOOK REELS API ───────────────────────────────────────────────────────

def fb_reel_start() -> tuple[str, str]:
    """Phase 1 — request upload session. Returns (video_id, upload_url)."""
    resp = requests.post(
        f"{FB_API}/{FB_PAGE_ID}/video_reels",
        data={
            "upload_phase": "start",
            "access_token": FB_PAGE_TOKEN,
        },
        timeout=30,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"FB reel start {resp.status_code}: {resp.text[:300]}")
    body = resp.json()
    return body["video_id"], body["upload_url"]


def fb_reel_upload(upload_url: str, public_video_url: str, file_size: int) -> None:
    """Phase 2 — upload via hosted file_url. Server fetches our Supabase URL."""
    resp = requests.post(
        upload_url,
        headers={
            "Authorization": f"OAuth {FB_PAGE_TOKEN}",
            "file_url":      public_video_url,
            "file_size":     str(file_size),
        },
        timeout=120,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"FB reel upload {resp.status_code}: {resp.text[:300]}")
    body = resp.json()
    if not body.get("success"):
        raise RuntimeError(f"FB reel upload not success: {body}")


def fb_reel_finish(video_id: str, description: str) -> str:
    """Phase 3 — publish. Returns post_id (or video_id)."""
    resp = requests.post(
        f"{FB_API}/{FB_PAGE_ID}/video_reels",
        data={
            "video_id":     video_id,
            "upload_phase": "finish",
            "video_state":  "PUBLISHED",
            "description":  description,
            "access_token": FB_PAGE_TOKEN,
        },
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"FB reel finish {resp.status_code}: {resp.text[:300]}")
    body = resp.json()
    return body.get("post_id") or video_id


# ─── COST ESTIMATE ────────────────────────────────────────────────────────────

# kie.ai Seedance 1.5 Pro: ~$0.05 / 5 sec at 1080p (rough)
def estimate_cost_usd(duration_sec: int, resolution: str) -> float:
    base = 0.01 * duration_sec  # ~$0.01/sec at 1080p
    if resolution == "720p":
        base *= 0.7
    elif resolution == "480p":
        base *= 0.5
    return round(base, 4)


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main() -> int:
    print(f"🎬 รู้ก่อนดี FB Reel — {TODAY_STR}")

    if not DRY_RUN and not LOCAL_ONLY:
        if not FB_PAGE_ID or not FB_PAGE_TOKEN:
            print("❌ ขาด FB_PAGE_ID หรือ FB_PAGE_ACCESS_TOKEN")
            return 1
    if not DRY_RUN and not KIE_API_KEY:
        print("❌ ขาด KIE_API_KEY (สมัครที่ kie.ai)")
        return 1

    service   = pick_service()
    reel_type = pick_reel_type()
    print(f"🌿 service={service}  reel_type={reel_type}  (rotation={ROTATION})")

    if not DRY_RUN and not LOCAL_ONLY and already_posted_today(service):
        print(f"⏭  วันนี้ ({TODAY_STR}) โพสต์ Reel {service} แล้ว — ข้าม")
        return 0

    try:
        print("🤖 generating script + visual prompt...")
        script = generate_script(service, reel_type)
        print(f"   visual : {script['visual_prompt'][:120]}...")
        print(f"   headline: {script['headline']}")
        print(f"   cta     : {script['cta']}")

        if DRY_RUN:
            print("💧 DRY_RUN: ข้าม Seedance + FB API")
            print("---- caption ----")
            print(script["caption"])
            print("-----------------")
            return 0

        print(f"🎥 Seedance: createTask ({DURATION}s @ {RESOLUTION})...")
        audio_hint = SERVICE_META[service]["audio_hint"]
        task_id = seedance_create(script["visual_prompt"], audio_hint)

        print("⏳ Seedance: polling (อาจรอ 1-5 นาที)...")
        video_url_remote = seedance_poll(task_id)
        print(f"   ✓ video ready: {video_url_remote[:80]}...")

        print("⬇️  download video...")
        video_bytes = download_video(video_url_remote)
        print(f"   size: {len(video_bytes) / 1024 / 1024:.2f} MB")

        if LOCAL_ONLY:
            out_path = f"/tmp/fb-reel-{TODAY_STR}-{service}.mp4"
            with open(out_path, "wb") as f:
                f.write(video_bytes)
            print(f"💾 LOCAL_ONLY: ไม่โพสต์ FB — วิดีโออยู่ที่ {out_path}")
            print("---- caption ----")
            print(script["caption"])
            print("-----------------")
            return 0

        print("☁️  upload video to Supabase Storage...")
        key = f"{TODAY_STR}-{service}-{int(time.time())}"
        public_url = upload_video_to_storage(video_bytes, key)
        print(f"   {public_url}")

        print("📤 FB Reel: phase 1 — start upload session...")
        fb_video_id, fb_upload_url = fb_reel_start()
        print(f"   video_id={fb_video_id}")

        print("📤 FB Reel: phase 2 — upload via file_url...")
        fb_reel_upload(fb_upload_url, public_url, len(video_bytes))

        # FB ต้องประมวลผลวิดีโอก่อน finish — รอ ~30s
        print("⏳ FB processing...")
        time.sleep(30)

        print("📤 FB Reel: phase 3 — finish + publish...")
        post_id = fb_reel_finish(fb_video_id, script["caption"])
        print(f"   post_id={post_id}")

        cost = estimate_cost_usd(DURATION, RESOLUTION)
        log_reel({
            "posted_date":   TODAY_STR,
            "service":       service,
            "reel_type":     reel_type,
            "fb_video_id":   fb_video_id,
            "fb_post_id":    post_id,
            "headline":      script["headline"],
            "caption":       script["caption"],
            "visual_prompt": script["visual_prompt"],
            "video_url":     public_url,
            "duration_sec":  DURATION,
            "provider":      SEEDANCE_MODEL,
            "cost_usd":      cost,
            "status":        "posted",
        })

        _notify(
            f"🎬 รู้ก่อนดี FB Reel โพสต์แล้ว ({SERVICE_META[service]['label']})\n"
            f"{script['headline']}\n"
            f"~${cost} • {DURATION}s • post_id={post_id}"
        )
        print(f"✅ done (~${cost})")
        return 0

    except Exception as e:
        err = str(e)
        print(f"❌ Error: {err}")
        _notify(f"❌ รู้ก่อนดี FB Reel Error ({service}): {err[:300]}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
