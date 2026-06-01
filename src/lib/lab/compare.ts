import type {
  AnalyteTimeline,
  AnalytePoint,
  Direction,
  LabAnalyte,
  PatientTimeline,
  Trend,
} from './types'

// Analytes where a LOWER value is the healthier direction.
const LOWER_IS_BETTER = new Set([
  'ldl', 'fbs', 'hba1c', 'creatinine', 'triglyceride', 'cholesterol',
  'alt', 'ast', 'urine_protein', 'glucose',
])
// Analytes where a HIGHER value is the healthier direction.
const HIGHER_IS_BETTER = new Set([
  'hdl', 'egfr', 'hemoglobin', 'hematocrit',
])

function isAbnormal(flag: LabAnalyte['flag']): boolean {
  return flag === 'H' || flag === 'L' || flag === 'HH' || flag === 'LL' || flag === 'A'
}

function joinKey(a: LabAnalyte): string {
  return (a.canonical || a.test_name || '').trim().toLowerCase()
}

interface ReportInput {
  id: string
  report_date: string
  analytes: LabAnalyte[]
}

// Build a per-analyte timeline across ALL of a patient's confirmed reports.
// Reports may be passed in any order; sorted chronologically here.
export function buildTimeline(reports: ReportInput[]): PatientTimeline {
  const sorted = [...reports].sort(
    (a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
  )

  const byKey = new Map<string, { meta: LabAnalyte; points: AnalytePoint[] }>()

  for (const report of sorted) {
    for (const a of report.analytes) {
      const key = joinKey(a)
      if (!key) continue
      if (!byKey.has(key)) byKey.set(key, { meta: a, points: [] })
      const entry = byKey.get(key)!
      entry.meta = a // keep latest metadata (unit, ref range, name)
      entry.points.push({
        report_id: report.id,
        report_date: report.report_date,
        value: a.value,
        numeric_value: a.numeric_value,
        flag: a.flag,
      })
    }
  }

  const analytes: AnalyteTimeline[] = []
  Array.from(byKey.keys()).forEach((key) => {
    const { meta, points } = byKey.get(key)!
    const last = points[points.length - 1]
    const prev = points.length >= 2 ? points[points.length - 2] : undefined

    let latest_trend: Trend = 'flat'
    let latest_delta: number | undefined
    let latest_pct_change: number | undefined
    let direction: Direction = 'unknown'

    if (prev && last.numeric_value != null && prev.numeric_value != null) {
      latest_delta = +(last.numeric_value - prev.numeric_value).toFixed(4)
      latest_pct_change =
        prev.numeric_value !== 0
          ? +((latest_delta / Math.abs(prev.numeric_value)) * 100).toFixed(1)
          : undefined
      latest_trend = latest_delta > 0 ? 'up' : latest_delta < 0 ? 'down' : 'flat'

      if (latest_delta === 0) {
        direction = 'stable'
      } else if (LOWER_IS_BETTER.has(key)) {
        direction = latest_delta < 0 ? 'improved' : 'worsened'
      } else if (HIGHER_IS_BETTER.has(key)) {
        direction = latest_delta > 0 ? 'improved' : 'worsened'
      }
    }

    const crossed_into_abnormal = !!prev && !isAbnormal(prev.flag) && isAbnormal(last.flag)
    const crossed_into_normal = !!prev && isAbnormal(prev.flag) && !isAbnormal(last.flag)

    analytes.push({
      canonical: key,
      test_name: meta.test_name,
      unit: meta.unit,
      ref_low: meta.ref_low,
      ref_high: meta.ref_high,
      points,
      latest_trend,
      direction,
      latest_delta,
      latest_pct_change,
      crossed_into_abnormal,
      crossed_into_normal,
    })
  })

  // Surface worsened / newly-abnormal analytes first for the UI.
  analytes.sort((a, b) => {
    const score = (t: AnalyteTimeline) =>
      (t.crossed_into_abnormal ? 2 : 0) + (t.direction === 'worsened' ? 1 : 0)
    return score(b) - score(a)
  })

  return { patient_id: '', analytes }
}
