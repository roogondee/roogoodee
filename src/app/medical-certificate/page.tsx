import type { Metadata } from 'next'
import MedicalCertificateClient from '@/components/pages/MedicalCertificateClient'

// Sales page for the same-day medical certificate at W Medical. The selling
// point is cert.roogondee.com: every certificate is issued after a real
// examination and carries a per-person QR that anyone receiving it can scan.
// It competes against certificates sold without an examination, so the copy
// never names a competitor and never quotes a price (none is agreed for this
// page) — every CTA is LINE or a phone call.
export const metadata: Metadata = {
  title: 'ใบรับรองแพทย์ ตรวจจริง ตรวจสอบได้ด้วย QR | โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร',
  description: 'ใบรับรองแพทย์ทุกใบออกหลังพบแพทย์และตรวจร่างกายจริง มี QR เฉพาะบุคคล นายจ้างหรือหน่วยงานสแกนตรวจสอบได้ทันทีว่าใบมีจริง ยังไม่หมดอายุ และผ่านการยืนยันข้อมูล ออกได้ภายในวันเดียว',
  keywords: 'ใบรับรองแพทย์ สมุทรสาคร, ใบรับรองแพทย์ 5 โรค, ใบรับรองแพทย์ใบขับขี่, ใบรับรองแพทย์สมัครงาน, ตรวจสอบใบรับรองแพทย์, ใบรับรองแพทย์ 2 ภาษา, W Medical',
  alternates: { canonical: 'https://roogondee.com/medical-certificate' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'ใบรับรองแพทย์ ตรวจจริง ตรวจสอบได้ทุกใบด้วย QR — W Medical สมุทรสาคร',
    description: 'พบแพทย์จริง ออกใบภายในวันเดียว นายจ้างสแกน QR ตรวจสอบความถูกต้องได้เอง',
    url: 'https://roogondee.com/medical-certificate',
  },
}

export default function MedicalCertificatePage() {
  return <MedicalCertificateClient />
}
