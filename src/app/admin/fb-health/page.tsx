import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FbHealthDashboard from '@/components/admin/FbHealthDashboard'

export const metadata = { title: 'FB Health — รู้ก่อนดี Admin' }

export default async function FbHealthPage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-forest">🩺 Facebook Health Check</h1>
        <p className="text-sm text-gray-600 mt-1">
          ตรวจว่า env vars + token + permission พร้อมยิง Meta Ads + CAPI หรือยัง
        </p>
      </div>
      <FbHealthDashboard />
    </div>
  )
}
