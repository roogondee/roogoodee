import type { Metadata } from 'next'
import ForeignHealthProgramClient from '@/components/pages/ForeignHealthProgramClient'

export const metadata: Metadata = {
  title: 'โปรแกรมดูแลสุขภาพแรงงานข้ามชาติ 6 ด้าน — สำหรับ HR และนายจ้าง | รู้ก่อนดี(รู้งี้)',
  description: 'ดูแลสุขภาพแรงงานเมียนมา ลาว เวียดนาม ตลอดทั้งปี ไม่ใช่แค่วันตรวจใบอนุญาต — ตรวจประจำปีและกลุ่มโรค NCDs, วัคซีนตามความเสี่ยงของงาน, อบรมสุขศึกษา, ช่องทางปรึกษาเมื่อเจ็บป่วย, สุขภาพจิต และโภชนาการ กับโรงพยาบาลพันธมิตรในสมุทรสาคร สอบถามและขอใบเสนอราคา โทร 081-902-3540',
  keywords: 'ดูแลสุขภาพแรงงานต่างด้าว, ส่งเสริมสุขภาพแรงงาน, อบรมสุขศึกษาแรงงาน, ตรวจสุขภาพประจำปีแรงงานต่างด้าว, วัคซีนแรงงานต่างด้าว, สวัสดิการสุขภาพแรงงาน สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/foreign/health-program' },
  openGraph: {
    title: 'โปรแกรมดูแลสุขภาพแรงงานข้ามชาติ 6 ด้าน — สำหรับ HR และนายจ้าง',
    description: 'ตรวจประจำปีและ NCDs, วัคซีนตามความเสี่ยงของงาน, อบรมสุขศึกษา, รักษาเบื้องต้น, สุขภาพจิต, โภชนาการ — สอบถาม โทร 081-902-3540',
    url: 'https://roogondee.com/foreign/health-program',
  },
}

export default function ForeignHealthProgramPage() {
  return <ForeignHealthProgramClient />
}
