import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินสุขภาพเพศหญิง — ปรึกษาสูตินรีแพทย์ฟรี',
  description: 'ทำแบบประเมินสุขภาพเพศหญิง 7 ข้อ ใน 1 นาที รับสิทธิ์ปรึกษาสูตินรีแพทย์ฟรีที่ W Medical Hospital สมุทรสาคร — เป็นความลับ ไม่ตัดสิน',
  alternates: { canonical: 'https://roogondee.com/quiz/women' },
}

export default function WomenQuizPage() {
  return (
    <Suspense>
      <QuizRunner definition={QUIZZES.women} />
    </Suspense>
  )
}
