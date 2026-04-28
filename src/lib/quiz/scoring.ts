import type { LeadTier, Service } from '@/types'

export interface ScoringResult {
  score: number
  tier: LeadTier
  reasons: string[]
}

// ── GLP-1 (spec §4.1) ───────────────────────────────────────────────
interface GLP1Answers {
  weight_kg?: number
  height_cm?: number
  age?: number
  gender?: string
  goal?: string
  family_dm?: string[]
  symptoms?: string[]
  last_glucose_test?: string
  weight_loss_history?: string[]
  budget?: string
  start_when?: string
}

export function scoreGLP1(a: GLP1Answers): ScoringResult {
  let score = 0
  const reasons: string[] = []

  const bmi = a.weight_kg && a.height_cm
    ? a.weight_kg / Math.pow(a.height_cm / 100, 2)
    : null
  if (bmi !== null) {
    if (bmi >= 27) { score += 3; reasons.push(`BMI ${bmi.toFixed(1)} ≥ 27`) }
    else if (bmi >= 25) { score += 2; reasons.push(`BMI ${bmi.toFixed(1)} (25-26.9)`) }
  }

  if (a.family_dm && a.family_dm.length > 0 && !a.family_dm.includes('none')) {
    score += 2; reasons.push('มีประวัติครอบครัว DM')
  }

  const realSymptoms = (a.symptoms || []).filter(s => s !== 'none')
  if (realSymptoms.length >= 2) {
    score += 2; reasons.push(`มีอาการ ${realSymptoms.length} ข้อ`)
  }

  if (a.budget === '>15k' || a.budget === '10-15k') {
    score += 3; reasons.push('งบ > 10,000/เดือน')
  } else if (a.budget === '5-10k') {
    score += 2; reasons.push('งบ 5,000-10,000')
  }

  if (a.start_when === 'now') {
    score += 3; reasons.push('พร้อมเริ่มทันที')
  } else if (a.start_when === '1m') {
    score += 2; reasons.push('เริ่มภายใน 1 เดือน')
  }

  const tier: LeadTier = score >= 10 ? 'hot' : score >= 6 ? 'warm' : 'cold'
  return { score, tier, reasons }
}

// ── CKD (spec §4.2) ─────────────────────────────────────────────────
interface CKDAnswers {
  age?: number
  gender?: string
  for_whom?: string
  conditions?: string[]
  symptoms?: string[]
  kidney_test_history?: string
  location?: string
}

export function scoreCKD(a: CKDAnswers): ScoringResult {
  let score = 0
  const reasons: string[] = []

  const conditions = a.conditions || []
  if (conditions.includes('dm') || conditions.includes('ht')) {
    score += 3; reasons.push('มี DM/HT')
  }
  const realConditions = conditions.filter(c => c !== 'none')
  if (realConditions.length > 1) {
    score += 2; reasons.push(`มี ${realConditions.length} โรคร่วม`)
  }

  const realSymptoms = (a.symptoms || []).filter(s => s !== 'none')
  if (realSymptoms.length >= 2) {
    score += 3; reasons.push(`มีอาการ ${realSymptoms.length} ข้อ`)
  }

  if (a.age && a.age > 50) {
    score += 2; reasons.push('อายุ > 50')
  }

  if (a.location === 'samutsakhon' || a.location === 'bkk_nakhon_samutprakan') {
    score += 3; reasons.push('อยู่สมุทรสาคร/ปริมณฑล')
  }

  if (a.kidney_test_history === 'abnormal') {
    score += 3; reasons.push('เคยตรวจค่าไตผิดปกติ')
  }

  const tier: LeadTier = score >= 8 ? 'hot' : score >= 5 ? 'warm' : 'cold'
  return { score, tier, reasons }
}

// ── STD / PrEP (spec §4.3) ──────────────────────────────────────────
interface STDAnswers {
  age?: number
  gender?: string
  gender_identity?: string
  last_risk?: string
  risk_types?: string[]
  symptoms?: string[]
  test_history?: string
  interest?: string
  contact_channel?: string
  contact_time?: string[]
}

export function scoreSTD(a: STDAnswers): ScoringResult {
  let score = 0
  const reasons: string[] = []
  let urgent = false

  if (a.last_risk === '<72h') {
    score += 10; urgent = true
    reasons.push('🚨 ความเสี่ยง < 72 ชม.')
  }
  if (a.interest === 'pep') {
    score += 10; urgent = true
    reasons.push('🚨 สนใจ PEP')
  }

  const realSymptoms = (a.symptoms || []).filter(s => s !== 'none')
  if (realSymptoms.length >= 1) {
    score += 4; reasons.push(`มีอาการ ${realSymptoms.length} ข้อ`)
  }

  if (a.interest === 'prep') {
    score += 5; reasons.push('สนใจ PrEP')
  }

  if (a.test_history === 'never') {
    score += 2; reasons.push('ไม่เคยตรวจ')
  }

  const tier: LeadTier = urgent || score >= 10
    ? 'urgent'
    : score >= 5 ? 'hot'
    : score >= 3 ? 'warm'
    : 'cold'
  return { score, tier, reasons }
}

// ── Men's Health (Andropause + Sexual Wellness) ─────────────────────
// Tap-only screening. Red flags (heart/prostate cancer) → refer out.
interface MensAnswers {
  age_range?: string
  comorbid?: string[]
  symptoms?: string[]
  lifestyle?: string[]
  interest?: string
  start_when?: string
}

const MENS_RED_FLAGS = ['heart', 'prostate']
const MENS_AGE_SCORE: Record<string, number> = {
  under_40: 0,
  '40_49':  1,
  '50_59':  2,
  '60_plus': 3,
}

export interface MensScoringResult extends ScoringResult {
  refer?: boolean
}

export function scoreMens(a: MensAnswers): MensScoringResult {
  const comorbid = a.comorbid || []
  const hasRedFlag = comorbid.some(c => MENS_RED_FLAGS.includes(c))
  if (hasRedFlag) {
    return {
      score: 0,
      tier: 'cold',
      refer: true,
      reasons: ['ควรพบแพทย์เฉพาะทางโดยตรง — ไม่อยู่ในเกณฑ์โครงการ voucher'],
    }
  }

  let score = 0
  const reasons: string[] = []

  const ageScore = MENS_AGE_SCORE[a.age_range || ''] ?? 0
  if (ageScore > 0) { score += ageScore; reasons.push(`อายุ ${a.age_range?.replace('_', '-')}`) }

  const metabolic = ['dm', 'ht', 'dyslipidemia'].filter(c => comorbid.includes(c))
  if (metabolic.length >= 1) {
    score += 2
    reasons.push(`มีโรคร่วม metabolic ${metabolic.length} ข้อ`)
  }

  const symptoms = (a.symptoms || []).filter(s => s !== 'none')
  score += symptoms.length
  if (symptoms.includes('sexual')) {
    score += 2
    reasons.push('flag เรื่องสมรรถภาพ')
  }
  if (symptoms.length >= 3) {
    reasons.push(`มีอาการ ${symptoms.length} ข้อ`)
  }

  const lifestyleCount = (a.lifestyle || []).filter(s => s !== 'none').length
  if (lifestyleCount >= 2) {
    score += 1
    reasons.push(`lifestyle risk ${lifestyleCount} ข้อ`)
  }

  if (a.start_when === 'now') {
    score += 3
    reasons.push('พร้อมเริ่มทันที')
  } else if (a.start_when === '1m') {
    score += 2
    reasons.push('ภายใน 1 เดือน')
  }
  if (a.interest === 'sexual_health') {
    score += 2
    reasons.push('สนใจเรื่องสมรรถภาพ')
  }

  let tier: LeadTier
  if (symptoms.includes('sexual') && a.start_when === 'now') tier = 'urgent'
  else if (score >= 9) tier = 'hot'
  else if (score >= 5) tier = 'warm'
  else tier = 'cold'

  return { score, tier, reasons }
}

export function scoreQuiz(service: Service, answers: Record<string, unknown>): ScoringResult {
  switch (service) {
    case 'glp1':    return scoreGLP1(answers as GLP1Answers)
    case 'ckd':     return scoreCKD(answers as CKDAnswers)
    case 'std':     return scoreSTD(answers as STDAnswers)
    case 'mens':    return scoreMens(answers as MensAnswers)
    case 'foreign': return { score: 0, tier: 'warm', reasons: ['B2B lead'] }
  }
}
