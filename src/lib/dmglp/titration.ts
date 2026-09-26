// Titration FLAGS (§4.2). The system never recommends a dose — it only
// raises warnings on the dose the doctor has chosen; the visit record stores
// the doctor's decision. Recommending doses would make this regulated
// medical-device software, so keep every output here a warning, not advice.

import { DRUGS, type DrugKey } from './config.ts'

export type TitrationFlag = 'DOSE_INCREASE_TOO_EARLY' | 'SKIPPED_STEP' | 'LONG_GAP' | 'UNKNOWN_STEP' | 'DECREASE_BELOW_MIN'

export const TITRATION_FLAG_LABELS_TH: Record<TitrationFlag, string> = {
  DOSE_INCREASE_TOO_EARLY: 'ปรับขนาดยาขึ้นก่อนครบจำนวนวันขั้นต่ำของขนาดปัจจุบัน',
  SKIPPED_STEP:            'ข้ามขั้นขนาดยามากกว่า 1 ขั้น',
  LONG_GAP:                'จ่ายยาครั้งล่าสุดช้ากว่ากำหนดมาก — พิจารณาเริ่มปรับขนาดใหม่ (แพทย์ตัดสินใจ)',
  UNKNOWN_STEP:            'ขนาดยาที่เลือกไม่อยู่ในขั้นมาตรฐานของยานี้',
  DECREASE_BELOW_MIN:      'ขนาดยาที่เลือกต่ำกว่าขั้นแรกของยานี้',
}

export interface TitrationInput {
  drug: DrugKey
  currentDoseMg: number | null       // null = starting
  daysOnCurrentDose: number | null   // days since the current dose was first dispensed
  newDoseMg: number
  daysSinceLastDispense: number | null
  minDaysPerStep?: number            // from dmglp_eligibility_rules
  longGapDays?: number               // from dmglp_eligibility_rules
}

export function titrationFlags(input: TitrationInput): TitrationFlag[] {
  const spec = DRUGS[input.drug]
  const minDays = input.minDaysPerStep ?? spec.min_days_per_step
  const longGap = input.longGapDays ?? 14
  const flags: TitrationFlag[] = []

  const newIdx = spec.steps_mg.indexOf(input.newDoseMg)
  if (newIdx < 0) {
    flags.push(input.newDoseMg < spec.steps_mg[0] ? 'DECREASE_BELOW_MIN' : 'UNKNOWN_STEP')
  }

  if (input.currentDoseMg != null) {
    const curIdx = spec.steps_mg.indexOf(input.currentDoseMg)
    if (newIdx >= 0 && curIdx >= 0 && newIdx > curIdx) {
      if (input.daysOnCurrentDose != null && input.daysOnCurrentDose < minDays) flags.push('DOSE_INCREASE_TOO_EARLY')
      if (newIdx - curIdx > 1) flags.push('SKIPPED_STEP')
    }
  }

  // A pen covers ~28 days; "overdue by more than N days" means the last
  // dispense is older than 28 + N days.
  if (input.daysSinceLastDispense != null && input.daysSinceLastDispense > spec.min_days_per_step + longGap) {
    flags.push('LONG_GAP')
  }

  return flags
}

export function isKnownStep(drug: DrugKey, doseMg: number): boolean {
  return DRUGS[drug].steps_mg.includes(doseMg)
}
