import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import CsvImportWizard from '@/components/admin/certs/CsvImportWizard'

export const revalidate = 0

export default async function CertImportPage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-forest">นำเข้าใบรับรองเป็นชุด (CSV)</h1>
        <Link href="/admin/certs" className="text-sm text-gray-400 hover:text-forest">← กลับ</Link>
      </div>
      <p className="text-sm text-gray-500">สำหรับตรวจกลุ่ม เช่น แรงงานต่างด้าว — แต่ละแถวจะออกใบรับรองพร้อม QR ให้อัตโนมัติ</p>
      <CsvImportWizard />
    </div>
  )
}
