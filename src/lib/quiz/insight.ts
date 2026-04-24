import type { Service, LeadTier } from '@/types'

// Personalized health insight shown on the quiz success screen.
// Computed server-side from raw quiz answers + scoring tier.
// Tone: supportive, non-judgmental (spec §4.3 safe-space).
// Every insight must include `disclaimer` to cover medical advice compliance.

export interface HealthInsight {
  headline: string
  body: string
  recommendation: string
  disclaimer: string
  urgent?: boolean
}

type Answers = Record<string, unknown>

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter(x => typeof x === 'string') as string[]) : []
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}
function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

const DISCLAIMER = 'ผลประเมินนี้เป็นเพียงการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ กรุณาพบแพทย์เพื่อยืนยันผลและวางแผนดูแลที่เหมาะสม'

// ── GLP-1 ───────────────────────────────────────────────────────────
function insightGLP1(a: Answers, tier: LeadTier): HealthInsight {
  const wt = asNumber(a.weight_kg)
  const ht = asNumber(a.height_cm)
  const bmi = wt && ht ? wt / Math.pow(ht / 100, 2) : null
  const hasFamilyDm = asArray(a.family_dm).some(x => x !== 'none')
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')

  if (bmi && bmi >= 30 && hasFamilyDm && symptoms.length >= 2) {
    return {
      headline: `BMI ${bmi.toFixed(1)} · ความเสี่ยงเบาหวานสูง`,
      body: 'ค่า BMI เกิน 30 (class I obesity) ประกอบกับประวัติครอบครัว DM และอาการที่คุณรายงาน = กลุ่มเสี่ยงเบาหวาน type 2 ภายใน 5 ปีค่อนข้างสูง',
      recommendation: 'การตรวจ FBS + HbA1c ฟรีจะยืนยันว่าตอนนี้อยู่ในระยะ pre-diabetes หรือ diabetes แล้ว และแพทย์จะประเมินว่า GLP-1 เหมาะสมไหม',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }
  if (bmi && bmi >= 30) {
    return {
      headline: `BMI ${bmi.toFixed(1)} · กลุ่ม obesity class I`,
      body: 'ค่า BMI ในระดับนี้เพิ่มความเสี่ยงเบาหวาน 3-4 เท่า ความดันสูง 2-3 เท่า และโรคหัวใจเทียบกับน้ำหนักปกติ',
      recommendation: 'ตรวจ FBS + HbA1c ช่วยให้รู้สถานะจริงก่อนเริ่ม GLP-1 และประเมินได้ว่าลดน้ำหนักอย่างเดียวพอ หรือต้องคุมน้ำตาลควบคู่',
      disclaimer: DISCLAIMER,
    }
  }
  if (bmi && bmi >= 27) {
    return {
      headline: `BMI ${bmi.toFixed(1)} · น้ำหนักเกินเกณฑ์`,
      body: 'ระดับนี้ยังไม่ถึง obesity แต่อยู่ในช่วงที่ pre-diabetes พบได้บ่อย (~30% ของคนในช่วง BMI นี้)',
      recommendation: 'การตรวจ HbA1c ครั้งเดียวบอกได้ว่าน้ำตาลสะสม 3 เดือนเป็นยังไง ถ้าผลปกติ lifestyle ปกติก็พอ ถ้าเริ่มผิดปกติ = intervene ได้เร็ว',
      disclaimer: DISCLAIMER,
    }
  }
  return {
    headline: 'ประเมินสุขภาพเบื้องต้นเรียบร้อย',
    body: 'ค่า BMI และข้อมูลที่คุณให้อยู่ในเกณฑ์พอใช้ได้ แต่การตรวจคัดกรองเบาหวานปีละครั้งยังเป็นแนวทางที่แนะนำ',
    recommendation: 'ตรวจ FBS + HbA1c ฟรีที่ W Medical Hospital เพื่อเก็บเป็น baseline และปรึกษาแพทย์ว่าเป้าหมายของคุณเหมาะกับ GLP-1 หรือวิธีอื่น',
    disclaimer: DISCLAIMER,
  }
}

// ── CKD ─────────────────────────────────────────────────────────────
function insightCKD(a: Answers, tier: LeadTier): HealthInsight {
  const conditions = asArray(a.conditions)
  const hasDm = conditions.includes('dm')
  const hasHt = conditions.includes('ht')
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  const testHistory = asString(a.kidney_test_history)

  if (hasDm && hasHt) {
    return {
      headline: 'DM + HT = risk factor อันดับ 1 ของโรคไตในไทย',
      body: 'การมี DM และความดันพร้อมกัน = คนไทย 40-50% จะเกิด CKD stage 3+ ภายใน 10-15 ปีถ้าไม่ได้ตรวจติดตาม',
      recommendation: 'ตรวจโปรตีนในปัสสาวะคัดกรอง CKD ตั้งแต่ระยะ micro-albuminuria = เริ่มรักษาทันได้ ชะลอการเสื่อมของไตได้ถึง 10 ปี',
      disclaimer: DISCLAIMER,
      urgent: tier === 'hot',
    }
  }
  if (hasDm || hasHt) {
    return {
      headline: `${hasDm ? 'DM' : 'ความดัน'} = สาเหตุหลักของโรคไตเรื้อรัง`,
      body: `${hasDm ? 'เบาหวาน' : 'ความดันสูง'}เป็นสาเหตุอันดับต้น ๆ ของโรคไตเรื้อรังในไทย การตรวจโปรตีนในปัสสาวะช่วยจับสัญญาณเริ่มต้นได้ก่อนค่าครีเอตินินจะเปลี่ยน`,
      recommendation: 'ตรวจฟรีที่ W Medical + ปรึกษาแพทย์ว่าควรตรวจซ้ำทุกกี่เดือน และปรับยาปัจจุบันยังไงให้ช่วยถนอมไต',
      disclaimer: DISCLAIMER,
    }
  }
  if (symptoms.length >= 2) {
    return {
      headline: `อาการ ${symptoms.length} ข้อ = อาจเป็นสัญญาณเริ่มต้น`,
      body: 'อาการที่คุณรายงาน (บวม/ปัสสาวะฟอง/ปัสสาวะกลางคืน/เหนื่อย) เป็นกลุ่มอาการคลาสสิกของ CKD ระยะเริ่มต้น',
      recommendation: 'ตรวจโปรตีนในปัสสาวะ 1 ครั้ง รู้ผลใน 30 นาที ถ้าปกติก็อุ่นใจ ถ้าพบ protein = เข้าสู่ระบบติดตามก่อนที่ไตจะเสียหายเพิ่ม',
      disclaimer: DISCLAIMER,
    }
  }
  if (testHistory === 'never') {
    return {
      headline: 'ยังไม่เคยตรวจค่าไต',
      body: 'คนไทยวัย 40+ 1 ใน 3 มี early-stage CKD โดยไม่มีอาการ การตรวจครั้งแรกทำให้เก็บ baseline ได้',
      recommendation: 'ตรวจโปรตีนในปัสสาวะฟรี 1 ครั้ง + ปรึกษาแพทย์ว่าควรตรวจซ้ำเมื่อไหร่',
      disclaimer: DISCLAIMER,
    }
  }
  return {
    headline: 'การคัดกรองเชิงป้องกัน',
    body: 'คุณยังไม่มี risk factor สูงตอนนี้ แต่การตรวจคัดกรองต้นทุนต่ำช่วยยืนยันสถานะไตปัจจุบัน',
    recommendation: 'ใช้ voucher ตรวจ urine protein ฟรี เก็บไว้เป็น baseline',
    disclaimer: DISCLAIMER,
  }
}

// ── STD ─────────────────────────────────────────────────────────────
function insightSTD(a: Answers, tier: LeadTier): HealthInsight {
  const lastRisk = asString(a.last_risk)
  const interest = asString(a.interest)
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  const testHistory = asString(a.test_history)

  if (interest === 'pep' || lastRisk === '<72h') {
    return {
      headline: '🚨 PEP ได้ผลสูงสุดภายใน 72 ชั่วโมง',
      body: 'หลัง exposure เกิน 72 ชม. PEP ลดประสิทธิภาพมาก ทุกชั่วโมงที่รอ = โอกาสป้องกัน HIV ลดลง กรุณาติดต่อโรงพยาบาลทันที',
      recommendation: 'โทรหา W Medical ด่วน — ทีมให้คำแนะนำและเริ่ม PEP 28 วันได้ ตรวจเบื้องต้นรู้ผลใน 1 ชม.',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }
  if (interest === 'prep') {
    return {
      headline: 'PrEP ลด HIV risk ได้ 99% เมื่อทานสม่ำเสมอ',
      body: 'PrEP (Truvada/Descovy) คือยาป้องกัน HIV ก่อน exposure ที่ได้ผลสูงสุดในตลาด ใช้เป็น daily pill หรือ on-demand (2-1-1 regimen)',
      recommendation: 'ตรวจ baseline HIV + Syphilis ก่อนเริ่ม PrEP (ฟรี) แพทย์จะประเมินและสั่งยาในวันเดียว',
      disclaimer: DISCLAIMER,
    }
  }
  if (symptoms.length >= 1 && (testHistory === 'never' || testHistory === '>1y')) {
    return {
      headline: 'มีอาการ + ไม่ได้ตรวจนานเกิน = ควรตรวจเร็ว',
      body: 'HIV และ Syphilis ระยะแรกมักไม่มีอาการเด่น ถ้ามีอาการที่คุณรายงาน + ไม่เคย screen นาน = ความเสี่ยงสะสม',
      recommendation: 'ตรวจที่ W Medical ส่วนตัว ไม่ตัดสิน รู้ผลใน 1 ชม. ถ้าผลบวกมีทีมดูแลต่อทันที',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }
  if (interest === 'treat') {
    return {
      headline: 'รักษาเร็ว = เปลี่ยนผล outcome อย่างสิ้นเชิง',
      body: 'STD ส่วนใหญ่ (Syphilis, Gonorrhea, Chlamydia) รักษาหาย 100% ถ้าเริ่มเร็ว HIV ไม่หายขาดแต่ viral load = undetectable ได้ = ไม่แพร่ไม่ลุกลาม',
      recommendation: 'ตรวจฟรีเพื่อยืนยันชนิดแล้วเริ่มยาในวันเดียวกัน W Medical มีทีมที่ดูแลเรื่องนี้โดยเฉพาะ',
      disclaimer: DISCLAIMER,
    }
  }
  return {
    headline: 'ตรวจแล้วเคลียร์ใจ = สบายใจ',
    body: 'การตรวจคัดกรอง HIV + Syphilis เป็นเรื่องปกติและส่วนตัว ไม่ใช่เรื่องของการตัดสิน — ผล 1 ชม. ไปต่อได้เลย',
    recommendation: 'ใช้ voucher ตรวจที่ W Medical แบบ walk-in หรือจองก่อนได้',
    disclaimer: DISCLAIMER,
  }
}

export function generateInsight(service: Service, answers: Answers, tier: LeadTier): HealthInsight | null {
  switch (service) {
    case 'glp1':    return insightGLP1(answers, tier)
    case 'ckd':     return insightCKD(answers, tier)
    case 'std':     return insightSTD(answers, tier)
    case 'foreign': return null
  }
}
