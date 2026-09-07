import type { Metadata } from 'next'
import ForeignWorkPermitClient from '@/components/pages/ForeignWorkPermitClient'

export const metadata: Metadata = {
  title: 'ต่ออายุใบอนุญาตทำงานแรงงานต่างด้าว 2569 — ตรวจสุขภาพที่ W Medical | รู้ก่อนดี(รู้งี้)',
  description: 'แรงงานลาว เมียนมา เวียดนาม (กลุ่มมติ ครม. 11 ธ.ค. 2569) ยื่นต่ออายุใบอนุญาตทำงานได้ถึง 11 ธ.ค. 2569 ผ่าน eworkpermit.doe.go.th ตรวจสุขภาพขั้นตอนแรกที่ W Medical Hospital รพ. เชื่อมข้อมูลกรมการจัดหางาน เริ่ม 500 บาท/คน โทร 081-902-3540',
  keywords: 'ต่อใบอนุญาตทำงาน 2569, ต่อ work permit แรงงานต่างด้าว, eworkpermit, ตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร, มติ ครม. 11 ธันวาคม 2569',
  alternates: { canonical: 'https://roogondee.com/foreign/workpermit' },
  openGraph: {
    title: 'ต่ออายุใบอนุญาตทำงานแรงงานต่างด้าว 2569 — ตรวจสุขภาพที่ W Medical',
    description: 'ยื่นต่ออายุได้ถึง 11 ธ.ค. 2569 ผ่าน eworkpermit.doe.go.th — ตรวจสุขภาพเริ่ม 500 บาท/คน โทร 081-902-3540',
    url: 'https://roogondee.com/foreign/workpermit',
  },
}

const DEADLINE = new Date('2026-12-11T00:00:00+07:00')

function daysUntilDeadline(): number {
  const now = new Date()
  const diffMs = DEADLINE.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export default function ForeignWorkPermitPage() {
  return <ForeignWorkPermitClient daysLeft={daysUntilDeadline()} />
}
