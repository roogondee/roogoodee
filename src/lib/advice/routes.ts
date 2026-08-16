// Service routing table for the advice agent — split out from advice/tools.ts
// so it can be imported from CLIENT components too (AdviceChat renders the
// same CTA link the agent hands out). Only depends on liff-links.ts, which
// reads NEXT_PUBLIC_* env vars and is already safe in client bundles.
//
// Do NOT import agent/tools.ts or anything touching supabaseAdmin here —
// that pulls the service-role client (and Resend/LINE push credentials) into
// the browser bundle.

import type { Service } from '@/types'
import { liffQuizUrl, LINE_OA_URL } from '@/lib/liff-links'

// What each pillar actually gives a walk-in visitor, in the words we are
// allowed to use. `free` is the offer copy — it must stay accurate, because the
// model reads it out loud. Note dna: the consultation is free, the test is not.
export interface RouteTarget {
  label: string
  fits: string
  free: string
  note?: string
}

export const ROUTES: Record<Service | 'general', RouteTarget> = {
  glp1: {
    label: 'GLP-1 ลดน้ำหนัก',
    fits: 'น้ำหนักเกิน BMI สูง เบาหวาน/ก่อนเบาหวาน ไขมันพอกตับ',
    free: 'ปรึกษาแพทย์ + ตรวจน้ำตาลสะสม FBS และ HbA1c ฟรี (มูลค่า 500 บาท)',
    note: 'ยา GLP-1 เป็นยาควบคุม ต้องให้แพทย์ประเมินก่อนเท่านั้น',
  },
  std: {
    label: 'ตรวจ STD & PrEP HIV',
    fits: 'มีความเสี่ยงทางเพศ แผล/ตกขาว/ปัสสาวะแสบขัด อยากตรวจ HIV หรือขอ PrEP/PEP',
    free: 'ตรวจ HIV และซิฟิลิสฟรี รู้ผลใน 1 ชั่วโมง',
    note: 'PEP ต้องเริ่มภายใน 72 ชั่วโมงหลังเสี่ยง — ถ้าเข้าข่ายให้รีบติดต่อทันที',
  },
  ckd: {
    label: 'CKD คลินิกโรคไต',
    fits: 'ปัสสาวะเป็นฟอง บวมที่ขา/หนังตา ความดันสูง เบาหวานมานาน ค่าไตผิดปกติ',
    free: 'ตรวจโปรตีนในปัสสาวะฟรี + ปรึกษาแพทย์',
  },
  foreign: {
    label: 'ตรวจสุขภาพแรงงานต่างด้าว',
    fits: 'ต้องการใบรับรองแพทย์เพื่อทำ/ต่อ Work Permit หรือ MOU',
    free: 'ตรวจตามมาตรฐานกรมการจัดหางาน ใบรับรองแพทย์ 2 ภาษา (มีค่าใช้จ่าย เริ่ม 500 บาท/คน)',
    note: 'เป็นบริการ B2B/เอกสาร ไม่ใช่การรักษาอาการเจ็บป่วย',
  },
  mens: {
    label: 'สุขภาพชายวัย 40+',
    fits: 'ผู้ชาย 40 ปีขึ้นไป อ่อนเพลียเรื้อรัง อารมณ์แปรปรวน สงสัยฮอร์โมนลดลง',
    free: 'ปรึกษาแพทย์ฟรี',
    note: 'ห้ามระบุชื่อยาใดๆ ทั้งสิ้น ค่ายาและการตรวจเพิ่มเป็นดุลยพินิจของแพทย์',
  },
  women: {
    label: 'สุขภาพเพศหญิง',
    fits: 'ตกขาวผิดปกติ ประจำเดือนผิดปกติ ปวดท้องน้อย วัยทอง ตรวจ HPV/แปปสเมียร์',
    free: 'ปรึกษาสูตินรีแพทย์ฟรี + ตรวจประเมินเบื้องต้น',
    note: 'เลือดออกผิดปกติทางช่องคลอดถือเป็นสัญญาณที่ต้องพบแพทย์เร็ว',
  },
  mind: {
    label: 'สุขภาพจิต & ความสัมพันธ์',
    fits: 'เครียดสะสม นอนไม่หลับเรื้อรัง เศร้าต่อเนื่อง วิตกกังวล ปัญหาความสัมพันธ์',
    free: 'ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (ทางออนไลน์)',
    note: 'ขณะนี้เป็นช่วง soft launch — ทีมจะติดต่อกลับเพื่อจัดคิวภายใน 1-2 สัปดาห์',
  },
  dna: {
    label: 'ตรวจ DNA พิสูจน์บิดา-บุตร',
    fits: 'ต้องการพิสูจน์ความเป็นพ่อ-ลูก ทั้งแบบใช้ทางกฎหมายและเพื่อความสบายใจ',
    free: 'ปรึกษาฟรี (ตัวการตรวจมีค่าใช้จ่ายประมาณ 6,000-15,000 บาท ไม่ใช่ตรวจฟรี)',
    note: 'ต้องมีความยินยอมจากทุกฝ่าย ห้ามรับตรวจแบบแอบเก็บตัวอย่าง และห้ามรับประกันผลทางคดี',
  },
  general: {
    label: 'ปรึกษาทีมงานทาง LINE',
    fits: 'อาการเจ็บป่วยทั่วไปที่ยังไม่เข้ากับบริการเฉพาะทางของเรา',
    free: 'ทีมพยาบาลช่วยประเมินอาการเบื้องต้นและนัดพบแพทย์ที่โรงพยาบาลพันธมิตรให้',
  },
}

export function nextStepUrl(service: Service | 'general'): string {
  if (service === 'general') return LINE_OA_URL
  return liffQuizUrl({ service, utm_source: 'advice', utm_medium: 'advice_chat' })
}

// Every value the `leads.service` column accepts from the advice agent —
// mirrors agent/tools.ts' ALL_LEAD_SERVICES (kept in sync manually; both are
// small, static, and rarely change).
const KNOWN_SERVICES = new Set(Object.keys(ROUTES))

export function serviceRoute(service: string): { label: string; url: string } {
  const key = (KNOWN_SERVICES.has(service) ? service : 'general') as Service | 'general'
  return { label: ROUTES[key].label, url: nextStepUrl(key) }
}
