import type { Service } from '@/types'
import type { LabAnalyte, LabUpsell } from './types'

export const W_MEDICAL = 'W Medical Hospital สมุทรสาคร'

// Voucher copy per pillar (mirrors content-gen SERVICE_META).
export const PILLAR_HINT: Partial<Record<Service, string>> = {
  glp1: 'รับฟรี FBS+HbA1c (มูลค่า 500฿) ที่ W Medical Hospital',
  std: 'ตรวจ HIV+Syphilis ฟรี รู้ผลใน 1 ชั่วโมง',
  ckd: 'ตรวจปัสสาวะหาโปรตีนฟรี ที่ W Medical Hospital',
  mens: 'ปรึกษาแพทย์ฟรี เรื่องสุขภาพชายวัย 40+',
  women: 'ปรึกษาสูตินรีแพทย์ฟรี + ตรวจประเมินเบื้องต้น',
  mind: 'ปรึกษาผู้เชี่ยวชาญด้านสุขภาพจิตฟรี',
}

// Which pillar an abnormal analyte suggests.
const CANONICAL_TO_PILLAR: Record<string, Service> = {
  fbs: 'glp1',
  hba1c: 'glp1',
  glucose: 'glp1',
  creatinine: 'ckd',
  egfr: 'ckd',
  urine_protein: 'ckd',
  ldl: 'mens',
  triglyceride: 'mens',
  cholesterol: 'mens',
}

export function pillarForAnalyte(canonical?: string): Service | null {
  if (!canonical) return null
  return CANONICAL_TO_PILLAR[canonical.toLowerCase()] ?? null
}

export function pillarUpsell(service: Service, reason: string): LabUpsell {
  return { kind: 'pillar', service, reason, voucher_hint: PILLAR_HINT[service] }
}

export function clinicalUpsell(
  title: string,
  recommended_tests: string[],
  reason: string
): LabUpsell {
  return { kind: 'clinical_followup', title, recommended_tests, reason, location: W_MEDICAL }
}

function isAbnormal(flag: LabAnalyte['flag']): boolean {
  return flag === 'H' || flag === 'L' || flag === 'HH' || flag === 'LL' || flag === 'A'
}

// Deterministic fallback upsell derived from abnormal analytes — used to
// backstop / sanity-check the model's own upsell suggestions.
export function deriveUpsell(analytes: LabAnalyte[]): LabUpsell[] {
  const pillars = new Set<Service>()
  for (const a of analytes) {
    if (!isAbnormal(a.flag)) continue
    const p = pillarForAnalyte(a.canonical)
    if (p) pillars.add(p)
  }
  return Array.from(pillars).map((p) =>
    pillarUpsell(p, 'พบค่าที่ควรดูแลต่อเนื่อง แนะนำบริการที่เกี่ยวข้อง')
  )
}
