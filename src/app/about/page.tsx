import type { Metadata } from 'next'
import AboutClient from '@/components/pages/AboutClient'

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา — รู้ก่อนดี | บริษัท เจียรักษา จำกัด',
  description: 'รู้ก่อนดีดำเนินงานโดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/about' },
  openGraph: {
    title: 'เกี่ยวกับรู้ก่อนดี',
    description: 'ทีมผู้เชี่ยวชาญด้านสุขภาพ ปรึกษาฟรี ไม่ตัดสิน สมุทรสาคร',
    url: 'https://roogondee.com/about',
  },
}

export default function AboutPage() {
  return <AboutClient />
}
