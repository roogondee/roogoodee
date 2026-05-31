import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PatientSearch from '@/components/admin/lab/PatientSearch'

export const revalidate = 0

export default async function LabHomePage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl text-forest">🧪 แปลผลแลป & เปรียบเทียบรายปี</h1>
        <a href="/admin/lab/watchlist" className="text-sm text-sage hover:text-forest">⚠️ Watchlist →</a>
      </div>
      <PatientSearch />
    </div>
  )
}
