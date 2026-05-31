import type { LabAnalyte, RiskLevel } from './types'

// Deterministic, auditable health score (NOT LLM-fabricated).
// Start at 100, deduct per abnormal analyte weighted by severity.
const WEIGHT: Record<string, number> = {
  HH: 25,
  LL: 25,
  A: 15,
  H: 10,
  L: 10,
  N: 0,
  unknown: 0,
}

export interface HealthScore {
  score: number
  risk_level: RiskLevel
  urgent: boolean
}

export function computeHealthScore(analytes: LabAnalyte[]): HealthScore {
  let score = 100
  let urgent = false
  for (const a of analytes) {
    score -= WEIGHT[a.flag] ?? 0
    if (a.flag === 'HH' || a.flag === 'LL') urgent = true
  }
  score = Math.max(0, Math.min(100, score))

  const risk_level: RiskLevel = urgent || score < 60 ? 'red' : score < 85 ? 'yellow' : 'green'
  return { score, risk_level, urgent }
}
