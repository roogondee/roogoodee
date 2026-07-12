import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { logCertView, isRateLimited } from '@/lib/certs/access-log'
import {
  CERT_TYPE_LABEL, FIT_STATUS_LABEL, type MedicalCertificate,
} from '@/lib/certs/types'
import type { LabAnalyte } from '@/lib/lab/types'

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'ตรวจสอบใบรับรองแพทย์ — W Medical',
  robots: { index: false, follow: false },
}

const FLAG_CLS: Record<string, string> = {
  HH: 'text-red-700 font-bold', LL: 'text-red-700 font-bold',
  H: 'text-amber-600 font-semibold', L: 'text-amber-600 font-semibold',
  A: 'text-amber-600 font-semibold', N: 'text-green-600', unknown: 'text-gray-400',
}
const FLAG_TH: Record<string, string> = {
  HH: 'สูงมาก', LL: 'ต่ำมาก', H: 'สูง', L: 'ต่ำ', A: 'ผิดปกติ', N: 'ปกติ', unknown: '-',
}
const RESULT_TH: Record<string, { label: string; cls: string }> = {
  normal: { label: 'ปกติ / ไม่พบ', cls: 'text-green-600' },
  abnormal: { label: 'ผิดปกติ / พบ', cls: 'text-red-600 font-semibold' },
  not_tested: { label: 'ไม่ได้ตรวจ', cls: 'text-gray-400' },
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-cream py-8 px-4">{children}</main>
}

function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <h1 className="font-display text-2xl text-forest mb-2">ไม่พบใบรับรอง</h1>
        <p className="text-sm text-gray-500">รหัสตรวจสอบไม่ถูกต้อง หรือใบรับรองยังไม่ได้ออกอย่างเป็นทางการ</p>
      </div>
    </main>
  )
}

export default async function VerifyCertPage({ params }: { params: { token: string } }) {
  const h = headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || undefined

  if (await isRateLimited(ip)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow text-center">
          <div className="text-5xl mb-3">⏳</div>
          <h1 className="font-display text-2xl text-forest mb-2">มีการเรียกดูบ่อยเกินไป</h1>
          <p className="text-sm text-gray-500">กรุณาลองใหม่อีกครั้งในภายหลัง</p>
        </div>
      </main>
    )
  }

  const { data } = await supabaseAdmin
    .from('medical_certificates')
    .select('*')
    .eq('public_token', params.token)
    .in('status', ['issued', 'revoked'])
    .maybeSingle()

  if (!data) return <NotFound />
  const cert = data as MedicalCertificate

  logCertView({ certificateId: cert.id, ip, userAgent: h.get('user-agent') ?? undefined })

  const snap = cert.patient_snapshot ?? { name: '-' }
  const analytes = (cert.lab_analytes ?? []) as LabAnalyte[]
  const diseaseItems = cert.disease_items ?? []
  const exam = cert.exam ?? {}
  const isRevoked = cert.status === 'revoked'
  const isExpired = !isRevoked && cert.valid_until != null && cert.valid_until < new Date().toISOString().slice(0, 10)
  const genderTh = snap.gender === 'male' ? 'ชาย' : snap.gender === 'female' ? 'หญิง' : snap.gender ?? '-'

  // Visit history: this patient's other issued certs + confirmed lab reports.
  const [{ data: otherCerts }, { data: labs }] = await Promise.all([
    supabaseAdmin.from('medical_certificates')
      .select('cert_no, cert_type, visit_date')
      .eq('patient_id', cert.patient_id).eq('status', 'issued')
      .order('visit_date', { ascending: false }).limit(20),
    supabaseAdmin.from('lab_reports')
      .select('report_date, lab_name')
      .eq('patient_id', cert.patient_id).eq('status', 'confirmed')
      .order('report_date', { ascending: false }).limit(20),
  ])
  const history = [
    ...((otherCerts ?? []).map((c) => ({ date: c.visit_date, label: CERT_TYPE_LABEL[c.cert_type as keyof typeof CERT_TYPE_LABEL] ?? 'ใบรับรองแพทย์', ref: c.cert_no as string | null }))),
    ...((labs ?? []).map((l) => ({ date: l.report_date as string, label: `ผลตรวจแลป${l.lab_name ? ` · ${l.lab_name}` : ''}`, ref: null }))),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Status banner */}
        {isRevoked ? (
          <div className="bg-red-600 text-white rounded-2xl p-6 text-center shadow-lg">
            <div className="text-4xl mb-1">⛔</div>
            <h1 className="font-display text-2xl">ใบรับรองนี้ถูกเพิกถอนแล้ว</h1>
            {cert.revoked_at && <p className="text-sm text-white/80 mt-1">เพิกถอนเมื่อ {cert.revoked_at.slice(0, 10)}</p>}
            {cert.revoke_reason && <p className="text-sm text-white/90 mt-1">เหตุผล: {cert.revoke_reason}</p>}
          </div>
        ) : isExpired ? (
          <div className="bg-amber-500 text-white rounded-2xl p-6 text-center shadow-lg">
            <div className="text-4xl mb-1">⚠️</div>
            <h1 className="font-display text-2xl">เอกสารจริง แต่พ้นกำหนดอายุแล้ว</h1>
            <p className="text-sm text-white/90 mt-1">ใช้ได้ถึง {cert.valid_until}</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-forest via-sage to-mint text-white rounded-2xl p-6 text-center shadow-lg">
            <div className="text-4xl mb-1">✅</div>
            <h1 className="font-display text-2xl">ใบรับรองแพทย์ฉบับจริง</h1>
            <p className="text-xs text-white/80 mt-1">ออกโดยโรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร</p>
          </div>
        )}

        {/* Header card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex gap-4">
          {cert.photo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/verify/cert/${params.token}/photo`} alt="รูปคนไข้"
              className="w-24 h-32 object-cover rounded-lg border border-mint/40" />
          ) : (
            <div className="w-24 h-32 rounded-lg bg-gray-100 flex items-center justify-center text-3xl text-gray-300">👤</div>
          )}
          <div className="flex-1 text-sm">
            <p className="font-display text-lg text-forest">{snap.name}</p>
            <p className="text-gray-500">{CERT_TYPE_LABEL[cert.cert_type]}</p>
            <dl className="mt-2 space-y-1">
              {cert.cert_no && <div className="flex justify-between"><dt className="text-gray-400">เลขที่</dt><dd className="font-medium">{cert.cert_no}</dd></div>}
              <div className="flex justify-between"><dt className="text-gray-400">วันที่ตรวจ</dt><dd className="font-medium">{cert.visit_date}</dd></div>
              {cert.valid_until && <div className="flex justify-between"><dt className="text-gray-400">ใช้ได้ถึง</dt><dd className="font-medium">{cert.valid_until}</dd></div>}
            </dl>
          </div>
        </div>

        {/* Patient info */}
        <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm">
          <h2 className="font-semibold text-forest mb-3">ข้อมูลผู้รับการตรวจ</h2>
          <dl className="grid grid-cols-2 gap-y-2">
            <div><dt className="text-gray-400 text-xs">เพศ</dt><dd>{genderTh}</dd></div>
            {snap.dob && <div><dt className="text-gray-400 text-xs">วันเกิด</dt><dd>{snap.dob}</dd></div>}
            {snap.nationality && <div><dt className="text-gray-400 text-xs">สัญชาติ</dt><dd>{snap.nationality}</dd></div>}
            {snap.id_last4 && <div><dt className="text-gray-400 text-xs">เลขเอกสาร (4 ท้าย)</dt><dd>xxxx-{snap.id_last4}</dd></div>}
            {snap.employer_name && <div><dt className="text-gray-400 text-xs">นายจ้าง</dt><dd>{snap.employer_name}</dd></div>}
            {snap.work_permit_no && <div><dt className="text-gray-400 text-xs">เลขใบอนุญาตทำงาน</dt><dd>{snap.work_permit_no}</dd></div>}
          </dl>
        </section>

        {/* Vitals */}
        {(exam.weight_kg || exam.height_cm || exam.bp_sys || exam.pulse) && (
          <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm">
            <h2 className="font-semibold text-forest mb-3">ผลตรวจร่างกายทั่วไป</h2>
            <div className="grid grid-cols-3 gap-3">
              {exam.weight_kg != null && <div><span className="text-gray-400 text-xs block">น้ำหนัก</span>{exam.weight_kg} kg</div>}
              {exam.height_cm != null && <div><span className="text-gray-400 text-xs block">ส่วนสูง</span>{exam.height_cm} cm</div>}
              {exam.bmi != null && <div><span className="text-gray-400 text-xs block">BMI</span>{exam.bmi}</div>}
              {exam.bp_sys != null && exam.bp_dia != null && <div><span className="text-gray-400 text-xs block">ความดัน</span>{exam.bp_sys}/{exam.bp_dia}</div>}
              {exam.pulse != null && <div><span className="text-gray-400 text-xs block">ชีพจร</span>{exam.pulse}/min</div>}
            </div>
          </section>
        )}

        {/* Disease screening */}
        {diseaseItems.length > 0 && (
          <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm">
            <h2 className="font-semibold text-forest mb-3">ผลการตรวจคัดกรอง</h2>
            <ul className="divide-y divide-gray-100">
              {diseaseItems.map((it, i) => {
                const r = RESULT_TH[it.result] ?? RESULT_TH.not_tested
                return (
                  <li key={i} className="flex justify-between gap-3 py-2">
                    <span className="text-forest">{it.label_th}</span>
                    <span className={`shrink-0 ${r.cls}`}>{r.label}{it.detail ? ` (${it.detail})` : ''}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Lab results */}
        {analytes.length > 0 && (
          <section className="bg-white rounded-2xl p-5 border border-gray-100">
            <h2 className="font-semibold text-forest mb-3 text-sm">ผลตรวจทางห้องปฏิบัติการ</h2>
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
        )}

        {/* Conclusion + doctor opinion */}
        {(cert.fit_status || cert.summary) && (
          <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm">
            {cert.fit_status && <p className="font-semibold text-forest mb-1">สรุปผล: {FIT_STATUS_LABEL[cert.fit_status]}</p>}
            {cert.summary && <p className="text-gray-600">{cert.summary}</p>}
          </section>
        )}

        {/* Visit history */}
        {history.length > 0 && (
          <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm">
            <h2 className="font-semibold text-forest mb-3">ประวัติการมาตรวจ</h2>
            <ul className="divide-y divide-gray-100">
              {history.map((v, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span className="text-forest">{v.label}{v.ref ? <span className="text-gray-400"> · {v.ref}</span> : null}</span>
                  <span className="text-gray-400">{v.date}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Doctor sign-off + hospital credentials */}
        <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm text-center">
          <p className="text-forest">รับรองโดย <span className="font-semibold">{cert.doctor_name ?? '-'}</span>{cert.doctor_license ? ` · ใบอนุญาตประกอบวิชาชีพเวชกรรมเลขที่ ว. ${cert.doctor_license}` : ''}</p>
          <p className="text-[11px] text-gray-400 mt-3">
            โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร · ใบอนุญาตสถานพยาบาล (สมุทรสาคร) 001/2569 · มาตรฐาน MOPH LAB
          </p>
        </section>

        <p className="text-[11px] text-gray-400 text-center px-4">
          หน้านี้แสดงข้อมูลใบรับรองแพทย์เพื่อการตรวจสอบความถูกต้องเท่านั้น · ข้อมูลสุขภาพเป็นข้อมูลส่วนบุคคล โปรดใช้เพื่อวัตถุประสงค์ที่ได้รับอนุญาต
        </p>
      </div>
    </Shell>
  )
}
