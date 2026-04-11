import type { Metadata } from 'next'
import TermsClient from '@/components/pages/TermsClient'

export const metadata: Metadata = {
  title: 'ข้อตกลงการใช้บริการ — รู้ก่อนดี(รู้งี้)',
  description: 'ข้อตกลงและเงื่อนไขการใช้บริการเว็บไซต์รู้ก่อนดี(รู้งี้) บริษัท เจียรักษา จำกัด',
}

export default function TermsPage() {
  return <TermsClient />
}
