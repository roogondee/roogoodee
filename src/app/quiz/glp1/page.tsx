import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizGate from '@/components/quiz/QuizGate'
import { quizGateQr } from '@/lib/quiz-gate-qr'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'ตรวจเบาหวาน FBS + HbA1c ฟรี — ประเมินก่อนเริ่ม GLP-1',
  description: 'รับสิทธิ์ตรวจ FBS + HbA1c ฟรี มูลค่า 500 บาท ที่ โรงพยาบาลพันธมิตรในสมุทรสาคร + ปรึกษาแพทย์ 15 นาที',
  alternates: { canonical: 'https://roogondee.com/quiz/glp1' },
}

export default async function GLP1QuizPage() {
  return (
    <Suspense>
      <QuizGate definition={QUIZZES.glp1} qrDataUrl={await quizGateQr('glp1')} />
    </Suspense>
  )
}
