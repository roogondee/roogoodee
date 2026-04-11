import type { Metadata } from 'next'
import CKDClient from '@/components/pages/CKDClient'

export const metadata: Metadata = {
  title: 'CKD Clinic โรคไตเรื้อรัง — ชะลอการเสื่อมของไต | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'ดูแลผู้ป่วย CKD ทุกระยะ ประเมิน eGFR ฟรี แผนอาหารเฉพาะบุคคล ชะลอการเสื่อมของไต โดยอายุรแพทย์โรคไต W Medical Hospital สมุทรสาคร',
  keywords: 'CKD สมุทรสาคร, โรคไตเรื้อรัง, eGFR, ล้างไต, อาหารผู้ป่วยไต',
  alternates: { canonical: 'https://roogondee.com/ckd' },
  openGraph: {
    title: 'CKD Clinic โรคไตเรื้อรัง — ชะลอการเสื่อมของไต',
    description: 'ดูแลผู้ป่วย CKD ทุกระยะ ประเมิน eGFR ฟรี',
    url: 'https://roogondee.com/ckd',
  },
}

export default function CKDPage() {
  return <CKDClient />
}
