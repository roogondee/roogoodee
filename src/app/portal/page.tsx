import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPatientSession } from '@/lib/patient-auth'
import { lineLoginConfigured } from '@/lib/line-login'

export const revalidate = 0
export const metadata = { title: 'ดูผลตรวจของคุณ — รู้ก่อนดี' }

const ERRORS: Record<string, string> = {
  unavailable: 'ระบบดูผลตรวจออนไลน์กำลังจะเปิดให้บริการเร็วๆ นี้',
  state: 'เซสชันหมดอายุ กรุณาลองใหม่อีกครั้ง',
  line: 'เข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองใหม่',
}

export default async function PortalLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const session = await getPatientSession()
  if (session) redirect('/portal/results')

  const configured = lineLoginConfigured()
  const err = searchParams.error ? ERRORS[searchParams.error] ?? 'เกิดข้อผิดพลาด' : null

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-forest via-sage to-mint">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🧪</div>
          <h1 className="font-display text-2xl text-forest">ดูผลตรวจสุขภาพของคุณ</h1>
          <p className="text-sm text-gray-500 mt-2">เข้าสู่ระบบด้วย LINE เพื่อดูผลตรวจและแนวโน้มสุขภาพของคุณอย่างปลอดภัย</p>
        </div>

        {err && <div className="mb-4 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 text-center">{err}</div>}

        {configured ? (
          <a
            href="/api/portal/line/start"
            className="flex items-center justify-center gap-2 w-full bg-[#06C755] text-white font-semibold py-3 rounded-xl hover:brightness-95 transition"
          >
            <span className="text-lg">💬</span> เข้าสู่ระบบด้วย LINE
          </a>
        ) : (
          <div className="text-center text-sm text-gray-400 bg-gray-50 rounded-xl p-4">
            ระบบดูผลตรวจออนไลน์กำลังจะเปิดให้บริการเร็วๆ นี้
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-6 text-center leading-relaxed">
          ข้อมูลผลตรวจเป็นความลับ เข้าถึงได้เฉพาะเจ้าของบัญชี LINE ที่ได้รับการยืนยันแล้วเท่านั้น<br />
          ครั้งแรกต้องใช้รหัสยืนยันจากเจ้าหน้าที่
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-forest">← กลับหน้าหลัก</Link>
        </div>
      </div>
    </main>
  )
}
