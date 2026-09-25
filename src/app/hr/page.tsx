import { cookies, headers } from 'next/headers'
import { CERT_TYPE_LABEL, FIT_STATUS_LABEL, type CertType, type FitStatus } from '@/lib/certs/types'
import { EMPLOYER_RECHECK_DAYS } from '@/lib/growth/config'
import { EMPLOYER_COOKIE, employerByToken, fetchEmployerCertificates, logEmployerAccess, workersFromCerts } from '@/lib/growth/employer'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'สถานะตรวจสุขภาพแรงงาน — W Medical',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

// Employer (HR) view of their workers' certificates: who is covered, whose
// certificate is still valid for submission, and who is due for the annual
// checkup. Authenticated by the cookie /hr/k/<token> sets (see
// src/lib/growth/employer.ts); every view is logged. Deliberately shows only what an employer already holds on paper —
// name, nationality, cert number, fit status, dates — and links to the
// existing /verify/cert page for the full certificate.

const PHONE = '081-902-3540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'

function thDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DueBadge({ days }: { days: number }) {
  if (days < 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">เลยกำหนด {-days} วัน</span>
  if (days <= 30) return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">อีก {days} วัน</span>
  return <span className="px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700">อีก {days} วัน</span>
}

export default async function EmployerPortal() {
  const employer = await employerByToken(cookies().get(EMPLOYER_COOKIE)?.value || '')
  if (!employer) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow text-center">
          <h1 className="font-display text-2xl text-forest mb-2">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
          <p className="text-sm text-gray-500">กรุณาติดต่อทีมงานเพื่อขอลิงก์ใหม่ โทร {PHONE}</p>
        </div>
      </main>
    )
  }

  const h = headers()
  await logEmployerAccess(employer.id, 'view', (h.get('x-forwarded-for') || '').split(',')[0].trim(), h.get('user-agent'))

  const now = Date.now()
  const certs = await fetchEmployerCertificates(employer.match_names)
  const workers = workersFromCerts(certs, now, EMPLOYER_RECHECK_DAYS)
  const today = new Date(now + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const due30 = workers.filter(w => w.daysUntilDue <= 30).length
  const validNow = workers.filter(w => w.latest.valid_until && w.latest.valid_until >= today).length

  return (
    <main className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow p-6">
          <p className="text-xs text-gray-500">W Medical Hospital × รู้ก่อนดี — ระบบติดตามสุขภาพแรงงาน</p>
          <h1 className="font-display text-2xl text-forest mt-1">{employer.name}</h1>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="rounded-xl bg-mint/10 p-3">
              <div className="text-2xl font-semibold text-forest">{workers.length}</div>
              <div className="text-xs text-gray-600">แรงงานที่ตรวจแล้ว</div>
            </div>
            <div className="rounded-xl bg-mint/10 p-3">
              <div className="text-2xl font-semibold text-forest">{validNow}</div>
              <div className="text-xs text-gray-600">ใบรับรองยังใช้ยื่นได้</div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-2xl font-semibold text-amber-700">{due30}</div>
              <div className="text-xs text-gray-600">ครบรอบตรวจใน 30 วัน</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <a href="/hr/export" className="bg-forest text-white rounded-full px-4 py-2 text-sm">ดาวน์โหลดรายชื่อ (CSV)</a>
            <a href={`tel:${PHONE.replace(/-/g, '')}`} className="border border-forest text-forest rounded-full px-4 py-2 text-sm">นัดตรวจกลุ่ม โทร {PHONE}</a>
            <a href={LINE_URL} className="border border-mint text-forest rounded-full px-4 py-2 text-sm">LINE @roogondee</a>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 bg-gray-50">
              <tr>
                <th className="text-left p-3">ชื่อ</th>
                <th className="text-left p-3">สัญชาติ</th>
                <th className="text-left p-3">ประเภท / เลขที่</th>
                <th className="text-left p-3">วันที่ตรวจ</th>
                <th className="text-left p-3">ผล</th>
                <th className="text-left p-3">ใช้ยื่นได้ถึง</th>
                <th className="text-left p-3">ตรวจครั้งถัดไป</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {workers.map(w => {
                const c = w.latest
                const valid = !!c.valid_until && c.valid_until >= today
                return (
                  <tr key={w.patientId} className="border-t border-gray-100">
                    <td className="p-3">{c.patient_snapshot?.name || '—'}</td>
                    <td className="p-3">{c.patient_snapshot?.nationality || '—'}</td>
                    <td className="p-3">
                      <div>{CERT_TYPE_LABEL[c.cert_type as CertType] || c.cert_type}</div>
                      <div className="text-xs text-gray-400">{c.cert_no}</div>
                    </td>
                    <td className="p-3">{thDate(c.visit_date)}</td>
                    <td className="p-3 text-xs">{c.fit_status ? FIT_STATUS_LABEL[c.fit_status as FitStatus] : '—'}</td>
                    <td className={`p-3 ${valid ? 'text-green-700' : 'text-gray-400'}`}>{thDate(c.valid_until)}</td>
                    <td className="p-3"><div>{thDate(w.nextDue)}</div><DueBadge days={w.daysUntilDue} /></td>
                    <td className="p-3">
                      {c.public_token && (
                        <a href={`/verify/cert/${c.public_token}`} target="_blank" rel="noreferrer" className="text-forest underline text-xs">ดูใบรับรอง</a>
                      )}
                    </td>
                  </tr>
                )
              })}
              {workers.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-gray-400">ยังไม่มีใบรับรองที่ออกในชื่อบริษัทนี้</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="text-xs text-gray-400 text-center">
          ลิงก์นี้เป็นลิงก์ส่วนตัวของบริษัท โปรดอย่าส่งต่อ — ทุกการเข้าชมถูกบันทึกตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล
          · &ldquo;ตรวจครั้งถัดไป&rdquo; นับ 1 ปีจากวันที่ตรวจล่าสุด
        </p>
      </div>
    </main>
  )
}
