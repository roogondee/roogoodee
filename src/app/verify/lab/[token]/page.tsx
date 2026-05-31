import { supabaseAdmin } from '@/lib/supabase'
import type { LabAnalyte } from '@/lib/lab/types'

export const revalidate = 0
export const metadata = { title: 'ตรวจสอบรายงานผลแลป — รู้ก่อนดี' }

const RISK_LABEL: Record<string, string> = { green: 'ปกติดี', yellow: 'ควรติดตาม', red: 'ควรพบแพทย์' }
const RISK_COLOR: Record<string, string> = { green: 'text-green-600', yellow: 'text-amber-600', red: 'text-red-600' }

// Public, read-only authenticity check. Shows NO personal data — only that a
// report with this token exists, its date, lab, reviewer, and aggregate status.
export default async function VerifyLabPage({ params }: { params: { token: string } }) {
  const { data: report } = await supabaseAdmin
    .from('lab_reports')
    .select('report_date, lab_name, risk_level, status, reviewer_name, reviewer_license, analytes, confirmed_at')
    .eq('public_token', params.token)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (!report) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="font-display text-2xl text-forest mb-2">ไม่พบรายงาน</h1>
          <p className="text-sm text-gray-500">รหัสตรวจสอบไม่ถูกต้อง หรือรายงานยังไม่ได้รับการรับรอง</p>
        </div>
      </main>
    )
  }

  const analytes = (report.analytes ?? []) as LabAnalyte[]
  const abnormal = analytes.filter((a) => a.flag !== 'N' && a.flag !== 'unknown').length
  const risk = report.risk_level ?? 'green'

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-forest via-sage to-mint">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">✅</div>
          <h1 className="font-display text-2xl text-forest">รายงานนี้เป็นของจริง</h1>
          <p className="text-xs text-gray-400 mt-1">W Medical Hospital สมุทรสาคร · สบส. 001/2569</p>
        </div>
        <dl className="text-sm divide-y divide-gray-100">
          <div className="flex justify-between py-2"><dt className="text-gray-500">วันที่ตรวจ</dt><dd className="font-medium">{report.report_date}</dd></div>
          {report.lab_name && <div className="flex justify-between py-2"><dt className="text-gray-500">แล็บ</dt><dd className="font-medium">{report.lab_name}</dd></div>}
          <div className="flex justify-between py-2"><dt className="text-gray-500">จำนวนรายการตรวจ</dt><dd className="font-medium">{analytes.length} ({abnormal} ผิดปกติ)</dd></div>
          <div className="flex justify-between py-2"><dt className="text-gray-500">สถานะรวม</dt><dd className={`font-semibold ${RISK_COLOR[risk]}`}>{RISK_LABEL[risk]}</dd></div>
          <div className="flex justify-between py-2"><dt className="text-gray-500">รับรองโดย</dt><dd className="font-medium text-right">{report.reviewer_name}{report.reviewer_license ? ` (เลขที่ ${report.reviewer_license})` : ''}</dd></div>
        </dl>
        <p className="text-[11px] text-gray-400 mt-5 text-center">หน้านี้ยืนยันความถูกต้องของรายงานเท่านั้น ไม่แสดงข้อมูลส่วนบุคคลหรือค่าผลตรวจ</p>
      </div>
    </main>
  )
}
