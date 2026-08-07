import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizGate from '@/components/quiz/QuizGate'
import { quizGateQr } from '@/lib/quiz-gate-qr'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินสุขภาพเพศหญิง — ปรึกษาสูตินรีแพทย์ฟรี',
  description: 'ทำแบบประเมินสุขภาพเพศหญิง 7 ข้อ ใน 1 นาที รับสิทธิ์ปรึกษาสูตินรีแพทย์ฟรีที่ W Medical Hospital สมุทรสาคร — เป็นความลับ ไม่ตัดสิน',
  alternates: { canonical: 'https://roogondee.com/quiz/women' },
}

export default async function WomenQuizPage() {
  return (
    <Suspense>
      <QuizGate definition={QUIZZES.women} qrDataUrl={await quizGateQr('women')} />
    </Suspense>
  )
}
