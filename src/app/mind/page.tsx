import type { Metadata } from 'next'
import MindClient from '@/components/pages/MindClient'

export const metadata: Metadata = {
  title: 'สุขภาพจิต & ความสัมพันธ์ — ปรึกษานักจิตวิทยาฟรี 30 นาที | รู้ก่อนดี(รู้งี้)',
  description: 'ซึมเศร้า วิตกกังวล นอนไม่หลับ ความสัมพันธ์ การสูญเสีย — ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (telehealth) เป็นความลับ ไม่ตัดสิน วิกฤตโทร 1323',
  keywords: 'สุขภาพจิต, นักจิตวิทยา, จิตแพทย์, ซึมเศร้า, วิตกกังวล, นอนไม่หลับ, ปรึกษาจิตเวช, telehealth, ความสัมพันธ์',
  alternates: { canonical: 'https://roogondee.com/mind' },
  openGraph: {
    title: 'สุขภาพจิต & ความสัมพันธ์ — ปรึกษานักจิตวิทยาฟรี 30 นาที',
    description: 'ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (telehealth) — ส่วนตัว ไม่ตัดสิน',
    url: 'https://roogondee.com/mind',
  },
}

export default function MindPage() {
  return <MindClient />
}
