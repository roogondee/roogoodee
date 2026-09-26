import { Suspense } from 'react'
import type { Metadata } from 'next'
import DmglpLandingClient from '@/components/pages/DmglpLandingClient'

// Public ad landing for the W Medical diabetes & metabolic care programme.
// Hard boundaries (spec §1): no drug brand names, no strengths, no drug
// prices anywhere on this page; no online ordering; the only CTAs are LINE
// (carrying a DM-xxxx ref code) and a phone call.
export const metadata: Metadata = {
  title: 'โปรแกรมดูแลเบาหวานและควบคุมน้ำหนักโดยแพทย์ | โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร',
  description: 'โปรแกรม 6 เดือน ดูแลเบาหวานชนิดที่ 2 และภาวะน้ำหนักเกิน โดยแพทย์เฉพาะทางและเภสัชกร ตรวจแล็บ ติดตามผลทุก 4 สัปดาห์ แจ้งเตือนผ่าน LINE ที่โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร',
  keywords: 'คลินิกเบาหวาน สมุทรสาคร, ลดน้ำหนักโดยแพทย์, โปรแกรมเบาหวาน, ยาฉีดลดน้ำหนัก โรงพยาบาล, W Medical',
  alternates: { canonical: 'https://roogondee.com/dmglp' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'โปรแกรมดูแลเบาหวานและควบคุมน้ำหนักโดยแพทย์ — W Medical สมุทรสาคร',
    description: 'ประเมินโดยแพทย์ ตรวจแล็บ ติดตามผลต่อเนื่อง 6 เดือน แจ้งเตือนผ่าน LINE',
    url: 'https://roogondee.com/dmglp',
  },
}

export default function DmglpPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-cream" />}>
      <DmglpLandingClient />
    </Suspense>
  )
}
