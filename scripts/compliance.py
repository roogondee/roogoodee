# -*- coding: utf-8 -*-
"""
compliance.py — Forbidden-words linter for Men's Health vertical content.

Used by autopost.py and fb_caption.py to gate Claude-generated content
before it gets published, to comply with Thai medical advertising law:
- พ.ร.บ.ยา 2510 ม.88, 89, 90(4)  — no drug names, no give-away framing
- พ.ร.บ.สถานพยาบาล 2541 ม.38     — no exaggerated claims
- ข้อบังคับแพทยสภา (โฆษณา)        — no testimonials, no cure claims
"""

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
