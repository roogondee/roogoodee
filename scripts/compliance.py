# -*- coding: utf-8 -*-
"""
compliance.py — Forbidden-words linter for Men's Health vertical content.

Used by autopost.py and fb_caption.py to gate Claude-generated content
before it gets published, to comply with Thai medical advertising law:
- พ.ร.บ.ยา 2510 ม.88, 89, 90(4)  — no drug names, no give-away framing
- พ.ร.บ.สถานพยาบาล 2541 ม.38     — no exaggerated claims
- ข้อบังคับแพทยสภา (โฆษณา)        — no testimonials, no cure claims

Also exposes Thai-language QA (check_thai_language / review_thai_with_llm)
to catch hallucinated/malformed Thai words from the caption-gen model
before they hit the FB Page or Page Stories.
"""

import json
import os
import re
from typing import Iterable, Tuple

# Drug brand/generic names that cannot appear in consumer-facing content.
FORBIDDEN_DRUG_NAMES: tuple[str, ...] = (
    # ED drugs
    "viagra", "cialis", "levitra", "stendra",
    "sildenafil", "tadalafil", "vardenafil", "avanafil",
    # TRT brand names
    "nebido", "sustanon", "testogel", "androgel", "andriol",
    "testoviron", "depo-testosterone",
    # GLP-1 (allowed for /glp1 only — flag if seen in mens content)
    # ~ keep separate list per vertical if needed
)

# Marketing claims banned by Thai medical advertising law / กพ.แพทยสภา
FORBIDDEN_OVERCLAIM: tuple[str, ...] = (
    "รักษาหายขาด", "หายขาด", "การันตี", "รับประกัน",
    "100%", "ดีที่สุด", "อันดับ 1", "อันดับหนึ่ง",
    "ปลอดภัย 100%", "ไม่มีผลข้างเคียง",
)

# Sexual-performance words that trigger Meta/TikTok ad policy and
# violate medical advertising rules in Thailand.
FORBIDDEN_SEXUAL: tuple[str, ...] = (
    "เพิ่มขนาด", "ขยายขนาด", "ขนาดใหญ่ขึ้น",
    "อึดทน", "ทน 30 นาที", "ทน 1 ชั่วโมง",
    "แข็งทันที", "แข็งทน", "ปลุกเซ็กส์",
    "เพิ่มความใหญ่", "เพิ่มสมรรถภาพ",
)

# Words/phrases that imply giving prescription drugs as marketing premium.
# Banned by พ.ร.บ.ยา ม.90(4).
FORBIDDEN_GIVEAWAY: tuple[str, ...] = (
    "แจกยา", "ยาฟรี", "ฟรียา", "ทดลองยา", "ลองใช้ยา",
    "trial pack", "ยาทดลอง", "sample ยา", "voucher แลกยา",
    "ฟรีค่ายา",
)

# Phrases that MUST appear at least once in mens content (compliance ID).
REQUIRED_PHRASES_MENS: tuple[str, ...] = (
    "ภายใต้การดูแลของแพทย์",
    "ภายใต้ดุลยพินิจของแพทย์",
    "ดูแลโดยแพทย์",
    "การดูแลของแพทย์",
)


def check_mens_compliance(content: str) -> Tuple[bool, list[str]]:
    """
    Check Claude-generated mens content against forbidden-words list and
    required phrases.

    Returns (ok, issues). `ok = True` only when:
      - No forbidden word appears
      - At least one REQUIRED_PHRASES_MENS phrase appears
    """
    if not content:
        return False, ["เนื้อหาว่าง"]

    issues: list[str] = []
    text_lower = content.lower()

    for word in FORBIDDEN_DRUG_NAMES:
        if word in text_lower:
            issues.append(f"พบชื่อยาต้องห้าม: {word}")

    for phrase in FORBIDDEN_OVERCLAIM:
        if phrase.lower() in text_lower:
            issues.append(f"พบคำโฆษณาเกินจริง: {phrase}")

    for phrase in FORBIDDEN_SEXUAL:
        if phrase.lower() in text_lower:
            issues.append(f"พบคำเชิงเพศต้องห้าม: {phrase}")

    for phrase in FORBIDDEN_GIVEAWAY:
        if phrase.lower() in text_lower:
            issues.append(f"พบคำสื่อแจกยา (ผิด พ.ร.บ.ยา ม.90(4)): {phrase}")

    if not any(req in content for req in REQUIRED_PHRASES_MENS):
        issues.append("ขาดประโยคบังคับ: 'ภายใต้การดูแลของแพทย์' หรือใกล้เคียง")

    return len(issues) == 0, issues


def check_caption_compliance(caption: str, service: str) -> Tuple[bool, list[str]]:
    """
    Lighter check for FB/social captions — required phrase not enforced
    (caption too short to fit). Forbidden words still blocked.
    """
    if service != "mens":
        return True, []

    if not caption:
        return False, ["caption ว่าง"]

    issues: list[str] = []
    text_lower = caption.lower()

    for word in FORBIDDEN_DRUG_NAMES:
        if word in text_lower:
            issues.append(f"caption: พบชื่อยา {word}")

    for phrase in FORBIDDEN_OVERCLAIM:
        if phrase.lower() in text_lower:
            issues.append(f"caption: พบคำเกินจริง {phrase}")

    for phrase in FORBIDDEN_SEXUAL:
        if phrase.lower() in text_lower:
            issues.append(f"caption: พบคำเชิงเพศ {phrase}")

    for phrase in FORBIDDEN_GIVEAWAY:
        if phrase.lower() in text_lower:
            issues.append(f"caption: พบคำแจกยา {phrase}")

    return len(issues) == 0, issues


# ─── THAI LANGUAGE QA ─────────────────────────────────────────────────────────
#
# Two-layer check for caption/story text before publishing:
#   (1) SUSPICIOUS_THAI_WORDS — fast deterministic blocklist of Thai
#       hallucinations / typos the caption model has produced. Add to this
#       list when a new bad word is spotted in production.
#   (2) review_thai_with_llm() — optional second-pass Claude review that
#       flags malformed Thai words. Use when blocklist isn't sure.
#
# Examples of the bug class this catches:
#   2026-05-11 — Haiku produced "ดักแจง" in a CKD caption (Pornpat reported).
#                Correct word: "ดักจับ" / "ตรวจเจอ" / "รู้ทัน".

SUSPICIOUS_THAI_WORDS: tuple[str, ...] = (
    "ดักแจง",     # 2026-05-11 CKD caption — should be ดักจับ/ตรวจเจอ
)

# Medical/marketing jargon that confuses consumer readers. Flagged in
# any caption (not just mens) so the retry loop forces Claude to rewrite
# in plain Thai. 2026-05-16: Pornpat circled "กลุ่มเมตาบอลิก/กลุ่มNCDs"
# in a LINE broadcast preview — readers don't know the term.
JARGON_TERMS: tuple[str, ...] = (
    "เมตาบอลิก",
    "metabolic syndrome",
    "comorbidity",
    "comorbidities",
)


def check_jargon(text: str) -> Tuple[bool, list[str]]:
    """
    Flag medical jargon that consumer readers don't understand. Returns
    (ok, issues). Used as a retry trigger in caption-gen pipelines —
    not a hard publish block (Claude usually fixes on retry).
    """
    if not text:
        return True, []
    issues: list[str] = []
    text_lower = text.lower()
    for term in JARGON_TERMS:
        if term.lower() in text_lower:
            issues.append(f"พบศัพท์แพทย์ยาก: {term}")
    return len(issues) == 0, issues


def check_thai_language(text: str) -> Tuple[bool, list[str]]:
    """
    Layer 1 — fast deterministic check.

    Flags:
      - Empty text
      - Any token in SUSPICIOUS_THAI_WORDS
      - Thai char ratio < 30% (Thai post should be majority Thai)

    Medical jargon (CKD, eGFR, GLP-1, HIV…) is NOT flagged — only words
    that have been observed as Claude hallucinations.
    """
    if not text or not text.strip():
        return False, ["text ว่าง"]

    issues: list[str] = []
    for bad in SUSPICIOUS_THAI_WORDS:
        if bad in text:
            issues.append(f"พบคำเพี้ยน/สะกดผิด: {bad}")

    thai = sum(1 for c in text if "฀" <= c <= "๿")
    latin = sum(1 for c in text if c.isascii() and c.isalpha())
    if thai + latin >= 40 and thai / (thai + latin) < 0.30:
        issues.append(f"อักษรไทยน้อยเกินไป (ไทย {thai} / ลาติน {latin})")

    return len(issues) == 0, issues


def review_thai_with_llm(text: str, anthropic_client=None) -> Tuple[bool, list[str]]:
    """
    Layer 2 — Claude Haiku second-pass review.

    Asks Haiku to flag Thai words that are clearly misspelled or aren't
    real Thai words. Returns (ok, issues). Whitelists common medical/brand
    English (CKD, eGFR, GLP-1, HIV, LINE, roogondee, W Medical, …) so we
    don't false-positive on jargon.

    Cost: ~$0.0005 per caption. Skipped entirely if ANTHROPIC_API_KEY missing
    or anthropic SDK can't be imported — returns ok=True so caller doesn't
    block on a non-essential check.
    """
    if not text or not text.strip():
        return False, ["text ว่าง"]

    try:
        if anthropic_client is None:
            import anthropic
            key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
            if not key:
                return True, []
            anthropic_client = anthropic.Anthropic(api_key=key)
    except Exception:
        return True, []

    system = (
        "คุณเป็นบรรณาธิการพิสูจน์อักษรภาษาไทย ตรวจคำที่สะกดผิดหรือคำที่ไม่มีอยู่จริง "
        "ในภาษาไทย เช่นคำที่ AI ประดิษฐ์ขึ้นเอง (hallucination) "
        "ห้าม flag คำทับศัพท์/ศัพท์แพทย์ที่เป็นภาษาอังกฤษ "
        "เช่น CKD, eGFR, GLP-1, HIV, LINE, roogondee, Stage, W Medical, creatinine, "
        "Syphilis, FBS, HbA1c — คำพวกนี้ถือว่าถูกต้อง "
        "ห้าม flag ชื่อยี่ห้อ ชื่อจังหวัด ชื่อคน "
        "ตอบเป็น JSON เท่านั้น schema: "
        '{"ok": true|false, "bad_words": ["คำ1", "คำ2"]} '
        "ถ้าไม่มีคำผิดให้ตอบ {\"ok\": true, \"bad_words\": []}"
    )
    user = f"ตรวจข้อความนี้ว่ามีคำไทยที่สะกดผิดหรือไม่มีอยู่จริงไหม:\n\n{text}"

    try:
        msg = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": user}],
            system=system,
        )
        raw = msg.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```\s*$", "", raw)
        data = json.loads(raw)
    except Exception as e:
        # LLM review is best-effort — if Haiku returns garbage, don't block.
        print(f"  ⚠️ review_thai_with_llm failed (skip): {e}")
        return True, []

    bad = [w for w in data.get("bad_words", []) if isinstance(w, str) and w.strip()]
    bad = [w for w in bad if w in text]  # only trust words that actually appear

    if data.get("ok") and not bad:
        return True, []
    if not bad:
        return True, []  # ok=False but no concrete words — don't block
    return False, [f"LLM ทักว่าคำเพี้ยน: {w}" for w in bad]


def check_caption_language(text: str, use_llm: bool = True) -> Tuple[bool, list[str]]:
    """
    Combined caption language gate.

    Layer 1 (blocklist) always runs.
    Layer 2 (LLM) runs only if Layer 1 passes and use_llm=True.
    Layer 2 failures are advisory — caller decides whether to retry.
    """
    ok1, issues1 = check_thai_language(text)
    if not ok1:
        return False, issues1
    if not use_llm:
        return True, []
    return review_thai_with_llm(text)


# CLI for standalone testing: python scripts/compliance.py path/to/content.txt
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("usage: compliance.py <content-file>", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        body = f.read()
    ok, issues = check_mens_compliance(body)
    if ok:
        print("PASS — compliance OK")
        sys.exit(0)
    print("FAIL — issues:")
    for i in issues:
        print(f"  - {i}")
    sys.exit(1)
