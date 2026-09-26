import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp } from '@/lib/dmglp/roles'
import { DMGLP_ROLES, ROLE_LABELS_TH } from '@/lib/dmglp/config'
import { assignStaffRole } from '../../actions'
import { Card, Flash, PageHeader, Table, td } from '../../ui'

export const dynamic = 'force-dynamic'

// Site managers assign program roles to existing admin users (§3). New
// accounts are still created at /admin/users.
export default async function StaffPage({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const me = await requireDmglp()
  if (!me.canManageStaff) redirect('/dmglp/staff/forbidden?need=site-manager')
  const { data: users } = await supabaseAdmin
    .from('admin_users').select('id, email, name, role, dmglp_role, license_no, is_specialist, disabled_at').is('disabled_at', null).order('email')
  return (
    <>
      <PageHeader title="ทีมงานโปรแกรม DM / GLP-1" subtitle="กำหนดบทบาทให้บัญชี admin ที่มีอยู่ — สร้างบัญชีใหม่ที่ /admin/users · แพทย์และเภสัชกรต้องมีเลขใบประกอบวิชาชีพจึงจะสั่ง/จ่ายยาได้" />
      <Flash searchParams={searchParams} />
      <Card>
        <Table head={['บัญชี', 'สิทธิ์เว็บ', 'บทบาทในโปรแกรม', 'เลขใบประกอบวิชาชีพ', 'แพทย์เฉพาะทาง', '']} empty={(users ?? []).length === 0}>
          {(users ?? []).map(u => (
            <tr key={u.id}>
              <td className={td}>{u.name || '—'}<div className="text-xs text-gray-500">{u.email}</div></td>
              <td className={td}>{u.role}</td>
              <td className={td} colSpan={4}>
                <form action={assignStaffRole} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="dmglp_role" defaultValue={u.dmglp_role ?? ''} className="border border-gray-200 rounded px-2 py-1 text-sm">
                    <option value="">— ไม่มี —</option>
                    {DMGLP_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS_TH[r]}</option>)}
                  </select>
                  <input name="license_no" defaultValue={u.license_no ?? ''} placeholder="เลขใบประกอบฯ" className="border border-gray-200 rounded px-2 py-1 text-sm w-36" />
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" name="is_specialist" defaultChecked={!!u.is_specialist} /> เฉพาะทาง</label>
                  <button className="text-xs text-forest underline">บันทึก</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
