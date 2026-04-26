import { Suspense } from 'react'
import type { Metadata } from 'next'
import LineLeadForm from '@/components/ui/LineLeadForm'

export const metadata: Metadata = {
  title: 'ขอรับข้อมูล — รู้ก่อนดี(รู้งี้)',
  description: 'กรอกชื่อและเบอร์ ทีมโทรกลับใน 30 นาที ไม่ตัดสิน เป็นความลับ',
  // Don't index this — it's a campaign landing page meant to be reached only
  // from a specific LINE OA broadcast click.
  robots: { index: false, follow: false },
}

export default function LineLeadPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-4xl mb-4">🌿</div>
            <p>กำลังโหลด...</p>
          </div>
        </main>
      }
    >
      <LineLeadForm />
    </Suspense>
  )
}
