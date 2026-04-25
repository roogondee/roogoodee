import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'ตรวจโปรตีนในปัสสาวะฟรี — คัดกรองโรคไต',
  description: 'รับสิทธิ์ตรวจ Urine Protein ฟรี ที่ W Medical Hospital สมุทรสาคร — สัญญาณเริ่มต้นของโรคไต',
  alternates: { canonical: 'https://roogondee.com/quiz/ckd' },
}

export default function CKDQuizPage() {
  return (
    <Suspense>
      <QuizRunner definition={QUIZZES.ckd} />
    </Suspense>
  )
}
