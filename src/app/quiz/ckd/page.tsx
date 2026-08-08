import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizGate from '@/components/quiz/QuizGate'
import { quizGateQr } from '@/lib/quiz-gate-qr'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'ตรวจโปรตีนในปัสสาวะฟรี — คัดกรองโรคไต',
  description: 'รับสิทธิ์ตรวจ Urine Protein ฟรี ที่ โรงพยาบาลพันธมิตรในสมุทรสาคร — สัญญาณเริ่มต้นของโรคไต',
  alternates: { canonical: 'https://roogondee.com/quiz/ckd' },
}

export default async function CKDQuizPage() {
  return (
    <Suspense>
      <QuizGate definition={QUIZZES.ckd} qrDataUrl={await quizGateQr('ckd')} />
    </Suspense>
  )
}
