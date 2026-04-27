import { Suspense } from 'react'
import type { Metadata } from 'next'
import LiffLeadForm from '@/components/ui/LiffLeadForm'

export const metadata: Metadata = {
  title: 'รับข้อมูลผ่าน LINE — รู้ก่อนดี(รู้งี้)',
  description: 'กรอกชื่อและเบอร์ ทีมโทรกลับใน 30 นาที',
  robots: { index: false, follow: false },
}

// LIFF endpoint — register https://roogondee.com/lead/liff in LINE Developers
// Console (Channel → LIFF → Add). Set NEXT_PUBLIC_LIFF_ID to the resulting
// LIFF ID; the page falls back to a plain form if the SDK can't initialise
// (e.g. opened in a normal browser or if env var is missing).
export default function LiffLeadPage() {
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
      <LiffLeadForm liffId={process.env.NEXT_PUBLIC_LIFF_ID || ''} />
    </Suspense>
  )
}
