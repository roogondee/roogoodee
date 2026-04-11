import type { Metadata } from 'next'
import ForeignClient from '@/components/pages/ForeignClient'

export const metadata: Metadata = {
  title: 'ตรวจสุขภาพแรงงานต่างด้าว — ใบรับรองแพทย์วันเดียว | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'ตรวจสุขภาพแรงงานต่างด้าว 4 สัญชาติ พม่า กัมพูชา ลาว เวียดนาม ออกใบรับรองแพทย์ภายในวันเดียว',
  keywords: 'ตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร, ใบรับรองแพทย์แรงงาน',
  alternates: { canonical: 'https://roogondee.com/foreign' },
  openGraph: {
    title: 'ตรวจสุขภาพแรงงานต่างด้าว — ใบรับรองแพทย์วันเดียว',
    description: 'ตรวจสุขภาพแรงงาน 4 สัญชาติ ราคาพิเศษหมู่คณะ',
    url: 'https://roogondee.com/foreign',
  },
}

export default function ForeignPage() {
  return <ForeignClient />
}
