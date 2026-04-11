import type { Metadata } from 'next'
import ToolsClient from '@/components/pages/ToolsClient'

export const metadata: Metadata = {
  title: 'เครื่องคำนวณสุขภาพ — BMI, eGFR, PrEP | รู้ก่อนดี(รู้งี้)',
  description: 'คำนวณ BMI ประเมินความเหมาะสม GLP-1, คำนวณ eGFR ประเมินระยะ CKD, และ PrEP Risk Assessment ฟรี โดย รู้ก่อนดี(รู้งี้)',
  alternates: { canonical: 'https://roogondee.com/tools' },
  openGraph: {
    title: 'เครื่องคำนวณสุขภาพ — BMI, eGFR, PrEP',
    description: 'เครื่องมือประเมินสุขภาพฟรี: BMI+GLP-1, eGFR+CKD, PrEP Risk Quiz',
    url: 'https://roogondee.com/tools',
  },
}

export default function ToolsPage() {
  return <ToolsClient />
}
