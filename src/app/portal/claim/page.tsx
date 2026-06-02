import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPatientSession } from '@/lib/patient-auth'
import ClaimForm from './ClaimForm'

export const revalidate = 0
export const metadata = { title: 'ยืนยันตัวตน — รู้ก่อนดี' }

export default async function ClaimPage() {
  const session = await getPatientSession()
  if (session) redirect('/portal/results')

  // Must have just verified LINE (pending cookie) to reach the claim step.
  const pending = cookies().get('line_pending')?.value
  if (!pending) redirect('/portal')

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-forest via-sage to-mint">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔐</div>
          <h1 className="font-display text-2xl text-forest">ยืนยันตัวตนครั้งแรก</h1>
          <p className="text-sm text-gray-500 mt-2">
            กรอกรหัสยืนยันที่ได้รับจากเจ้าหน้าที่ เพื่อเชื่อมบัญชี LINE ของคุณกับผลตรวจ
          </p>
        </div>
        <ClaimForm />
        <p className="text-[11px] text-gray-400 mt-6 text-center leading-relaxed">
          ยังไม่มีรหัส? ติดต่อเจ้าหน้าที่ทาง LINE @roogondee หรือ โทร 081-902-3540<br />
          รหัสนี้ใช้ยืนยันได้ครั้งเดียวเพื่อความปลอดภัย
        </p>
      </div>
    </main>
  )
}
