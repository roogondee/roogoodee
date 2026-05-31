import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import PipelineBoard, { type PipelineLead } from '@/components/admin/PipelineBoard'

export const revalidate = 0

export default async function PipelinePage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, first_name, last_name, service, status, lead_tier, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const leads: PipelineLead[] = (data ?? []).map((l) => ({
    id: l.id,
    name: [l.first_name, l.last_name].filter(Boolean).join(' '),
    service: l.service,
    status: l.status ?? 'new',
    tier: l.lead_tier,
    created_at: l.created_at,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-gray-400 hover:text-forest">← กลับ</Link>
          <h1 className="font-display text-2xl text-forest mt-1">Pipeline การขาย</h1>
          <p className="text-sm text-gray-500">ลากการ์ดเพื่อเปลี่ยนสถานะ ({leads.length} รายล่าสุด)</p>
        </div>
      </div>
      <PipelineBoard leads={leads} />
    </div>
  )
}
