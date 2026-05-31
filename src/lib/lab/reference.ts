// Sex/age-aware fallback reference ranges for common analytes.
// PRIORITY: always trust the range printed on the report first; use this table
// only when the report omits a range. Keyed by canonical slug.

export interface RefRange {
  low?: number
  high?: number
  unit?: string
}

interface RefRule {
  unit?: string
  // Optional predicates; first matching rule wins.
  gender?: 'male' | 'female'
  minAge?: number
  maxAge?: number
  low?: number
  high?: number
}

const TABLE: Record<string, RefRule[]> = {
  // Glucose / diabetes
  fbs:        [{ low: 70, high: 99, unit: 'mg/dL' }],
  hba1c:      [{ low: 0, high: 5.6, unit: '%' }],
  // Lipids
  ldl:        [{ high: 100, unit: 'mg/dL' }],
  hdl:        [{ gender: 'male', low: 40, unit: 'mg/dL' }, { gender: 'female', low: 50, unit: 'mg/dL' }, { low: 40, unit: 'mg/dL' }],
  triglyceride: [{ high: 150, unit: 'mg/dL' }],
  cholesterol: [{ high: 200, unit: 'mg/dL' }],
  // Kidney
  creatinine: [{ gender: 'male', low: 0.74, high: 1.35, unit: 'mg/dL' }, { gender: 'female', low: 0.59, high: 1.04, unit: 'mg/dL' }, { low: 0.6, high: 1.3, unit: 'mg/dL' }],
  egfr:       [{ low: 90, unit: 'mL/min/1.73m2' }],
  // Liver
  alt:        [{ gender: 'male', high: 41, unit: 'U/L' }, { gender: 'female', high: 33, unit: 'U/L' }, { high: 40, unit: 'U/L' }],
  ast:        [{ high: 40, unit: 'U/L' }],
  // CBC
  hemoglobin: [{ gender: 'male', low: 13, high: 17, unit: 'g/dL' }, { gender: 'female', low: 12, high: 15, unit: 'g/dL' }, { low: 12, high: 17, unit: 'g/dL' }],
  hematocrit: [{ gender: 'male', low: 39, high: 50, unit: '%' }, { gender: 'female', low: 36, high: 46, unit: '%' }, { low: 36, high: 50, unit: '%' }],
}

function ageFromDob(dob?: string | null): number | undefined {
  if (!dob) return undefined
  const d = new Date(dob)
  if (isNaN(d.getTime())) return undefined
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

export function getReferenceRange(
  canonical: string | undefined,
  patient: { gender?: 'male' | 'female' | 'other' | null; dob?: string | null }
): RefRange | null {
  if (!canonical) return null
  const rules = TABLE[canonical.toLowerCase()]
  if (!rules) return null
  const age = ageFromDob(patient.dob)
  for (const r of rules) {
    if (r.gender && r.gender !== patient.gender) continue
    if (r.minAge != null && (age == null || age < r.minAge)) continue
    if (r.maxAge != null && (age == null || age > r.maxAge)) continue
    return { low: r.low, high: r.high, unit: r.unit }
  }
  return null
}
