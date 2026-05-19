import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินสุขภาพใจ — ปรึกษานักจิตวิทยาฟรี 30 นาที',
  description: 'ทำแบบประเมินสุขภาพจิต อารมณ์ ความสัมพันธ์ 7 ข้อ ใน 1 นาที รับสิทธิ์ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (telehealth) เป็นความลับ ไม่ตัดสิน',
  alternates: { canonical: 'https://roogondee.com/quiz/mind' },
}

export default function MindQuizPage() {
  return (
    <Suspense>
      <QuizRunner definition={QUIZZES.mind} />
    </Suspense>
  )
}
