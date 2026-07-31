import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizRunner from '@/components/quiz/QuizRunner'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินการตรวจ DNA พิสูจน์บิดา-บุตร — ปรึกษาฟรี เป็นความลับ',
  description: 'ตอบคำถาม 6 ข้อ ใน 1 นาที ทีมงานช่วยประเมินว่าควรตรวจแบบใช้ทางกฎหมายหรือเพื่อความสบายใจ พร้อมนัดหมายกับสถานพยาบาล/แล็บมาตรฐาน — เป็นความลับ ไม่ตัดสิน',
  alternates: { canonical: 'https://roogondee.com/quiz/dna' },
}

export default function DnaQuizPage() {
  return (
    <Suspense>
      <QuizRunner definition={QUIZZES.dna} />
    </Suspense>
  )
}
