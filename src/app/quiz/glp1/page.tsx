import type { Metadata } from 'next'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'ตรวจเบาหวาน FBS + HbA1c ฟรี — ประเมินก่อนเริ่ม GLP-1',
  description: 'รับสิทธิ์ตรวจ FBS + HbA1c ฟรี มูลค่า 500 บาท ที่ W Medical Hospital สมุทรสาคร + ปรึกษาแพทย์ 15 นาที',
  alternates: { canonical: 'https://roogondee.com/quiz/glp1' },
}

export default function GLP1QuizPage() {
  return <QuizRunner definition={QUIZZES.glp1} />
}
