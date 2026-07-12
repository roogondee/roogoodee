import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { MedicalCertificate } from '@/lib/certs/types'
import CertEditForm from '@/components/admin/certs/CertEditForm'

export const revalidate = 0

export default async function EditCertPage({ params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const { data } = await supabaseAdmin.from('medical_certificates').select('*').eq('id', params.id).maybeSingle()
  if (!data) redirect('/admin/certs')
  const cert = data as MedicalCertificate
  // Issued/revoked certs are frozen — bounce back to the read-only detail view.
  if (cert.status !== 'draft') redirect(`/admin/certs/${params.id}`)

  return <CertEditForm cert={cert} />
}
