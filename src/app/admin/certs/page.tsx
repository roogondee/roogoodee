import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser, canWrite } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CERT_TYPE_LABEL, type CertType } from '@/lib/certs/types'

export const revalidate = 0

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-green-100 text-green-700',
  revoked: 'bg-red-100 text-red-700',
}
const STATUS_TH: Record<string, string> = { draft: 'ฉบับร่าง', issued: 'ออกแล้ว', revoked: 'เพิกถอน' }

interface SearchParams {
  status?: string; type?: string; q?: string; from?: string; to?: string
}

export default async function CertsListPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')
  const writable = canWrite(me)

  const q = searchParams.q?.trim()

  let query = supabaseAdmin
    .from('medical_certificates')
    .select('id, cert_no, cert_type, status, visit_date, valid_until, doctor_name, created_at, patients(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.type) query = query.eq('cert_type', searchParams.type)
  if (searchParams.from) query = query.gte('visit_date', searchParams.from)
  if (searchParams.to) query = query.lte('visit_date', searchParams.to)

  if (q) {
    // Match cert number directly, or any patient whose name matches.
    const { data: pts } = await supabaseAdmin
      .from('patients').select('id').ilike('name', `%${q}%`).limit(200)
    const ids = (pts ?? []).map((p) => p.id)
    const orParts = [`cert_no.ilike.%${q}%`]
    if (ids.length) orParts.push(`patient_id.in.(${ids.join(',')})`)
    query = query.or(orParts.join(','))
  }

  const { data } = await query
  const rows = (data ?? []) as unknown as {
    id: string; cert_no: string | null; cert_type: CertType; status: string
    visit_date: string; valid_until: string | null; doctor_name: string | null
    patients: { name: string } | null
  }[]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl text-forest">📜 ทะเบียนใบรับรองแพทย์</h1>
        <div className="flex gap-2">
          <Link href="/admin/certs/summary" className="text-sm border border-gray-300 text-gray-600 px-4 py-2 rounded-xl hover:border-forest hover:text-forest transition-colors">สรุปรายเดือน</Link>
          {writable && <Link href="/admin/certs/import" className="text-sm border border-forest text-forest px-4 py-2 rounded-xl hover:bg-forest hover:text-white transition-colors">นำเข้าเป็นชุด (Excel/CSV)</Link>}
          {writable && <Link href="/admin/certs/new" className="text-sm bg-forest text-white px-4 py-2 rounded-xl hover:bg-sage">+ ออกใบรับรองใหม่</Link>}
        </div>
      </div>

      {/* Search + date filters */}
      <form method="get" className="flex flex-wrap items-end gap-2 mb-4 text-sm">
        <input type="hidden" name="status" value={searchParams.status ?? ''} />
        <input type="hidden" name="type" value={searchParams.type ?? ''} />
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-400 block mb-1">ค้นหา (ชื่อ / เลขที่ใบ)</label>
          <input name="q" defaultValue={q ?? ''} placeholder="เช่น สมชาย หรือ WMC-2569-000123" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-mint outline-none" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">ตรวจตั้งแต่</label>
          <input type="date" name="from" defaultValue={searchParams.from ?? ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">ถึง</label>
          <input type="date" name="to" defaultValue={searchParams.to ?? ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="bg-forest text-white px-4 py-2 rounded-lg">ค้นหา</button>
        {(q || searchParams.from || searchParams.to) && (
          <Link href={statusHref(searchParams)} className="px-3 py-2 text-gray-400 hover:text-forest">ล้าง</Link>
        )}
      </form>

      <div className="flex gap-2 mb-4 text-sm flex-wrap">
        <FilterLink label="ทั้งหมด" href={withStatus(searchParams, undefined)} active={!searchParams.status} />
        <FilterLink label="ฉบับร่าง" href={withStatus(searchParams, 'draft')} active={searchParams.status === 'draft'} />
        <FilterLink label="ออกแล้ว" href={withStatus(searchParams, 'issued')} active={searchParams.status === 'issued'} />
        <FilterLink label="เพิกถอน" href={withStatus(searchParams, 'revoked')} active={searchParams.status === 'revoked'} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-3 px-4">เลขที่</th><th className="py-3 px-4">คนไข้</th>
              <th className="py-3 px-4">ประเภท</th><th className="py-3 px-4">วันตรวจ</th>
              <th className="py-3 px-4">ใช้ได้ถึง</th><th className="py-3 px-4">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">ไม่พบใบรับรองที่ตรงกับเงื่อนไข</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <Link href={`/admin/certs/${r.id}`} className="text-forest font-medium hover:underline">{r.cert_no ?? '— ร่าง —'}</Link>
                </td>
                <td className="py-3 px-4">{r.patients?.name ?? '-'}</td>
                <td className="py-3 px-4 text-gray-600">{CERT_TYPE_LABEL[r.cert_type]}</td>
                <td className="py-3 px-4 text-gray-500">{r.visit_date}</td>
                <td className="py-3 px-4 text-gray-500">{r.valid_until ?? '-'}</td>
                <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGE[r.status]}`}>{STATUS_TH[r.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">แสดงสูงสุด 100 รายการล่าสุด — ใช้ช่องค้นหา/ช่วงวันที่เพื่อกรอง</p>
    </div>
  )
}

function toQuery(sp: Record<string, string | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (v) p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ''
}
function withStatus(sp: SearchParams, status: string | undefined): string {
  return `/admin/certs${toQuery({ ...sp, status })}`
}
function statusHref(sp: SearchParams): string {
  return `/admin/certs${toQuery({ status: sp.status, type: sp.type })}`
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} className={`px-3 py-1.5 rounded-full ${active ? 'bg-forest text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-forest'}`}>
      {label}
    </Link>
  )
}
