export type DetectedService = 'std' | 'glp1' | 'ckd' | 'foreign' | 'general'

const SERVICE_KEYWORDS: Record<Exclude<DetectedService, 'general'>, string[]> = {
  std:     ['std', 'hiv', 'prep', 'pep', 'ซิฟิลิส', 'หนองใน', 'เริม', 'ตรวจเลือด', 'ตรวจโรค', 'เพศสัมพันธ์'],
  glp1:    ['glp', 'ozempic', 'saxenda', 'ลดน้ำหนัก', 'อ้วน', 'bmi', 'ยาฉีด', 'เบาหวาน'],
  ckd:     ['ไต', 'ckd', 'ครีเอตินิน', 'creatinine', 'egfr', 'ล้างไต', 'โรคไต'],
  foreign: ['แรงงาน', 'ต่างด้าว', 'myanmar', 'เมียนมา', 'กัมพูชา', 'ลาว', 'เวียดนาม', 'ใบรับรองแพทย์', 'work permit'],
}

export function detectService(text: string): DetectedService {
  const lower = text.toLowerCase()
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return service as DetectedService
  }
  return 'general'
}

export const VOUCHER_REGEX = /RGD-(GLP1|CKD|STD|FRN)-[A-Z0-9]{6}/

export function extractVoucherCode(text: string): string | null {
  const m = text.trim().toUpperCase().match(VOUCHER_REGEX)
  return m ? m[0] : null
}
