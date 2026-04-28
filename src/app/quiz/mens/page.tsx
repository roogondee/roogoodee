import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินสุขภาพชายวัย 40+ — รับสิทธิ์ปรึกษาแพทย์ฟรี',
  description: 'ทำแบบประเมินสุขภาพชายวัย 40+ 6 ข้อ ใน 1 นาที รับสิทธิ์ปรึกษาแพทย์เฉพาะทางฟรีที่ W Medical Hospital สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/quiz/mens' },
}

export default function MensQuizPage() {
  return (
    <Suspense>
      <QuizRunner definition={QUIZZES.mens} />
    </Suspense>
  )
}
