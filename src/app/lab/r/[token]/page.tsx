import { supabaseAdmin } from '@/lib/supabase'
import LabInterpretationCard from '@/components/admin/lab/LabInterpretationCard'
import type { LabAnalyte, LabInterpretation } from '@/lib/lab/types'

export const revalidate = 0
export const metadata = { title: 'ผลตรวจของคุณ — รู้ก่อนดี' }

const FLAG_CLS: Record<string, string> = {
  HH: 'text-red-700 font-bold', LL: 'text-red-700 font-bold',
  H: 'text-amber-600 font-semibold', L: 'text-amber-600 font-semibold',
  A: 'text-amber-600 font-semibold', N: 'text-green-600', unknown: 'text-gray-400',
}
const FLAG_TH: Record<string, string> = {
  HH: 'สูงมาก', LL: 'ต่ำมาก', H: 'สูง', L: 'ต่ำ', A: 'ผิดปกติ', N: 'ปกติ', unknown: '-',
}

// Patient-facing read of their OWN confirmed report, reached via a secret
// capability link (patient_token) sent over LINE. Only confirmed reports are
// shown — pending AI drafts are never exposed to patients.
export default async function PatientLabReportPage({ params }: { params: { token: string } }) {
  const { data: report } = await supabaseAdmin
    .from('lab_reports')
    .select('report_date, lab_name, interpretation, analytes, risk_level, status, reviewer_name, reviewer_license')
    .eq('patient_token', params.token)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (!report) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="font-display text-2xl text-forest mb-2">ไม่พบผลตรวจ</h1>
          <p className="text-sm text-gray-500">ลิงก์ไม่ถูกต้อง หมดอายุ หรือผลยังไม่ได้รับการรับรองจากแพทย์</p>
        </div>
      </main>
    )
  }

  const interp = report.interpretation as LabInterpretation | null
  const analytes = (report.analytes ?? []) as LabAnalyte[]

  return (
    <main className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="font-display text-2xl text-forest">ผลตรวจสุขภาพของคุณ</h1>
          <p className="text-sm text-gray-500 mt-1">
            วันที่ตรวจ {report.report_date}{report.lab_name ? ` · ${report.lab_name}` : ''}
          </p>
          {report.reviewer_name && (
            <p className="text-xs text-green-700 mt-1">
              ✓ รับรองโดย {report.reviewer_name}{report.reviewer_license ? ` (เลขที่ ${report.reviewer_license})` : ''}
            </p>
          )}
        </header>

        {interp && <LabInterpretationCard interp={interp} />}

        <section className="bg-white rounded-2xl p-5 border border-gray-100">
          <h2 className="font-semibold text-forest mb-3">รายการตรวจ</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">รายการ</th><th className="py-2 pr-3">ผล</th>
                  <th className="py-2 pr-3">ค่าอ้างอิง</th><th className="py-2">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {analytes.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium text-forest">{a.test_name}</td>
                    <td className="py-2 pr-3">{a.value}{a.unit ? ` ${a.unit}` : ''}</td>
                    <td className="py-2 pr-3 text-gray-500">{a.reference_range ?? (a.ref_low != null || a.ref_high != null ? `${a.ref_low ?? ''}-${a.ref_high ?? ''}` : '-')}</td>
                    <td className={`py-2 ${FLAG_CLS[a.flag] ?? ''}`}>{FLAG_TH[a.flag] ?? a.flag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="bg-mint/5 border border-mint/30 rounded-2xl p-5 text-center">
          <p className="text-sm text-forest font-medium">มีคำถามเกี่ยวกับผลตรวจ?</p>
          <p className="text-xs text-gray-600 mt-1">ปรึกษาแพทย์/ทีมงานของเราได้ฟรีทาง LINE</p>
          <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="inline-block mt-3 bg-forest text-white px-5 py-2 rounded-xl text-sm">
            แอด LINE ปรึกษาฟรี
          </a>
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          ลิงก์นี้เป็นข้อมูลส่วนบุคคล โปรดอย่าเผยแพร่ต่อ · ผลตรวจนี้เป็นการช่วยอ่านเบื้องต้น ไม่ทดแทนการวินิจฉัยของแพทย์
        </p>
      </div>
    </main>
  )
}
