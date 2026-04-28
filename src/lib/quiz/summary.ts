import type { Service } from '@/types'

// Human-readable summary of quiz answers for the LINE handoff card.
// Returns an array of bullet-point lines — whatever is most important
// for the hospital team to know before calling the lead.

type Answers = Record<string, unknown>

const GENDER: Record<string, string> = { f: 'หญิง', m: 'ชาย', x: 'ไม่สะดวกบอก' }

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter(x => typeof x === 'string') as string[]) : []
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

// ── GLP-1 ───────────────────────────────────────────────────────────
const GLP1_GOAL: Record<string, string> = {
  health: 'ลดน้ำหนักเพื่อสุขภาพ',
  beauty: 'ลดเพื่อสวยงาม',
  control_dm: 'คุมเบาหวาน',
  prevent_dm: 'ป้องกันเบาหวาน',
}
const GLP1_SYMPTOMS: Record<string, string> = {
  polyuria_thirst: 'ปัสสาวะบ่อย/กระหายน้ำ',
  weight_gain: 'น้ำหนักขึ้นเร็ว',
  fatigue: 'เหนื่อยง่าย',
  big_waist: 'รอบเอวเกิน',
}
const GLP1_BUDGET: Record<string, string> = {
  '<5k': '<5,000/เดือน',
  '5-10k': '5,000-10,000/เดือน',
  '10-15k': '10,000-15,000/เดือน',
  '>15k': '>15,000/เดือน',
}
const GLP1_START: Record<string, string> = {
  now: 'ทันที',
  '1m': 'ภายใน 1 เดือน',
  '1-3m': '1-3 เดือน',
  unsure: 'ยังไม่แน่ใจ',
}

function summarizeGLP1(a: Answers): string[] {
  const lines: string[] = []
  const wt = asNumber(a.weight_kg)
  const ht = asNumber(a.height_cm)
  if (wt && ht) {
    const bmi = wt / Math.pow(ht / 100, 2)
    lines.push(`น้ำหนัก ${wt} กก. / สูง ${ht} ซม. · BMI ${bmi.toFixed(1)}`)
  }
  const age = asNumber(a.age)
  const gender = asString(a.gender)
  if (age || gender) lines.push(`${age ? age + ' ปี' : ''}${age && gender ? ' · ' : ''}${gender ? GENDER[gender] || gender : ''}`)

  const goal = asString(a.goal)
  if (goal) lines.push(`เป้าหมาย: ${GLP1_GOAL[goal] || goal}`)

  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  if (symptoms.length) lines.push(`อาการ: ${symptoms.map(s => GLP1_SYMPTOMS[s] || s).join(', ')}`)

  const family = asArray(a.family_dm).filter(s => s !== 'none')
  if (family.length) lines.push(`ครอบครัวเป็น DM: มี`)

  const budget = asString(a.budget)
  if (budget) lines.push(`งบ: ${GLP1_BUDGET[budget] || budget}`)

  const start = asString(a.start_when)
  if (start) lines.push(`พร้อมเริ่ม: ${GLP1_START[start] || start}`)

  return lines
}

// ── CKD ─────────────────────────────────────────────────────────────
const CKD_FOR_WHOM: Record<string, string> = {
  self: 'ตนเอง', parent: 'พ่อ/แม่', spouse: 'คู่สมรส', relative: 'ญาติ',
}
const CKD_CONDITIONS: Record<string, string> = {
  dm: 'เบาหวาน', ht: 'ความดัน', gout: 'เกาต์', highlipid: 'ไขมันสูง', obese: 'อ้วน',
}
const CKD_SYMPTOMS: Record<string, string> = {
  swell: 'บวมขา/หน้า', foamy_urine: 'ปัสสาวะฟอง', nocturia: 'ปัสสาวะกลางคืน', fatigue: 'เหนื่อยง่าย',
}
const CKD_TEST: Record<string, string> = {
  normal: 'ปกติ', abnormal: 'ผิดปกติ', never: 'ไม่เคยตรวจ', forgot: 'จำไม่ได้',
}
const CKD_LOCATION: Record<string, string> = {
  samutsakhon: 'สมุทรสาคร',
  bkk_nakhon_samutprakan: 'กรุงเทพ/นครปฐม/สมุทรปราการ',
  other: 'จังหวัดอื่น',
}

function summarizeCKD(a: Answers): string[] {
  const lines: string[] = []
  const age = asNumber(a.age)
  const gender = asString(a.gender)
  if (age || gender) lines.push(`${age ? age + ' ปี' : ''}${age && gender ? ' · ' : ''}${gender ? GENDER[gender] || gender : ''}`)

  const whom = asString(a.for_whom)
  if (whom) lines.push(`สำหรับ: ${CKD_FOR_WHOM[whom] || whom}`)

  const conditions = asArray(a.conditions).filter(s => s !== 'none')
  if (conditions.length) lines.push(`โรคประจำตัว: ${conditions.map(s => CKD_CONDITIONS[s] || s).join(', ')}`)

  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  if (symptoms.length) lines.push(`อาการ: ${symptoms.map(s => CKD_SYMPTOMS[s] || s).join(', ')}`)

  const test = asString(a.kidney_test_history)
  if (test) lines.push(`เคยตรวจค่าไต: ${CKD_TEST[test] || test}`)

  const loc = asString(a.location)
  if (loc) lines.push(`พื้นที่: ${CKD_LOCATION[loc] || loc}`)

  return lines
}

// ── STD ─────────────────────────────────────────────────────────────
const STD_RISK: Record<string, string> = {
  '<72h': '🚨 < 72 ชั่วโมง',
  '1-4w': '1-4 สัปดาห์',
  '1-3m': '1-3 เดือน',
  '>3m': '>3 เดือน',
  none: 'ไม่มี',
}
const STD_SYMPTOMS: Record<string, string> = {
  sore: 'แผลอวัยวะเพศ', rash: 'ผื่น', node: 'ต่อมน้ำเหลือง',
  fever: 'ไข้เรื้อรัง', dysuria: 'ปัสสาวะแสบ',
}
const STD_INTEREST: Record<string, string> = {
  screen: 'ตรวจสบายใจ',
  treat: 'รักษา',
  prep: 'PrEP',
  pep: '🚨 PEP ฉุกเฉิน',
}
const STD_CONTACT: Record<string, string> = {
  line_only: '⚠️ LINE เท่านั้น (ห้ามโทร)',
  call_ok: 'โทรได้',
  email: 'Email',
}
const STD_TEST: Record<string, string> = {
  never: 'ไม่เคย', '<6m': '<6 เดือน', '6-12m': '6-12 เดือน', '>1y': '>1 ปี',
}

function summarizeSTD(a: Answers): string[] {
  const lines: string[] = []

  const contact = asString(a.contact_channel)
  if (contact) lines.push(`ช่องทาง: ${STD_CONTACT[contact] || contact}`)

  const age = asNumber(a.age)
  const gender = asString(a.gender)
  if (age || gender) lines.push(`${age ? age + ' ปี' : ''}${age && gender ? ' · ' : ''}${gender ? GENDER[gender] || gender : ''}`)

  const interest = asString(a.interest)
  if (interest) lines.push(`สนใจ: ${STD_INTEREST[interest] || interest}`)

  const risk = asString(a.last_risk)
  if (risk) lines.push(`ความเสี่ยงล่าสุด: ${STD_RISK[risk] || risk}`)

  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  if (symptoms.length) lines.push(`อาการ: ${symptoms.map(s => STD_SYMPTOMS[s] || s).join(', ')}`)

  const test = asString(a.test_history)
  if (test) lines.push(`เคยตรวจ: ${STD_TEST[test] || test}`)

  return lines
}

// ── Men's Health (Andropause + Sexual Wellness) ─────────────────────
const MENS_AGE: Record<string, string> = {
  under_40: '< 40 ปี',
  '40_49':  '40-49 ปี',
  '50_59':  '50-59 ปี',
  '60_plus': '60+ ปี',
}
const MENS_COMORBID: Record<string, string> = {
  dm: 'เบาหวาน',
  ht: 'ความดัน',
  dyslipidemia: 'ไขมันสูง',
  heart: '🚩 หัวใจ / เจ็บหน้าอก',
  prostate: '🚩 มะเร็ง/ต่อมลูกหมาก',
}
const MENS_SYMPTOMS: Record<string, string> = {
  fatigue: 'อ่อนเพลีย',
  mood: 'อารมณ์แปรปรวน',
  muscle: 'มวลกล้ามเนื้อลด',
  sleep: 'นอนไม่หลับ',
  sexual: 'สมรรถภาพลด',
}
const MENS_LIFESTYLE: Record<string, string> = {
  sleep_short: 'นอน < 6 ชม.',
  no_exercise: 'ไม่ออกกำลัง',
  alcohol: 'ดื่ม/สูบ',
  stress: 'เครียดสูง',
  weight_gain: 'น้ำหนักขึ้นเร็ว',
}
const MENS_INTEREST: Record<string, string> = {
  general: 'สุขภาพรวม',
  lifestyle: 'lifestyle/พลังงาน',
  sexual_health: 'สมรรถภาพ',
  hormone: 'ตรวจฮอร์โมน',
  unsure: 'ยังไม่แน่ใจ',
}
const MENS_START: Record<string, string> = {
  now: 'ทันที',
  '1m': 'ภายใน 1 เดือน',
  '1-3m': '1-3 เดือน',
  unsure: 'ยังไม่แน่ใจ',
}

function summarizeMens(a: Answers): string[] {
  const lines: string[] = []

  const age = asString(a.age_range)
  if (age) lines.push(`ช่วงอายุ: ${MENS_AGE[age] || age}`)

  const comorbid = asArray(a.comorbid).filter(s => s !== 'none')
  if (comorbid.length) {
    lines.push(`โรคประจำตัว: ${comorbid.map(s => MENS_COMORBID[s] || s).join(', ')}`)
  }

  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  if (symptoms.length) {
    lines.push(`อาการ: ${symptoms.map(s => MENS_SYMPTOMS[s] || s).join(', ')}`)
  }

  const lifestyle = asArray(a.lifestyle).filter(s => s !== 'none')
  if (lifestyle.length) {
    lines.push(`lifestyle: ${lifestyle.map(s => MENS_LIFESTYLE[s] || s).join(', ')}`)
  }

  const interest = asString(a.interest)
  if (interest) lines.push(`สนใจ: ${MENS_INTEREST[interest] || interest}`)

  const start = asString(a.start_when)
  if (start) lines.push(`พร้อมเริ่ม: ${MENS_START[start] || start}`)

  return lines
}

export function summarizeAnswers(service: Service, answers: Answers): string[] {
  switch (service) {
    case 'glp1':    return summarizeGLP1(answers)
    case 'ckd':     return summarizeCKD(answers)
    case 'std':     return summarizeSTD(answers)
    case 'mens':    return summarizeMens(answers)
    case 'foreign': return []
  }
}
