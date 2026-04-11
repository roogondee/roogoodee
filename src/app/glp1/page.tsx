import type { Metadata } from 'next'
import GLP1Client from '@/components/pages/GLP1Client'

export const metadata: Metadata = {
  title: 'ยา GLP-1 ลดน้ำหนักถาวร — ภายใต้การดูแลแพทย์ | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'ยา GLP-1 (Ozempic, Saxenda) ลดน้ำหนักอย่างปลอดภัยภายใต้การดูแลแพทย์ ประเมิน BMI ฟรี เหมาะสำหรับ BMI ≥ 27.5 ที่มีโรคร่วม หรือ BMI ≥ 30',
  keywords: 'GLP-1 สมุทรสาคร, Ozempic ราคา, Saxenda ราคา, ยาลดน้ำหนัก GLP-1, ลดน้ำหนักด้วยแพทย์',
  alternates: { canonical: 'https://roogondee.com/glp1' },
  openGraph: {
    title: 'ยา GLP-1 ลดน้ำหนักถาวร — ภายใต้การดูแลแพทย์',
    description: 'ยา GLP-1 ปลอดภัย ภายใต้การดูแลแพทย์ ประเมิน BMI ฟรี',
    url: 'https://roogondee.com/glp1',
  },
}

export default function GLP1Page() {
  return <GLP1Client />
}
