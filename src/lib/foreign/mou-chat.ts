import type { Translations } from '@/lib/i18n/locales'

// Q&A engine for the MOU landing page assistant (src/components/ui/MouChat.tsx).
//
// Deliberately deterministic — no LLM call. Every answer here is a price, a
// legal validity period, a document requirement or a screening rule that
// appears verbatim in the page copy (t.foreignMou.*, sourced from
// docs/foreign-worker-tiein.md). Those are exactly the facts a model must
// never improvise: a hallucinated price or an invented certificate validity
// on a Work Permit page is a compliance problem, not a bad answer. It also
// means zero API cost and an instant reply on a page whose traffic is mostly
// paid clicks from mobile.
//
// Answer text lives in i18n so the assistant speaks the same 10 languages as
// the rest of the page; only the free-text keywords below are Thai/English —
// non-Thai visitors reach the same answers through the translated chips.

export type MouAction = 'call' | 'line' | 'form'

type MouKey = keyof Translations['foreignMou']

export interface MouTopic {
  id: string
  /** i18n key for the chip label / question bubble */
  q: MouKey
  /** i18n key for the answer body */
  a: MouKey
  /** CTAs rendered under the answer, in order */
  actions: MouAction[]
  /** lowercase, whitespace-stripped substrings matched against free text */
  keywords: string[]
}

// Order matters: the first five are rendered as chips up front, the rest
// behind "show all questions". Highest commercial intent first — an employer
// asking about price or a group booking is the lead we want.
export const MOU_TOPICS: MouTopic[] = [
  {
    id: 'price',
    q: 'chatQPrice', a: 'chatAPrice',
    actions: ['form', 'call'],
    keywords: ['ราคา', 'กี่บาท', 'เท่าไหร่', 'เท่าไร', 'ค่าตรวจ', 'ค่าใช้จ่าย', 'ใบเสนอราคา', 'ใบกำกับภาษี', 'price', 'cost', 'howmuch', 'fee', 'quote', 'baht'],
  },
  {
    id: 'group',
    q: 'chatQGroup', a: 'chatAGroup',
    actions: ['form', 'call'],
    keywords: ['หมู่คณะ', 'เป็นกลุ่ม', 'กลุ่มใหญ่', 'หลายคน', 'นายจ้าง', 'บริษัท', 'พนักงาน', 'จองคิว', 'นัดหมาย', 'นัดล่วงหน้า', 'group', 'company', 'employer', 'booking', 'appointment', 'bulk'],
  },
  {
    id: 'docs',
    q: 'chatQDocs', a: 'chatADocs',
    actions: ['line', 'call'],
    keywords: ['เอกสาร', 'ต้องเตรียม', 'พาสปอร์ต', 'passport', 'หนังสือเดินทาง', 'บัตรประชาชน', 'หนังสือรับรอง', 'document', 'papers', 'bring', 'prepare'],
  },
  {
    id: 'time',
    q: 'chatQTime', a: 'chatATime',
    actions: ['call', 'line'],
    keywords: ['ใช้เวลา', 'นานแค่ไหน', 'กี่ชั่วโมง', 'กี่ชม', 'รอผล', 'รอนาน', 'รู้ผล', 'ได้ผลเมื่อไหร่', 'howlong', 'duration', 'waiting', 'result', 'sameday'],
  },
  {
    id: 'tests',
    q: 'chatQTests', a: 'chatATests',
    actions: ['line', 'call'],
    keywords: ['ตรวจอะไร', 'ตรวจอะไรบ้าง', 'รายการตรวจ', 'โรคต้องห้าม', '6โรค', 'หกโรค', 'วัณโรค', 'ซิฟิลิส', 'เอกซเรย์', 'เอ็กซเรย์', 'xray', 'เลือด', 'ปัสสาวะ', 'ม่านตา', 'irisscan', 'whattest', 'screening', 'disease'],
  },
  {
    id: 'validity',
    q: 'chatQValidity', a: 'chatAValidity',
    actions: ['line', 'call'],
    keywords: ['ใช้ได้นาน', 'อายุใบรับรอง', 'หมดอายุ', '90วัน', 'กี่วัน', 'validity', 'valid', 'expire', 'howlongvalid'],
  },
  {
    id: 'prep',
    q: 'chatQPrep', a: 'chatAPrep',
    actions: ['line', 'call'],
    keywords: ['งดน้ำ', 'งดอาหาร', 'อดอาหาร', 'เตรียมตัว', 'กินข้าว', 'ทานข้าว', 'fasting', 'eat', 'drink', 'beforetest'],
  },
  {
    id: 'walkin',
    q: 'chatQWalkin', a: 'chatAWalkin',
    actions: ['call', 'form'],
    keywords: ['walkin', 'มาเอง', 'ไม่ได้นัด', 'ไม่ต้องนัด', 'เดินเข้า', 'มาเลย', 'ภาษาพม่า', 'ล่าม', 'สื่อสาร', 'ภาษา', 'language', 'interpreter', 'burmese'],
  },
  {
    id: 'location',
    q: 'chatQLocation', a: 'chatALocation',
    actions: ['call', 'line'],
    keywords: ['ที่ไหน', 'สถานที่', 'อยู่ตรงไหน', 'แผนที่', 'เดินทาง', 'สมุทรสาคร', 'บางน้ำจืด', 'โรงพยาบาลไหน', 'เปิดกี่โมง', 'เวลาเปิด', 'เปิดวันไหน', 'วันหยุด', 'where', 'address', 'map', 'openinghours', 'hours', 'location'],
  },
  {
    id: 'fail',
    q: 'chatQFail', a: 'chatAFail',
    actions: ['call', 'line'],
    keywords: ['ไม่ผ่าน', 'ตรวจไม่ผ่าน', 'ตรวจเจอ', 'เป็นโรค', 'ผลผิดปกติ', 'ติดเชื้อ', 'รักษาแล้ว', 'ตรวจซ้ำ', 'fail', 'failed', 'positive', 'abnormal', 'retest'],
  },
]

/**
 * Best-effort free-text routing to a topic. Thai is written without spaces, so
 * both the input and the keywords are whitespace-stripped and matched as plain
 * substrings; English keywords are stored space-free for the same reason
 * ('howmuch', 'workpermit'). Scores sum matched keyword lengths so a longer,
 * more specific phrase wins over an incidental short one — "เปิดกี่โมง"
 * (location) beats the bare "เวลา" inside it (time).
 *
 * Returns null when nothing matches; the caller then hands the visitor to the
 * team instead of guessing an answer.
 */
export function matchMouTopic(input: string): MouTopic | null {
  const text = input.toLowerCase().replace(/\s+/g, '')
  if (!text) return null

  let best: MouTopic | null = null
  let bestScore = 0
  for (const topic of MOU_TOPICS) {
    let score = 0
    for (const kw of topic.keywords) {
      if (text.includes(kw)) score += kw.length
    }
    if (score > bestScore) {
      bestScore = score
      best = topic
    }
  }
  return bestScore > 0 ? best : null
}
