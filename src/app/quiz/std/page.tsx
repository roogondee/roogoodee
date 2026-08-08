import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizGate from '@/components/quiz/QuizGate'
import { quizGateQr } from '@/lib/quiz-gate-qr'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'ตรวจ HIV + Syphilis ฟรี — ส่วนตัว ไม่ตัดสิน',
  description: 'รับสิทธิ์ตรวจ HIV + Syphilis ฟรีที่ โรงพยาบาลพันธมิตรในสมุทรสาคร ผลออกภายใน 1 ชม.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://roogondee.com/quiz/std' },
}

export default async function STDQuizPage() {
  return (
    <Suspense>
      <QuizGate definition={QUIZZES.std} qrDataUrl={await quizGateQr('std')} />
    </Suspense>
  )
}
