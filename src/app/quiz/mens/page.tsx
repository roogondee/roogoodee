import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizGate from '@/components/quiz/QuizGate'
import { quizGateQr } from '@/lib/quiz-gate-qr'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินสุขภาพชายวัย 40+ — รับสิทธิ์ปรึกษาแพทย์ฟรี',
  description: 'ทำแบบประเมินสุขภาพชายวัย 40+ 6 ข้อ ใน 1 นาที รับสิทธิ์ปรึกษาแพทย์เฉพาะทางฟรีที่ โรงพยาบาลพันธมิตรในสมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/quiz/mens' },
}

export default async function MensQuizPage() {
  return (
    <Suspense>
      <QuizGate definition={QUIZZES.mens} qrDataUrl={await quizGateQr('mens')} />
    </Suspense>
  )
}
