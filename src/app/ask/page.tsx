import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import AskClient from '@/components/pages/AskClient'

export const metadata: Metadata = {
  title: 'ถามผู้เชี่ยวชาญ — Q&A สุขภาพฟรี | รู้ก่อนดี(รู้งี้)',
  description: 'ถามคำถามสุขภาพ รับคำตอบจากผู้เชี่ยวชาญทันที ฟรี ไม่ตัดสิน ครอบคลุม STD, GLP-1, CKD, แรงงานต่างด้าว',
  alternates: { canonical: 'https://roogondee.com/ask' },
  openGraph: {
    title: 'ถามผู้เชี่ยวชาญด้านสุขภาพ ฟรี',
    description: 'รับคำตอบทันทีจาก AI ที่ผ่านการตรวจสอบโดยทีมแพทย์ รู้ก่อนดี(รู้งี้)',
    url: 'https://roogondee.com/ask',
  },
}

export const revalidate = 60

async function getRecentQAs() {
  try {
    const { data } = await supabaseAdmin
      .from('qa_posts')
      .select('id, question, answer, service, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(10)
    return data || []
  } catch {
    return []
  }
}

export default async function AskPage() {
  const recent = await getRecentQAs()
  return <AskClient recent={recent} />
}
