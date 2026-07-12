import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CERT_TYPE_LABEL, type CertType } from '@/lib/certs/types'

export const revalidate = 0

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-green-100 text-green-700',
  revoked: 'bg-red-100 text-red-700',
}
const STATUS_TH: Record<string, string> = { draft: 'ฉบับร่าง', issued: 'ออกแล้ว', revoked: 'เพิกถอน' }

export default async function CertsListPage({ searchParams }: { searchParams: { status?: string; type?: string } }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  let query = supabaseAdmin
    .from('medical_certificates')
    .select('id, cert_no, cert_type, status, visit_date, valid_until, doctor_name, created_at, patients(name)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.type) query = query.eq('cert_type', searchParams.type)

  const { data } = await query
  const rows = (data ?? []) as unknown as {
    id: string; cert_no: string | null; cert_type: CertType; status: string
    visit_date: string; valid_until: string | null; doctor_name: string | null
    patients: { name: string } | null
  }[]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl text-forest">📜 ใบรับรองแพทย์</h1>
        <div className="flex gap-2">
          <Link href="/admin/certs/import" className="text-sm border border-forest text-forest px-4 py-2 rounded-xl hover:bg-forest hover:text-white transition-colors">นำเข้าเป็นชุด (CSV)</Link>
          <Link href="/admin/certs/new" className="text-sm bg-forest text-white px-4 py-2 rounded-xl hover:bg-sage">+ ออกใบรับรองใหม่</Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4 text-sm flex-wrap">
        <FilterLink label="ทั้งหมด" href="/admin/certs" active={!searchParams.status && !searchParams.type} />
        <FilterLink label="ฉบับร่าง" href="/admin/certs?status=draft" active={searchParams.status === 'draft'} />
        <FilterLink label="ออกแล้ว" href="/admin/certs?status=issued" active={searchParams.status === 'issued'} />
        <FilterLink label="เพิกถอน" href="/admin/certs?status=revoked" active={searchParams.status === 'revoked'} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-3 px-4">เลขที่</th><th className="py-3 px-4">คนไข้</th>
              <th className="py-3 px-4">ประเภท</th><th className="py-3 px-4">วันตรวจ</th>
              <th className="py-3 px-4">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">ยังไม่มีใบรับรอง</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <Link href={`/admin/certs/${r.id}`} className="text-forest font-medium hover:underline">{r.cert_no ?? '— ร่าง —'}</Link>
                </td>
                <td className="py-3 px-4">{r.patients?.name ?? '-'}</td>
                <td className="py-3 px-4 text-gray-600">{CERT_TYPE_LABEL[r.cert_type]}</td>
                <td className="py-3 px-4 text-gray-500">{r.visit_date}</td>
                <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGE[r.status]}`}>{STATUS_TH[r.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} className={`px-3 py-1.5 rounded-full ${active ? 'bg-forest text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-forest'}`}>
      {label}
    </Link>
  )
}
