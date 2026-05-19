import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CaptionGenForm from '@/components/admin/CaptionGenForm'

export const metadata = { title: 'Caption Gen — รู้ก่อนดี Admin' }

export default async function CaptionGenPage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-forest">📝 Caption Generator</h1>
        <p className="text-sm text-gray-600 mt-1">
          Gen caption ภาษาไทย 3 versions สำหรับ FB/IG post — copy ไป paste ใน Page ได้เลย
        </p>
      </div>
      <CaptionGenForm />
    </div>
  )
}
