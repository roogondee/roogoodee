import type { Metadata } from 'next'
import FAQClient from '@/components/pages/FAQClient'

export const metadata: Metadata = {
  title: 'คำถามที่พบบ่อย (FAQ) — STD, GLP-1, CKD, แรงงานต่างด้าว | รู้ก่อนดี(รู้งี้)',
  description: 'คำถามที่พบบ่อยเกี่ยวกับบริการรู้ก่อนดี(รู้งี้) ครอบคลุม STD & PrEP HIV, GLP-1 ลดน้ำหนัก, CKD โรคไต และตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร',
  alternates: { canonical: 'https://roogondee.com/faq' },
  openGraph: {
    title: 'คำถามที่พบบ่อย — รู้ก่อนดี(รู้งี้)',
    description: 'คำตอบสำหรับทุกคำถามเกี่ยวกับบริการสุขภาพ',
    url: 'https://roogondee.com/faq',
  },
}

// JSON-LD for SEO (Thai for search engines)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'รู้ก่อนดี(รู้งี้)คือใคร?', acceptedAnswer: { '@type': 'Answer', text: 'รู้ก่อนดี(รู้งี้)เป็นแพลตฟอร์มปรึกษาสุขภาพออนไลน์ของบริษัท เจียรักษา จำกัด' } },
    { '@type': 'Question', name: 'ปรึกษาฟรีจริงไหม?', acceptedAnswer: { '@type': 'Answer', text: 'การปรึกษาเบื้องต้นผ่านแบบฟอร์มและ LINE ฟรี 100%' } },
    { '@type': 'Question', name: 'PrEP คืออะไร?', acceptedAnswer: { '@type': 'Answer', text: 'PrEP คือยาป้องกัน HIV ก่อนสัมผัสเชื้อ มีประสิทธิภาพ 99%' } },
  ],
}

export default function FAQPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FAQClient />
    </>
  )
}
