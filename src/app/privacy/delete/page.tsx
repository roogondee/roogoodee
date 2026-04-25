import type { Metadata } from 'next'
import { Suspense } from 'react'
import DeleteRequestForm from '@/components/privacy/DeleteRequestForm'

export const metadata: Metadata = {
  title: 'ขอลบข้อมูลส่วนตัว (PDPA) — รู้ก่อนดี(รู้งี้)',
  description: 'ส่งคำขอลบข้อมูลส่วนบุคคลของคุณจากระบบรู้ก่อนดี(รู้งี้) ตาม พ.ร.บ. PDPA',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://roogondee.com/privacy/delete' },
}

export default function DeleteRequestPage() {
  return (
    <Suspense>
      <DeleteRequestForm />
    </Suspense>
  )
}
