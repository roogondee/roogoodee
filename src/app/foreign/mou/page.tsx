import type { Metadata } from 'next'
import ForeignMouClient from '@/components/pages/ForeignMouClient'

export const metadata: Metadata = {
  title: 'ตรวจสุขภาพแรงงานต่างด้าว MOU — เริ่ม 500 บาท รอผล 2 ชม. | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'ตรวจสุขภาพแรงงานต่างด้าวเพื่อทำ-ต่อ MOU และ Work Permit ที่ รพ. ได้รับอนุญาตจากกระทรวงสาธารณสุข และกรมการจัดหางาน กระทรวงแรงงาน สมุทรสาคร เริ่ม 500 บาท รอผล 1.5-2 ชม. ใบรับรองแพทย์ใช้ได้ 90 วัน โทร 081-902-3540',
  keywords: 'ตรวจสุขภาพ MOU, ตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร, ใบรับรองแพทย์ Work Permit, ตรวจโรคต้องห้ามแรงงานต่างด้าว',
  alternates: { canonical: 'https://roogondee.com/foreign/mou' },
  openGraph: {
    title: 'ตรวจสุขภาพแรงงานต่างด้าว MOU / Work Permit — รู้ผลวันเดียว',
    description: 'รพ. ได้รับอนุญาตจากกระทรวงสาธารณสุข เริ่ม 500 บาท รอผล 1.5-2 ชม. โทร 081-902-3540',
    url: 'https://roogondee.com/foreign/mou',
  },
}

export default function ForeignMouPage() {
  return <ForeignMouClient />
}
