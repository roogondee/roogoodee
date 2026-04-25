import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UserManagement from '@/components/admin/UserManagement'

export const revalidate = 0

export default async function UsersPage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')
  if (me.role !== 'manager') {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-xl p-6 border border-gray-100 text-center">
        <p className="text-forest font-semibold mb-1">🔒 Manager only</p>
        <p className="text-sm text-gray-500">หน้านี้เฉพาะ manager เท่านั้น</p>
      </div>
    )
  }

  const { data: users } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, name, role, created_at, disabled_at, last_login_at')
    .order('created_at', { ascending: false })

  return <UserManagement initial={users || []} currentUserId={me.id} />
}
