// LINE message bodies sent to patients (§1.5). NEUTRAL by design: no
// diagnosis, no drug name, no dose, no lab value — only that it is time for
// a follow-up, and a LIFF link that requires LINE login to see any detail.
// The acceptance test for this file scans the output for forbidden words.

import { HOSPITAL_PHONE } from './config.ts'
import { formatThaiDate, type IsoDate } from './dates.ts'

export function visitReminderText(scheduledDate: IsoDate, liffUrl: string | null): string {
  const lines = [
    'ถึงเวลานัดติดตามการดูแลของคุณ',
    `วันที่ ${formatThaiDate(scheduledDate)}`,
    '',
    liffUrl ? `ดูรายละเอียดนัดหมาย: ${liffUrl}` : `สอบถาม/เลื่อนนัด โทร ${HOSPITAL_PHONE}`,
  ]
  return lines.join('\n')
}

export function surveyInviteText(liffUrl: string): string {
  return [
    'ก่อนถึงวันนัด ช่วยตอบแบบสอบถามสั้น ๆ เกี่ยวกับอาการช่วงนี้ (ไม่เกิน 1 นาที)',
    liffUrl,
    '',
    `หากมีอาการผิดปกติรุนแรง กรุณาโทร ${HOSPITAL_PHONE} ทันที`,
  ].join('\n')
}

export function lineFollowupText(liffUrl: string | null): string {
  return [
    'ทีมดูแลขอติดตามอาการช่วงนี้ของคุณสักครู่',
    liffUrl ? `ตอบแบบสอบถาม: ${liffUrl}` : `ตอบกลับข้อความนี้ได้เลย หรือโทร ${HOSPITAL_PHONE}`,
  ].join('\n')
}

// Words that must never appear in a patient-facing LINE message.
export const FORBIDDEN_IN_LINE = [
  'mounjaro', 'wegovy', 'tirzepatide', 'semaglutide', 'ozempic', 'saxenda',
  'mg', 'hba1c', 'fbs', 'เบาหวาน', 'diabetes', 'glp', 'โรคอ้วน', 'obesity', 'insulin', 'อินซูลิน',
]

export function containsForbidden(text: string): string[] {
  const lower = text.toLowerCase()
  return FORBIDDEN_IN_LINE.filter(w => lower.includes(w))
}
