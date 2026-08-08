import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizGate from '@/components/quiz/QuizGate'
import { quizGateQr } from '@/lib/quiz-gate-qr'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินสุขภาพใจ — ปรึกษานักจิตวิทยาฟรี 30 นาที',
  description: 'ทำแบบประเมินสุขภาพจิต อารมณ์ ความสัมพันธ์ 7 ข้อ ใน 1 นาที รับสิทธิ์ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (telehealth) เป็นความลับ ไม่ตัดสิน',
  alternates: { canonical: 'https://roogondee.com/quiz/mind' },
}

export default async function MindQuizPage() {
  return (
    <Suspense>
      <QuizGate definition={QUIZZES.mind} qrDataUrl={await quizGateQr('mind')} />
    </Suspense>
  )
}
