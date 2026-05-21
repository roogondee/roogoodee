// Mind pillar — safety classifier for AI intake chat.
// See docs/mind-ai-intake-spec.md §Safety Guardrails — this is the
// hard layer that runs BEFORE we hand the user message to Sonnet.
// On any crisis flag, the assistant reply is replaced with a hardcoded
// 1323-surfacing response (never LLM-generated) and the session is
// marked for human review.

export type SafetyFlag =
  | 'crisis_self'        // self-harm / suicidal ideation
  | 'crisis_substance'   // overdose / acute substance crisis
  | 'violence'           // abuse / assault / current threat
  | 'safe'

// Patterns are matched against the raw user message (no preprocessing
// beyond .toLowerCase() for English). Keep them broad — false positives
// fail safe (1323 surfaced) and the user can clarify next turn.
//
// Thai patterns are intentionally kept as-is (no lowercase) because
// Thai isn't case-sensitive and .toLowerCase() would no-op anyway.

const CRISIS_SELF_PATTERNS: RegExp[] = [
  /ทำร้ายตัวเอง|ฆ่าตัวตาย|ไม่อยากอยู่|อยากตาย|จบชีวิต|จบที่นี่/,
  /ผูกคอ|กรีดข้อมือ|กรีดตัว|กระโดดตึก|กระโดดสะพาน|กินยานอนหลับหมดแผง/,
  /\bkill myself\b|\bsuicide\b|\bself-?harm\b|\bend my life\b|\bdon'?t want to live\b/i,
  /\bjump off\b|\boverdose\b/i,
]

const CRISIS_SUBSTANCE_PATTERNS: RegExp[] = [
  /กินยาเกิน|กินยาไป\s*\d+|ใช้ยาเสพ?ติด.*ตอนนี้|กินเหล้าจนสลบ/,
  /\boverdosed?\b|\bod'?d\b/i,
]

const VIOLENCE_PATTERNS: RegExp[] = [
  /โดนทำร้าย|โดนตี|โดนข่มขืน|โดนคุกคาม|โดนกระทำ.*ทาง.*เพศ/,
  /กำลังโดน|เพิ่งโดน/,
  /\bbeaten\b|\bassault(ed)?\b|\brape(d)?\b|\babus(e|ed|ing)\b/i,
]

export function classifyMessage(text: string): SafetyFlag {
  if (!text || !text.trim()) return 'safe'
  if (CRISIS_SELF_PATTERNS.some(p => p.test(text))) return 'crisis_self'
  if (CRISIS_SUBSTANCE_PATTERNS.some(p => p.test(text))) return 'crisis_substance'
  if (VIOLENCE_PATTERNS.some(p => p.test(text))) return 'violence'
  return 'safe'
}

// Hardcoded responses — NEVER replace these with LLM output. The whole
// point is deterministic safety messaging that always surfaces 1323.

export const CRISIS_SELF_RESPONSE = [
  'ขอบคุณที่บอกฉันค่ะ — เรื่องที่คุณกำลังเจอตอนนี้สำคัญมาก และคุณควรได้คุยกับผู้เชี่ยวชาญทันที',
  '',
  '📞 สายด่วนสุขภาพจิต กรมสุขภาพจิต **1323**',
  '   • โทรฟรี 24 ชั่วโมง',
  '   • เป็นความลับ',
  '   • ผู้เชี่ยวชาญพร้อมรับฟัง',
  '',
  'ทีมงาน Roogondee ได้รับ alert แล้ว และจะติดต่อกลับโดยเร็วที่สุดด้วยค่ะ',
  '',
  'คุณไม่ได้อยู่คนเดียว 💚',
].join('\n')

export const CRISIS_SUBSTANCE_RESPONSE = [
  'ขอบคุณที่บอกฉันค่ะ — ตอนนี้สำคัญที่สุดคือคุณต้องปลอดภัย',
  '',
  '🚑 หากเป็นภาวะฉุกเฉินจริงในตอนนี้ (กินยาเกิน / หมดสติ / หายใจไม่สะดวก)',
  '   โทร **1669** (สถาบันการแพทย์ฉุกเฉินแห่งชาติ ฟรี 24 ชม.)',
  '',
  '📞 สายด่วนสุขภาพจิต **1323** สำหรับการพูดคุยและคำแนะนำเรื่องสารเสพติด',
  '   ฟรี 24 ชม. เป็นความลับ',
  '',
  'ทีม Roogondee จะติดต่อกลับโดยเร็วที่สุดด้วยค่ะ',
].join('\n')

export const VIOLENCE_RESPONSE = [
  'ขอบคุณที่กล้าบอกฉันค่ะ — เรื่องที่เกิดขึ้นกับคุณไม่ใช่ความผิดของคุณ',
  '',
  '☎️ ขอแนะนำให้ติดต่อสายด่วนเฉพาะทาง:',
  '   • **1300** — สายด่วนช่วยเหลือสังคม (ปวส.) 24 ชม.',
  '   • **1323** — สายด่วนสุขภาพจิต (สำหรับสภาพจิตใจ) 24 ชม.',
  '   • **1669** — กรณีฉุกเฉินทางการแพทย์',
  '',
  'ทีม Roogondee ได้รับ alert แล้ว — เราจะติดต่อกลับโดยเร็วที่สุด',
  '',
  'คุณปลอดภัยตอนนี้ไหมคะ? ถ้ายังไม่ปลอดภัย โปรดไปที่ที่ปลอดภัยก่อนค่ะ',
].join('\n')

export function crisisResponse(flag: SafetyFlag): string {
  switch (flag) {
    case 'crisis_self':       return CRISIS_SELF_RESPONSE
    case 'crisis_substance':  return CRISIS_SUBSTANCE_RESPONSE
    case 'violence':          return VIOLENCE_RESPONSE
    case 'safe':              return ''
  }
}
