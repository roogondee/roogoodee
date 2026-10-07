// Eligibility screening (§4.1): the system computes a status + flags; the
// DOCTOR confirms and records indication + ICD-10 before any prescription.
// Thresholds come from dmglp_eligibility_rules (editable), defaulted here.

export type EligibilityStatus = 'eligible' | 'ineligible' | 'needs_review'

export interface ScreeningInput {
  weight_kg: number | null
  height_cm: number | null
  has_t2dm: boolean
  comorbidities: string[]          // 'ht' | 'dyslipidemia' | 't2dm' | free text
  pregnant_or_planning: boolean
  breastfeeding: boolean
  mtc_men2_history: boolean
  pancreatitis_history: boolean
  gallbladder_history: boolean
  gastroparesis: boolean
  on_insulin: boolean
  on_sulfonylurea: boolean
  retinopathy: boolean
}

export interface EligibilityRules {
  obesity_bmi: number
  overweight_bmi: number
}

export const DEFAULT_ELIGIBILITY_RULES: EligibilityRules = { obesity_bmi: 30, overweight_bmi: 27 }

export interface EligibilityResult {
  status: EligibilityStatus
  bmi: number | null
  indications: Array<'t2dm' | 'obesity' | 'overweight_with_comorbidity'>
  flags: string[]
}

// Flag vocabulary — rendered by the staff UI, stored on dmglp_screenings.flags.
export const ELIGIBILITY_FLAG_LABELS_TH: Record<string, string> = {
  CONTRA_PREGNANCY:      'ตั้งครรภ์ / ให้นมบุตร / วางแผนตั้งครรภ์ — ห้ามใช้',
  CONTRA_MTC_MEN2:       'ประวัติ MTC หรือ MEN2 (ตนเองหรือครอบครัว) — ห้ามใช้',
  NO_INDICATION:         'ไม่เข้าเกณฑ์ข้อบ่งใช้ (ไม่มี T2DM และ BMI ต่ำกว่าเกณฑ์)',
  MISSING_ANTHRO:        'ยังไม่มีน้ำหนัก/ส่วนสูง — คำนวณ BMI ไม่ได้',
  CAUTION_PANCREATITIS:  'ประวัติตับอ่อนอักเสบ — แพทย์พิจารณา',
  CAUTION_GALLBLADDER:   'ประวัติโรคถุงน้ำดี — แพทย์พิจารณา',
  CAUTION_GASTROPARESIS: 'กระเพาะอาหารบีบตัวช้า (gastroparesis) — แพทย์พิจารณา',
  CAUTION_HYPO_RISK:     'ใช้อินซูลินหรือ sulfonylurea — เสี่ยงน้ำตาลต่ำ พิจารณา CGM / ลดยา (แพทย์ตัดสินใจ)',
  CAUTION_RETINOPATHY:   'เบาหวานขึ้นตา — ควรตรวจตาก่อนเริ่ม',
}

export function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function computeEligibility(
  s: ScreeningInput,
  rules: EligibilityRules = DEFAULT_ELIGIBILITY_RULES,
): EligibilityResult {
  const flags: string[] = []
  const indications: EligibilityResult['indications'] = []
  const bmi = computeBmi(s.weight_kg, s.height_cm)

  // Contraindications → ineligible (block prescription).
  if (s.pregnant_or_planning || s.breastfeeding) flags.push('CONTRA_PREGNANCY')
  if (s.mtc_men2_history) flags.push('CONTRA_MTC_MEN2')

  // Indications.
  const weightComorbidity = s.comorbidities.some(c => ['ht', 'dyslipidemia', 't2dm'].includes(c)) || s.has_t2dm
  if (s.has_t2dm) indications.push('t2dm')
  if (bmi != null && bmi >= rules.obesity_bmi) indications.push('obesity')
  else if (bmi != null && bmi >= rules.overweight_bmi && weightComorbidity) indications.push('overweight_with_comorbidity')

  if (bmi == null && !s.has_t2dm) flags.push('MISSING_ANTHRO')

  // Cautions → needs_review (allowed, warning shown).
  if (s.pancreatitis_history) flags.push('CAUTION_PANCREATITIS')
  if (s.gallbladder_history) flags.push('CAUTION_GALLBLADDER')
  if (s.gastroparesis) flags.push('CAUTION_GASTROPARESIS')
  if (s.on_insulin || s.on_sulfonylurea) flags.push('CAUTION_HYPO_RISK')
  if (s.retinopathy) flags.push('CAUTION_RETINOPATHY')

  let status: EligibilityStatus
  if (flags.some(f => f.startsWith('CONTRA_'))) {
    status = 'ineligible'
  } else if (indications.length === 0) {
    flags.push('NO_INDICATION')
    status = 'ineligible'
  } else if (flags.some(f => f.startsWith('CAUTION_') || f === 'MISSING_ANTHRO')) {
    status = 'needs_review'
  } else {
    status = 'eligible'
  }

  return { status, bmi, indications, flags }
}

// Which drug the indication points at — informational for the doctor's
// enrollment form only. Never a dose.
export function suggestedDrugForIndications(ind: EligibilityResult['indications']): 'mounjaro' | 'wegovy' | null {
  if (ind.includes('t2dm')) return 'mounjaro'
  if (ind.includes('obesity') || ind.includes('overweight_with_comorbidity')) return 'wegovy'
  return null
}
