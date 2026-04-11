import type { Metadata } from 'next'
import STDClient from '@/components/pages/STDClient'

export const metadata: Metadata = {
  title: 'ตรวจ STD & PrEP HIV — ปลอดภัย ไม่ตัดสิน | รู้ก่อนดี สมุทรสาคร',
  description: 'ตรวจโรคติดต่อทางเพศสัมพันธ์ครบ 10 โรค, PrEP/PEP ป้องกัน HIV ผลตรวจเป็นความลับ 100% ทีมไม่ตัดสิน รับผล 24 ชั่วโมง',
  keywords: 'ตรวจ STD สมุทรสาคร, PrEP HIV, ตรวจโรคซิฟิลิส, ตรวจหนองใน, PEP ยาฉุกเฉิน',
  alternates: { canonical: 'https://roogondee.com/std' },
  openGraph: {
    title: 'ตรวจ STD & PrEP HIV — ปลอดภัย ไม่ตัดสิน',
    description: 'ตรวจโรคติดต่อทางเพศสัมพันธ์ครบ 10 โรค, PrEP/PEP ป้องกัน HIV ผลลับ 100%',
    url: 'https://roogondee.com/std',
  },
}

export default function STDPage() {
  return <STDClient />
}
