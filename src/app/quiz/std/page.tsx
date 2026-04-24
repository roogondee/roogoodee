import type { Metadata } from 'next'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'ตรวจ HIV + Syphilis ฟรี — ส่วนตัว ไม่ตัดสิน',
  description: 'รับสิทธิ์ตรวจ HIV + Syphilis ฟรีที่ W Medical Hospital สมุทรสาคร ผลออกภายใน 1 ชม.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://roogondee.com/quiz/std' },
}

export default function STDQuizPage() {
  return <QuizRunner definition={QUIZZES.std} />
}
