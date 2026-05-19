import type { Metadata } from 'next'
import WomenClient from '@/components/pages/WomenClient'

export const metadata: Metadata = {
  title: 'สุขภาพเพศหญิง — ปรึกษาสูตินรีแพทย์ฟรี | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'HPV / Pap smear / ตกขาว / ประจำเดือน / วัยทอง — ปรึกษาสูตินรีแพทย์ฟรี ภายใต้การดูแลของแพทย์ W Medical Hospital สมุทรสาคร เป็นความลับ ไม่ตัดสิน',
  keywords: 'สุขภาพเพศหญิง, สูตินรีแพทย์, pap smear, hpv, ตกขาว, ประจำเดือน, วัยทอง, สมุทรสาคร, คุมกำเนิด',
  alternates: { canonical: 'https://roogondee.com/women' },
  openGraph: {
    title: 'สุขภาพเพศหญิง — ปรึกษาสูตินรีแพทย์ฟรี',
    description: 'HPV, Pap smear, ตกขาว, ประจำเดือน, วัยทอง — ดูแลโดย W Medical Hospital',
    url: 'https://roogondee.com/women',
  },
}

export default function WomenPage() {
  return <WomenClient />
}
