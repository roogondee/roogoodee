import type { LabAnalyte } from '@/lib/lab/types'

// ── Certificate types ─────────────────────────────────────────────────────
export type CertType = 'general' | 'annual_checkup' | 'risk_based' | 'work_permit'
export type CertStatus = 'draft' | 'issued' | 'revoked'
export type FitStatus = 'normal' | 'fit' | 'fit_with_condition' | 'unfit'

export const CERT_TYPE_LABEL: Record<CertType, string> = {
  general: 'ใบรับรองแพทย์ทั่วไป',
  annual_checkup: 'ตรวจสุขภาพประจำปี',
  risk_based: 'ตรวจสุขภาพตามความเสี่ยง',
  work_permit: 'ตรวจสุขภาพแรงงานต่างด้าว (Work Permit)',
}

export const CERT_TYPE_LABEL_EN: Record<CertType, string> = {
  general: 'Medical Certificate',
  annual_checkup: 'Annual Health Checkup',
  risk_based: 'Risk-based Health Checkup',
  work_permit: 'Foreign Worker Health Certificate (Work Permit)',
}

export const FIT_STATUS_LABEL: Record<FitStatus, string> = {
  normal: 'สุขภาพแข็งแรง ไม่พบความผิดปกติ',
  fit: 'เหมาะสมกับการทำงาน (Fit for work)',
  fit_with_condition: 'ทำงานได้โดยมีเงื่อนไข (Fit with condition)',
  unfit: 'ไม่เหมาะสมกับการทำงาน (Unfit)',
}

export interface CertDiseaseItem {
  key: string
  label_th: string
  label_en?: string
  result: 'normal' | 'abnormal' | 'not_tested'
  detail?: string
}

// แบบใบรับรองแพทย์มาตรฐานแพทยสภา — คำประกาศโรค/อาการ 5 ข้อ
export const FIVE_DISEASES_TH: Omit<CertDiseaseItem, 'result'>[] = [
  { key: 'leprosy', label_th: 'โรคเรื้อนในระยะติดต่อ หรือในระยะที่ปรากฏอาการเป็นที่รังเกียจแก่สังคม', label_en: 'Leprosy (contagious stage)' },
  { key: 'tb', label_th: 'วัณโรคในระยะอันตราย', label_en: 'Tuberculosis (dangerous stage)' },
  { key: 'elephantiasis', label_th: 'โรคเท้าช้างในระยะที่ปรากฏอาการเป็นที่รังเกียจแก่สังคม', label_en: 'Elephantiasis (symptomatic stage)' },
  { key: 'drug_addiction', label_th: 'โรคติดยาเสพติดให้โทษ', label_en: 'Drug addiction' },
  { key: 'alcoholism', label_th: 'โรคพิษสุราเรื้อรัง', label_en: 'Chronic alcoholism' },
]

// ตรวจสุขภาพแรงงานต่างด้าวเพื่อต่อ Work Permit — 6 โรคต้องห้าม + รายการตรวจ
// (docs/foreign-worker-tiein.md — ประกาศกระทรวงสาธารณสุข พ.ศ. 2567)
export const WORK_PERMIT_ITEMS: Omit<CertDiseaseItem, 'result'>[] = [
  { key: 'leprosy', label_th: 'โรคเรื้อน (Leprosy)', label_en: 'Leprosy' },
  { key: 'tb', label_th: 'วัณโรคระยะอันตราย (Tuberculosis)', label_en: 'Tuberculosis (dangerous stage)' },
  { key: 'elephantiasis', label_th: 'โรคเท้าช้าง (Elephantiasis)', label_en: 'Elephantiasis' },
  { key: 'drug_addiction', label_th: 'โรคติดยาเสพติดให้โทษ (Drug Addiction)', label_en: 'Drug addiction' },
  { key: 'alcoholism', label_th: 'โรคพิษสุราเรื้อรัง (Chronic Alcoholism)', label_en: 'Chronic alcoholism' },
  { key: 'syphilis3', label_th: 'ซิฟิลิสระยะที่ 3 (Tertiary Syphilis)', label_en: 'Tertiary syphilis' },
  { key: 'general_exam', label_th: 'ตรวจสุขภาพทั่วไปโดยแพทย์ (น้ำหนัก/ส่วนสูง/ความดัน/ชีพจร)', label_en: 'General physical examination' },
  { key: 'urine_blood', label_th: 'ตรวจห้องปฏิบัติการ ปัสสาวะ + เลือด (MOPH LAB)', label_en: 'Urine and blood laboratory tests' },
  { key: 'chest_xray', label_th: 'เอกซเรย์ปอด (Chest X-ray)', label_en: 'Chest X-ray' },
]

export function seedDiseaseItems(certType: CertType): CertDiseaseItem[] {
  const base = certType === 'work_permit' ? WORK_PERMIT_ITEMS
    : certType === 'general' ? FIVE_DISEASES_TH
    : []
  return base.map((item) => ({ ...item, result: 'normal' as const }))
}

// Work Permit certs expire 90 days after the visit (fit for submission window
// used by employment offices); the clinic issues with a 60-day default so the
// paper never outlives the rule. Configurable at issue time.
export const WORK_PERMIT_VALID_DAYS = 60

// ── DB row shapes ─────────────────────────────────────────────────────────
export interface PatientSnapshot {
  name: string
  dob?: string | null
  gender?: string | null
  nationality?: string | null
  id_type?: string | null
  id_last4?: string | null
  employer_name?: string | null
  work_permit_no?: string | null
}

export interface CertExam {
  weight_kg?: number
  height_cm?: number
  bmi?: number
  bp_sys?: number
  bp_dia?: number
  pulse?: number
  doctor_opinion?: string
  employer_name?: string
  work_permit_no?: string
}

export interface MedicalCertificate {
  id: string
  cert_no?: string | null
  cert_type: CertType
  patient_id: string
  visit_date: string
  photo_path?: string | null
  patient_snapshot?: PatientSnapshot | null
  exam: CertExam
  disease_items?: CertDiseaseItem[] | null
  lab_analytes: LabAnalyte[]
  lab_report_id?: string | null
  summary?: string | null
  fit_status?: FitStatus | null
  valid_until?: string | null
  status: CertStatus
  public_token?: string | null
  doctor_name?: string | null
  doctor_license?: string | null
  issued_by?: string | null
  issued_at?: string | null
  revoked_by?: string | null
  revoked_at?: string | null
  revoke_reason?: string | null
  import_batch_id?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export function toBuddhistYear(date: Date): number {
  return date.getFullYear() + 543
}

export function formatCertNo(yearBE: number, n: number): string {
  return `WMC-${yearBE}-${String(n).padStart(6, '0')}`
}
