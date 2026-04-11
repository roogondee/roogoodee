import type { Metadata } from 'next'
import PrivacyClient from '@/components/pages/PrivacyClient'

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว (PDPA) — รู้ก่อนดี',
  description: 'นโยบายความเป็นส่วนตัวของรู้ก่อนดี การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตาม พ.ร.บ. PDPA',
  alternates: { canonical: 'https://roogondee.com/privacy' },
}

export default function PrivacyPage() {
  return <PrivacyClient />
}
