import type { Metadata } from 'next'
import { Suspense } from 'react'
import QuizGate from '@/components/quiz/QuizGate'
import { quizGateQr } from '@/lib/quiz-gate-qr'
import { QUIZZES } from '@/lib/quiz/questions'

export const metadata: Metadata = {
  title: 'แบบประเมินการตรวจ DNA พิสูจน์บิดา-บุตร — ปรึกษาฟรี เป็นความลับ',
  description: 'ตอบคำถาม 6 ข้อ ใน 1 นาที ทีมงานช่วยประเมินว่าควรตรวจแบบใช้ทางกฎหมายหรือเพื่อความสบายใจ พร้อมนัดหมายกับสถานพยาบาล/แล็บมาตรฐาน — เป็นความลับ ไม่ตัดสิน',
  alternates: { canonical: 'https://roogondee.com/quiz/dna' },
}

export default async function DnaQuizPage() {
  return (
    <Suspense>
      <QuizGate definition={QUIZZES.dna} qrDataUrl={await quizGateQr('dna')} />
    </Suspense>
  )
}
