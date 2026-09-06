import type { Metadata } from 'next'
import ForeignDeadlineClient from '@/components/pages/ForeignDeadlineClient'

export const metadata: Metadata = {
  title: 'ต่ออายุ/ตรวจสุขภาพแรงงานต่างด้าว ก่อนหมดเขต 11 ธ.ค. 2569 | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'นายจ้างและแรงงานต่างด้าวต้องตรวจสุขภาพ/ต่ออายุใบอนุญาตทำงานให้เรียบร้อยก่อนวันที่ 11 ธันวาคม 2569 ที่ รพ. ได้รับอนุญาต เริ่ม 500 บาท รอผล 1.5-2 ชม. โทร 081-902-3540',
  keywords: 'ต่ออายุใบอนุญาตทำงาน 2569, ตรวจสุขภาพแรงงานต่างด้าว เดดไลน์, ต่อ Work Permit สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/foreign/deadline-2569' },
  openGraph: {
    title: 'ต่ออายุ/ตรวจสุขภาพแรงงานต่างด้าว ก่อนหมดเขต 11 ธ.ค. 2569',
    description: 'รพ. ได้รับอนุญาตจากกระทรวงสาธารณสุข เริ่ม 500 บาท รอผล 1.5-2 ชม. โทร 081-902-3540',
    url: 'https://roogondee.com/foreign/deadline-2569',
  },
}

const DEADLINE = new Date('2026-12-11T00:00:00+07:00')

function daysUntilDeadline(): number {
  const now = new Date()
  const diffMs = DEADLINE.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export default function ForeignDeadlinePage() {
  return <ForeignDeadlineClient daysLeft={daysUntilDeadline()} />
}
