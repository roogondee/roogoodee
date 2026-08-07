import { Suspense } from 'react'
import type { Metadata } from 'next'
import LiffQuiz from '@/components/quiz/LiffQuiz'

export const metadata: Metadata = {
  title: 'เช็คสุขภาพฟรีใน 2 นาที — รู้ก่อนดี(รู้งี้)',
  description: 'ทำแบบประเมินในแชท LINE รับ voucher ตรวจฟรีส่งเข้าแชททันที',
  robots: { index: false, follow: false },
}

// LIFF endpoint — register https://roogondee.com/liff/quiz in LINE Developers
// Console (LINE Login channel → LIFF → Add, size Full). Point rich menu /
// broadcast buttons at https://liff.line.me/{LIFF_ID}?service=glp1 etc.
// NEXT_PUBLIC_LIFF_QUIZ_ID holds this page's own LIFF app ID so it doesn't
// clash with the /lead/liff app sharing NEXT_PUBLIC_LIFF_ID (same channel is
// fine — id_token verification only needs LINE_LOGIN_CHANNEL_ID).
// Setup guide: docs/liff-quiz-setup.md
export default function LiffQuizPage() {
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
      <LiffQuiz liffId={process.env.NEXT_PUBLIC_LIFF_QUIZ_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''} />
    </Suspense>
  )
}
