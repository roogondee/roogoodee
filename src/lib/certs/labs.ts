import type { LabAnalyte, AnalyteFlag } from '@/lib/lab/types'
import { getReferenceRange } from '@/lib/lab/reference'

// Map a raw lab value (from a form row or CSV `lab:` column) into a LabAnalyte,
// computing the flag against a printed range or the fallback reference table.
// Qualitative results ('positive'/'reactive'/'ปกติ') are handled too.
export function buildAnalyte(
  testName: string,
  rawValue: string,
  patient: { gender?: 'male' | 'female' | 'other' | null; dob?: string | null },
  opts: { canonical?: string; unit?: string; referenceRange?: string } = {}
): LabAnalyte {
  const value = (rawValue || '').trim()
  const canonical = (opts.canonical ?? testName.toLowerCase().replace(/[^a-z0-9]/g, '')) || undefined
  const ref = getReferenceRange(canonical, patient)
  const numeric = Number(value.replace(/[<>~=]/g, ''))
  const isNumeric = value !== '' && !Number.isNaN(numeric)

  let flag: AnalyteFlag = 'unknown'
  const refLow = ref?.low
  const refHigh = ref?.high

  if (isNumeric && (refLow != null || refHigh != null)) {
    if (refHigh != null && numeric > refHigh) flag = 'H'
    else if (refLow != null && numeric < refLow) flag = 'L'
    else flag = 'N'
  } else if (!isNumeric && value) {
    const v = value.toLowerCase()
    if (/(positive|reactive|detected|abnormal|ผิดปกติ|พบ|บวก)/.test(v)) flag = 'A'
    else if (/(negative|non-reactive|not detected|normal|ปกติ|ไม่พบ|ลบ)/.test(v)) flag = 'N'
  }

  return {
    test_name: testName,
    canonical,
    value,
    numeric_value: isNumeric ? numeric : undefined,
    unit: opts.unit ?? ref?.unit,
    reference_range: opts.referenceRange
      ?? (refLow != null || refHigh != null ? `${refLow ?? ''}-${refHigh ?? ''}` : undefined),
    ref_low: refLow,
    ref_high: refHigh,
    flag,
  }
}
