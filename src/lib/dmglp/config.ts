// Business constants for the W Medical Diabetes & Metabolic Care (GLP-1)
// program — roogondee.com/dmglp. Anything a clinician or finance may need to
// change later (eligibility thresholds, prices, tier entitlements) lives in
// the dmglp_* config tables and is only *defaulted* here; the values below
// that never change at runtime (drug step ladders, the care-schedule
// template, red-flag survey items) are the single source of truth.
//
// This file has no imports so the pure domain modules next to it can be
// exercised by `node --test` without a bundler (see tests/dmglp).

export const HOSPITAL_NAME = 'โรงพยาบาลดับเบิ้ลยู เมดิคอล'
export const HOSPITAL_PHONE = '034-110-988'
export const HOSPITAL_PHONE_TEL = 'tel:034110988'
export const PROGRAM_PATH = '/dmglp'
export const STAFF_PATH = '/dmglp/staff'
export const BKK_OFFSET_MS = 7 * 60 * 60 * 1000

// ── Drugs & titration (§4.2) — flags only, never a recommendation ────────
export type DrugKey = 'mounjaro' | 'wegovy'

export interface DrugSpec {
  label: string
  skuPrefix: string
  steps_mg: number[]
  min_days_per_step: number
  missed_dose_window_days: number
}

export const DRUGS: Record<DrugKey, DrugSpec> = {
  mounjaro: { label: 'Mounjaro (tirzepatide)', skuPrefix: 'MJ', steps_mg: [2.5, 5, 7.5, 10], min_days_per_step: 28, missed_dose_window_days: 4 },
  wegovy:   { label: 'Wegovy (semaglutide)',  skuPrefix: 'WG', steps_mg: [0.25, 0.5, 1, 1.7, 2.4], min_days_per_step: 28, missed_dose_window_days: 5 },
}

export function skuFor(drug: DrugKey, doseMg: number): string {
  return `${DRUGS[drug].skuPrefix}-${String(doseMg)}`
}

// ── Care schedule template (§4.3) — Day 0 = enrollment start ─────────────
export type AppointmentType = 'specialist_visit' | 'followup_visit' | 'line_followup' | 'lab_only'
export type LabPanel = 'baseline' | 'q3m' | 'q6m' | 'yearly'

export interface ScheduleStep {
  code: string
  offsetDays: number
  type: AppointmentType
  who: 'doctor' | 'gp_or_pharmacist' | 'pharmacist'
  labPanel: LabPanel | null
  drugLinked: boolean
}

export const SCHEDULE_TEMPLATE: ScheduleStep[] = [
  { code: 'D0',  offsetDays: 0,   type: 'specialist_visit', who: 'doctor',            labPanel: 'baseline', drugLinked: true },
  { code: 'D3',  offsetDays: 3,   type: 'line_followup',    who: 'pharmacist',        labPanel: null,       drugLinked: false },
  { code: 'D7',  offsetDays: 7,   type: 'line_followup',    who: 'pharmacist',        labPanel: null,       drugLinked: false },
  { code: 'W4',  offsetDays: 28,  type: 'followup_visit',   who: 'gp_or_pharmacist',  labPanel: null,       drugLinked: true },
  { code: 'W8',  offsetDays: 56,  type: 'followup_visit',   who: 'gp_or_pharmacist',  labPanel: null,       drugLinked: true },
  { code: 'W12', offsetDays: 84,  type: 'specialist_visit', who: 'doctor',            labPanel: 'q3m',      drugLinked: true },
  { code: 'W16', offsetDays: 112, type: 'followup_visit',   who: 'gp_or_pharmacist',  labPanel: null,       drugLinked: true },
  { code: 'W20', offsetDays: 140, type: 'followup_visit',   who: 'gp_or_pharmacist',  labPanel: null,       drugLinked: true },
  { code: 'W24', offsetDays: 168, type: 'specialist_visit', who: 'doctor',            labPanel: 'q6m',      drugLinked: true },
]

// Reminder timing before each visit: LINE reminder D-1 09:00, survey link D-2.
export const REMINDER_DAYS_BEFORE = 1
export const SURVEY_DAYS_BEFORE = 2
export const REMINDER_HOUR_BKK = 9

// ── Lab panels (§4.4) ────────────────────────────────────────────────────
export const LAB_PANELS: Record<LabPanel, string[]> = {
  baseline: ['FBS', 'HBA1C', 'TC', 'LDL', 'HDL', 'TG', 'CR', 'EGFR', 'AST', 'ALT', 'UACR'],
  q3m:      ['HBA1C', 'FBS'],
  q6m:      ['HBA1C', 'FBS', 'CR', 'EGFR', 'TC', 'LDL', 'HDL', 'TG', 'AST', 'ALT'],
  yearly:   ['UACR'],
}

// Urine pregnancy test is added to the baseline panel for a female of
// reproductive age (§4.4) — decided at order time, not in the panel itself.
export const UPT_CODE = 'UPT'
export const REPRODUCTIVE_AGE_MAX = 50

export const LAB_LABELS: Record<string, string> = {
  FBS: 'FBS (mg/dL)', HBA1C: 'HbA1c (%)', TC: 'Total cholesterol', LDL: 'LDL', HDL: 'HDL', TG: 'Triglycerides',
  CR: 'Creatinine', EGFR: 'eGFR', AST: 'AST', ALT: 'ALT', UACR: 'UACR', UPT: 'Urine pregnancy test',
}

// ── Red-flag symptom survey (§4.5) ───────────────────────────────────────
export interface SurveyItem {
  key: string
  labelTh: string
  redFlag: boolean
}

export const SURVEY_ITEMS: SurveyItem[] = [
  { key: 'severe_abdominal_pain', labelTh: 'ปวดท้องรุนแรงต่อเนื่อง (โดยเฉพาะปวดร้าวไปหลัง)', redFlag: true },
  { key: 'vomiting_24h',          labelTh: 'อาเจียนหรือดื่มน้ำไม่ได้เกิน 24 ชั่วโมง หรือปัสสาวะน้อยมาก', redFlag: true },
  { key: 'hypoglycemia',          labelTh: 'น้ำตาลต่ำกว่า 70 mg/dL ซ้ำ ๆ หรือมีอาการใจสั่น เหงื่อออก มือสั่น หน้ามืด', redFlag: true },
  { key: 'jaundice',              labelTh: 'ตัวเหลือง ตาเหลือง หรือปวดท้องด้านขวาบน', redFlag: true },
  { key: 'allergy',               labelTh: 'ผื่นร่วมกับหน้าบวม หรือหายใจลำบาก', redFlag: true },
  { key: 'vision_loss',           labelTh: 'ตามัวหรือมองไม่เห็นเฉียบพลัน', redFlag: true },
  { key: 'neck_lump',             labelTh: 'ก้อนที่คอ เสียงแหบ หรือกลืนลำบาก', redFlag: true },
  { key: 'nausea',                labelTh: 'คลื่นไส้', redFlag: false },
  { key: 'constipation',          labelTh: 'ท้องผูก', redFlag: false },
  { key: 'injection_problem',     labelTh: 'ปัญหาการฉีดยา (บวม แดง ฉีดไม่เข้า)', redFlag: false },
  { key: 'missed_dose',           labelTh: 'ลืมฉีดยา / ฉีดไม่ตรงเวลา', redFlag: false },
]

export const SURVEY_RED_FLAG_MESSAGE_TH =
  `อาการที่แจ้งอาจต้องได้รับการดูแลโดยเร็ว กรุณาติดต่อโรงพยาบาลทันที โทร ${HOSPITAL_PHONE}`

// ── Programs (§4.7) — defaults; live values come from dmglp_program_tiers ─
export type ProgramTier = 'BASIC' | 'PLUS' | 'PREMIUM'

export const PROGRAM_VALIDITY_MONTHS = 8
export const PROGRAM_INSTALLMENTS = 6
export const PROGRAM_RENEWAL_DISCOUNT = 0.10

// ── No-show handling (§4.3) ──────────────────────────────────────────────
export const NO_SHOW_CALL_AFTER_DAYS = 7

// ── Fridge (§4.8) ────────────────────────────────────────────────────────
export const FRIDGE_MIN_C = 2
export const FRIDGE_MAX_C = 8

// ── Roles (§3) ───────────────────────────────────────────────────────────
export type DmglpRole = 'admin' | 'nurse' | 'doctor' | 'pharmacist' | 'finance' | 'marketing' | 'manager' | 'auditor'

export const DMGLP_ROLES: DmglpRole[] = ['admin', 'nurse', 'doctor', 'pharmacist', 'finance', 'marketing', 'manager', 'auditor']

export const ROLE_LABELS_TH: Record<DmglpRole, string> = {
  admin: 'แอดมิน / หน้าเคาน์เตอร์',
  nurse: 'พยาบาล',
  doctor: 'แพทย์',
  pharmacist: 'เภสัชกร',
  finance: 'การเงิน',
  marketing: 'การตลาด',
  manager: 'ผู้จัดการ (อ่านอย่างเดียว)',
  auditor: 'ผู้ตรวจสอบ',
}

// ── Attribution (§4.9) ───────────────────────────────────────────────────
export const REF_CODE_PREFIX = 'DM'
export const LINE_OA_ID = '@roogondee'
export const CONVERSION_NAMES = ['line_contact', 'booked', 'treatment_started'] as const
export type ConversionName = typeof CONVERSION_NAMES[number]
