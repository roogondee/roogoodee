import type { Service } from '@/types'

// ── Analytes ─────────────────────────────────────────────────────────────
// HL7 Table 0078 interpretation codes (+ 'unknown' for unreadable values).
export type AnalyteFlag = 'N' | 'H' | 'L' | 'HH' | 'LL' | 'A' | 'unknown'

export interface LabAnalyte {
  test_name: string          // as printed on the report (may be Thai/English)
  canonical?: string         // normalized slug, e.g. 'hba1c', 'ldl', 'creatinine'
  loinc?: string             // LOINC code where confident, e.g. '4548-4'
  value: string              // kept as string: allows '<5', 'positive', '120'
  numeric_value?: number     // parsed when numeric, for comparison/charting
  unit?: string              // UCUM-normalized where possible
  reference_range?: string   // raw, as printed, e.g. '70-99'
  ref_low?: number
  ref_high?: number
  flag: AnalyteFlag
  category?: string          // 'glucose' | 'lipid' | 'kidney' | 'liver' | 'cbc' | ...
}

// ── Interpretation + upsell ───────────────────────────────────────────────
export type RiskLevel = 'green' | 'yellow' | 'red'

export interface LabInterpretation {
  headline: string
  summary: string
  findings: string[]
  recommendation: string
  disclaimer: string
  urgent: boolean
  health_score: number       // 0-100 (recomputed server-side, see score.ts)
  risk_level: RiskLevel
}

// Two kinds of upsell: standard clinical follow-up tests, and Roogondee pillars.
export type LabUpsell =
  | {
      kind: 'clinical_followup'
      title: string
      recommended_tests: string[]
      reason: string
      location: string         // e.g. 'W Medical Hospital สมุทรสาคร'
    }
  | {
      kind: 'pillar'
      service: Service
      reason: string
      voucher_hint?: string
    }

export interface LabExtractionResult {
  report_date: string | null  // ISO date found on the report (null if absent)
  lab_name: string | null
  analytes: LabAnalyte[]
  interpretation: LabInterpretation
  interpretation_en?: LabInterpretation  // English variant (bilingual report)
  upsell: LabUpsell[]
}

// ── Comparison (year-over-year timeline) ───────────────────────────────────
export type Trend = 'up' | 'down' | 'flat'
export type Direction = 'improved' | 'worsened' | 'stable' | 'unknown'

export interface AnalytePoint {
  report_id: string
  report_date: string
  value: string
  numeric_value?: number
  flag: AnalyteFlag
}

export interface AnalyteTimeline {
  canonical: string          // join key (canonical slug or normalized test_name)
  test_name: string
  unit?: string
  ref_low?: number
  ref_high?: number
  points: AnalytePoint[]     // chronological
  latest_trend: Trend
  direction: Direction
  latest_delta?: number
  latest_pct_change?: number
  crossed_into_abnormal: boolean
  crossed_into_normal: boolean
}

export interface PatientTimeline {
  patient_id: string
  analytes: AnalyteTimeline[]
}

// ── DB row shapes ──────────────────────────────────────────────────────────
export interface Patient {
  id: string
  name: string
  national_id_hash: string
  national_id_enc?: unknown
  phone?: string | null
  line_id?: string | null
  dob?: string | null
  gender?: 'male' | 'female' | 'other' | null
  consent_pdpa?: boolean
  consent_at?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface LabReport {
  id: string
  patient_id: string
  report_date: string
  lab_name?: string | null
  source_file_path?: string | null
  source_file_type?: string | null
  raw_extraction?: unknown
  analytes: LabAnalyte[]
  interpretation?: LabInterpretation | null
  interpretation_en?: LabInterpretation | null
  upsell?: LabUpsell[] | null
  health_score?: number | null
  risk_level?: RiskLevel | null
  status: 'pending_review' | 'confirmed'
  public_token?: string | null
  reviewer_name?: string | null
  reviewer_license?: string | null
  created_by?: string | null
  confirmed_by?: string | null
  confirmed_at?: string | null
  created_at?: string
}
