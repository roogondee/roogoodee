import CertSearchForm from '@/components/verify/CertSearchForm'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'ตรวจสอบใบรับรองแพทย์ — โรงพยาบาลพันธมิตร',
  description: 'ตรวจสอบความถูกต้องของใบรับรองแพทย์ที่ออกโดยโรงพยาบาลดับเบิ้ลยู เมดิคอล',
  robots: { index: false, follow: false },
}

export default function VerifySearchPage() {
  return (
    <main className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-forest">ตรวจสอบใบรับรองแพทย์</h1>
          <p className="text-sm text-gray-500 mt-1">
            โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร
          </p>
        </div>
        <CertSearchForm />
        <p className="text-[11px] text-gray-400 text-center mt-6 px-4">
          ข้อมูลสุขภาพเป็นข้อมูลส่วนบุคคล — ต้องใช้รหัสตรวจสอบส่วนบุคคล 6 หลักที่พิมพ์บนใบรับรอง
          ร่วมกับการค้นหา จึงจะเปิดดูผลได้ หรือสแกน QR บนใบเพื่อเปิดโดยตรง
        </p>
      </div>
    </main>
  )
}
