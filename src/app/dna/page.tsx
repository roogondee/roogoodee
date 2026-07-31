import type { Metadata } from 'next'
import DnaClient from '@/components/pages/DnaClient'

export const metadata: Metadata = {
  title: 'ตรวจ DNA พิสูจน์บิดา-บุตร — ปรึกษาฟรี เป็นความลับ | รู้ก่อนดี(รู้งี้)',
  description: 'ปรึกษาการตรวจ DNA พิสูจน์ความเป็นพ่อ-ลูกฟรี — จดทะเบียนรับรองบุตร คดีความ มรดก สัญชาติ หรือเพื่อความสบายใจ นัดหมายเก็บตัวอย่างกับสถานพยาบาล/ห้องปฏิบัติการมาตรฐาน เป็นความลับ ไม่ตัดสิน',
  keywords: 'ตรวจ DNA พ่อลูก, พิสูจน์บุตร, จดทะเบียนรับรองบุตร, ตรวจ DNA ราคา, พิสูจน์ความเป็นพ่อ, DNA พิสูจน์สายเลือด',
  alternates: { canonical: 'https://roogondee.com/dna' },
  openGraph: {
    title: 'ตรวจ DNA พิสูจน์บิดา-บุตร — ปรึกษาฟรี เป็นความลับ',
    description: 'ประเมินเคสของคุณฟรี — ตรวจแบบใช้ทางกฎหมายหรือเพื่อความสบายใจ นัดหมายกับสถานพยาบาล/แล็บมาตรฐาน',
    url: 'https://roogondee.com/dna',
  },
}

export default function DnaPage() {
  return <DnaClient />
}
