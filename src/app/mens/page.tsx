import type { Metadata } from 'next'
import MensClient from '@/components/pages/MensClient'

export const metadata: Metadata = {
  title: 'สุขภาพชายวัย 40+ — ปรึกษาแพทย์ฟรี | รู้ก่อนดี(รู้งี้) สมุทรสาคร',
  description: 'พลังงาน อารมณ์ ฮอร์โมน — ปรึกษาแพทย์เฉพาะทางฟรี ภายใต้การดูแลของแพทย์ W Medical Hospital สมุทรสาคร ทำแบบประเมิน 1 นาที รับสิทธิ์ปรึกษาแพทย์',
  keywords: 'สุขภาพชายวัย 40, วัยทองชาย, andropause, ฮอร์โมนเพศชาย, testosterone, ตรวจสุขภาพชาย สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/mens' },
  openGraph: {
    title: 'สุขภาพชายวัย 40+ — ปรึกษาแพทย์ฟรี',
    description: 'พลังงาน อารมณ์ ฮอร์โมน — ดูแลโดยแพทย์ W Medical Hospital',
    url: 'https://roogondee.com/mens',
  },
}

export default function MensPage() {
  return <MensClient />
}
