import type { Metadata } from 'next'
import AdviceClient from '@/components/pages/AdviceClient'

export const metadata: Metadata = {
  title: 'ปรึกษาอาการเจ็บป่วยฟรี — AI ประเมินเบื้องต้น + แพทย์จริง | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'ไม่สบาย ไม่รู้จะเริ่มตรงไหน? พิมพ์อาการที่เป็นอยู่ ปรึกษาฟรีกับผู้ช่วยแนะนำสุขภาพ AI ประเมินความเร่งด่วนทันที ก่อนส่งต่อแพทย์จริงที่โรงพยาบาลพันธมิตร สมุทรสาคร ไม่วินิจฉัย ไม่สั่งยา ฉุกเฉินโทร 1669',
  keywords: 'ปรึกษาอาการฟรี, หมอออนไลน์ฟรี, ปวดท้อง, ไข้ไม่ลด, ปัสสาวะแสบขัด, ปรึกษาแพทย์ฟรี สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/advice' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'ปรึกษาอาการเจ็บป่วยฟรี — AI ประเมินเบื้องต้น + แพทย์จริง',
    description: 'พิมพ์อาการที่เป็นอยู่ รับคำแนะนำทันที ฟรี ไม่ตัดสิน ก่อนส่งต่อแพทย์จริง',
    url: 'https://roogondee.com/advice',
  },
}

export default function AdvicePage() {
  return <AdviceClient />
}
