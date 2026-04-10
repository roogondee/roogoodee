import { Suspense } from 'react'
import type { Metadata } from 'next'
import ContactForm from '@/components/ui/ContactForm'

export const metadata: Metadata = {
  title: 'ปรึกษาสุขภาพฟรี — STD, GLP-1, CKD, แรงงานต่างด้าว | รู้ก่อนดี',
  description: 'กรอกฟอร์มรับคำปรึกษาสุขภาพฟรี ไม่ตัดสิน ทีมผู้เชี่ยวชาญตอบกลับภายใน 30 นาที ครอบคลุม STD & PrEP HIV, GLP-1 ลดน้ำหนัก, CKD โรคไต, ตรวจแรงงานต่างด้าว',
  alternates: { canonical: 'https://roogondee.com/contact' },
  openGraph: {
    title: 'ปรึกษาสุขภาพฟรี — รู้ก่อนดี',
    description: 'ปรึกษาผู้เชี่ยวชาญฟรี ไม่ตัดสิน ตอบกลับภายใน 30 นาที',
    url: 'https://roogondee.com/contact',
  },
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">🌿</div>
          <p>กำลังโหลด...</p>
        </div>
      </main>
    }>
      <ContactForm />
    </Suspense>
  )
}
