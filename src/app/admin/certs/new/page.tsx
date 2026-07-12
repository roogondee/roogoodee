import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import CertForm from '@/components/admin/certs/CertForm'

export const revalidate = 0

export default async function NewCertPage() {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  // Prefill doctor sign-off from the logged-in user's license, if recorded.
  let doctorDefault: { name?: string | null; license?: string | null } = { name: me.name }
  if (me.id) {
    const { data } = await supabaseAdmin
      .from('admin_users')
      .select('name, license_no')
      .eq('id', me.id)
      .maybeSingle()
    if (data) doctorDefault = { name: data.name, license: data.license_no }
  }

  return <CertForm doctorDefault={doctorDefault} />
}
