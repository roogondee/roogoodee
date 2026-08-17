// Deterministic triage for the general-illness advice AI (/advice).
//
// Google Ads sends us cold traffic that is genuinely unwell — someone with
// chest pain will type it into the first chat box they find. This layer runs
// BEFORE the model is called and is intentionally NOT an LLM: an emergency
// reply must be identical every single time and must always surface 1669.
//
// Same contract as src/lib/mind/safety.ts, and the mental-health crisis
// classifier there is reused verbatim so a self-harm disclosure gets the same
// 1323 response no matter which entry point the user came through.

import {
  classifyMessage,
  crisisResponse,
  type SafetyFlag,
} from '@/lib/mind/safety'

// emergency → call 1669 now, do NOT let the model answer
// urgent    → model answers, but must tell them to be seen within 24h
// routine   → normal self-care advice + routing
export type TriageLevel = 'emergency' | 'urgent' | 'routine'

export interface TriageResult {
  level: TriageLevel
  // Mental-health / violence flag from the shared mind classifier, if any.
  flag: Exclude<SafetyFlag, 'safe'> | null
  // Non-null when the reply must be hardcoded (emergency or any crisis flag).
  // The route returns this verbatim and never calls the model.
  hardcodedReply: string | null
}

// Red flags that mean "ambulance now". Patterns stay broad on purpose —
// a false positive costs one over-cautious reply, a false negative costs
// much more. Thai is not case-sensitive so no lowercasing is done for it.
const EMERGENCY_PATTERNS: RegExp[] = [
  // Cardiac — chest pain, especially radiating
  /เจ็บหน้าอก|แน่นหน้าอก|จุกหน้าอก|เจ็บ.{0,6}อก.{0,10}ร้าว|ปวดร้าวไปแขน|ปวดร้าวไปกราม/,
  /\bchest pain\b|\bheart attack\b|\bcrushing chest\b/i,
  // Stroke — FAST
  /ปากเบี้ยว|หน้าเบี้ยว|พูดไม่ชัด|พูดไม่ออก|แขนขาอ่อนแรง|อ่อนแรงครึ่งซีก|ชาครึ่งซีก|ชาครึ่งตัว|มองเห็นภาพซ้อนเฉียบพลัน/,
  /\bstroke\b|\bface droop\b|\bslurred speech\b|\bweak(ness)? on one side\b/i,
  // Airway / breathing
  /หายใจไม่ออก|หายใจไม่ทัน|หายใจลำบาก|หอบเหนื่อยมาก|หายใจติดขัด|ริมฝีปากเขียว|ตัวเขียว/,
  /\bcan'?t breathe\b|\btrouble breathing\b|\bgasping\b/i,
  // Consciousness / seizure
  /หมดสติ|ไม่รู้สึกตัว|เรียกไม่ตื่น|ปลุกไม่ตื่น|ชักเกร็ง|ชักกระตุก|เป็นลมแล้วไม่ฟื้น/,
  /\bunconscious\b|\bpassed out\b|\bseizure\b|\bconvuls/i,
  // Major bleeding
  /เลือดออกไม่หยุด|เลือดไหลไม่หยุด|ตกเลือด|อาเจียนเป็นเลือด|ไอเป็นเลือด|ถ่ายเป็นเลือดสด/,
  /\bbleeding (won'?t|doesn'?t) stop\b|\bvomiting blood\b|\bcoughing up blood\b/i,
  // Anaphylaxis
  /แพ้ยารุนแรง|แพ้อาหารรุนแรง|หน้าบวมปากบวม|ปากบวมลิ้นบวม|คอบวมหายใจ|ลมพิษทั้งตัว.{0,12}หายใจ/,
  /\banaphyla/i,
  // Thunderclap headache / severe head injury
  /ปวดหัวรุนแรงที่สุด|ปวดหัวมากที่สุดในชีวิต|ปวดหัวรุนแรงเฉียบพลัน|หัวกระแทก.{0,15}(อาเจียน|ซึม|สลบ)/,
  /\bworst headache\b|\bthunderclap\b/i,
  // Poisoning / ingestion / overdose. Deliberately overlaps with
  // mind/safety.ts's CRISIS_SELF_PATTERNS and CRISIS_SUBSTANCE_PATTERNS —
  // "กินยานอนหลับหมดแผง" (took a full pack of sleeping pills) is flagged there
  // as crisis_self, but it is ALSO a physical overdose that needs an
  // ambulance, not just the mental-health hotline. Both replies fire — see
  // the isEmergency + flag!=='safe' branch below.
  /กินสารพิษ|กินยาฆ่าแมลง|กินน้ำยาล้างห้องน้ำ|ดื่มสารเคมี|โดนงูกัด|งูพิษกัด/,
  /กินยาเกิน|กินยาไปทั้งแผง|กินยาหมดแผง|กินยานอนหลับหมดแผง|กินยาเกินขนาด|กินยาไป\s*\d+\s*เม็ด/,
  /\bpoison(ed|ing)?\b|\bsnake ?bite\b|\boverdosed?\b|\bod'?d\b/i,
  // Obstetric
  /ท้อง.{0,10}เลือดออก(มาก|ไม่หยุด)|ตั้งครรภ์.{0,12}(ปวดท้องรุนแรง|เลือดออก)|เด็กไม่ดิ้น/,
  // Paediatric
  /(ทารก|เด็กเล็ก|ลูก).{0,15}(ชัก|ตัวเขียว|ซึมมาก|ไม่ดูดนม|ไข้สูงแล้วชัก)/,
]

// Not an ambulance, but should not wait for a walk-in slot next week.
// These only steer the prompt — the model still writes the reply.
const URGENT_PATTERNS: RegExp[] = [
  /ไข้สูง.{0,12}(3|4|5|6|7)\s*วัน|ไข้ไม่ลด.{0,10}หลายวัน|ไข้สูงเกิน\s*39/,
  /ตัวเหลือง|ตาเหลือง|ดีซ่าน/,
  /ปัสสาวะไม่ออก|ปัสสาวะไม่ได้เลย|ปัสสาวะเป็นเลือด/,
  /อาเจียนไม่หยุด|ท้องเสียรุนแรง|ถ่ายเหลวไม่หยุด|ขาดน้ำ/,
  /ปวดท้องรุนแรง|ท้องแข็ง|กดท้องแล้วเจ็บมาก/,
  /น้ำหนักลดเร็วผิดปกติ|ผอมลงเร็วมาก|ก้อนโตเร็ว|คลำเจอก้อน/,
  /ไข้.{0,10}ผื่น.{0,10}จ้ำเลือด|จุดเลือดออกตามตัว/,
  /บวมทั้งตัว|หน้าบวมขาบวม/,
  /\bjaundice\b|\bcan'?t urinate\b|\bblood in (urine|stool)\b|\bsevere abdominal pain\b/i,
]

// The 1669 block. Kept as its own constant so it can be prefixed to a mental
// health crisis response when someone is both in crisis and physically unsafe
// (e.g. "กินยานอนหลับหมดแผง" matches both classifiers).
export const EMERGENCY_1669_BLOCK = [
  '🚑 อาการที่คุณเล่ามาเข้าข่ายภาวะฉุกเฉิน — กรุณาโทร 1669 ทันที',
  '',
  '   • 1669 = สถาบันการแพทย์ฉุกเฉินแห่งชาติ โทรฟรี 24 ชั่วโมง',
  '   • หรือไปห้องฉุกเฉิน (ER) ของโรงพยาบาลที่ใกล้ที่สุดทันที',
  '   • อย่าขับรถไปเอง ถ้ามีคนอยู่ด้วยให้คนอื่นพาไป',
  '',
  'ระหว่างรอ: นั่งหรือนอนในท่าที่หายใจสบายที่สุด คลายเสื้อผ้าให้หลวม',
  'อย่ากินหรือดื่มอะไรจนกว่าจะถึงมือแพทย์',
  '',
  'ตอนนี้ความปลอดภัยของคุณสำคัญกว่าการคุยกับเราค่ะ — โทร 1669 ก่อนนะคะ',
].join('\n')

export function triage(text: string): TriageResult {
  const input = text || ''

  const flag = classifyMessage(input)
  const isEmergency = EMERGENCY_PATTERNS.some(p => p.test(input))

  if (flag !== 'safe') {
    // Crisis wins the reply, but if the message also describes a physical
    // emergency we lead with 1669 — 1323 alone is the wrong number for
    // someone who has already taken an overdose.
    const crisis = crisisResponse(flag)
    return {
      level: isEmergency ? 'emergency' : 'urgent',
      flag,
      hardcodedReply: isEmergency ? `${EMERGENCY_1669_BLOCK}\n\n———\n\n${crisis}` : crisis,
    }
  }

  if (isEmergency) {
    return { level: 'emergency', flag: null, hardcodedReply: EMERGENCY_1669_BLOCK }
  }

  if (URGENT_PATTERNS.some(p => p.test(input))) {
    return { level: 'urgent', flag: null, hardcodedReply: null }
  }

  return { level: 'routine', flag: null, hardcodedReply: null }
}

// Triage runs per message, but the level is sticky for the session: once a
// visitor has described an emergency we keep treating the conversation as
// urgent even if the next message is small talk.
export function escalate(previous: TriageLevel | null, next: TriageLevel): TriageLevel {
  const rank: Record<TriageLevel, number> = { routine: 0, urgent: 1, emergency: 2 }
  if (!previous) return next
  return rank[next] >= rank[previous] ? next : previous
}
