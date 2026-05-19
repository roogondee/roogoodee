import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import MindIntakeClient from './MindIntakeClient'

export const metadata: Metadata = {
  title: 'Pre-session intake — Roogondee Mind',
  description: 'คุยกับ AI ผู้ช่วยเตรียมตัว 10-15 นาทีก่อน session — ส่วนตัว ไม่ตัดสิน',
  robots: { index: false, follow: false },  // private — no search indexing
}

export const dynamic = 'force-dynamic'

interface Props {
  params: { voucher: string }
}

export default async function MindIntakePage({ params }: Props) {
  const code = params.voucher.toUpperCase()

  if (!/^RGD-MND-[A-Z0-9]{6}$/.test(code)) notFound()

  const { data: voucher } = await supabaseAdmin
    .from('vouchers')
    .select('id, code, service, leads(first_name)')
    .eq('code', code)
    .maybeSingle()

  if (!voucher || voucher.service !== 'mind') notFound()

  // Type narrowing: leads can come back as object or array depending on the
  // PostgREST embedding form — handle both safely.
  const leads = voucher.leads as { first_name?: string } | { first_name?: string }[] | null
  const lead = Array.isArray(leads) ? leads[0] : leads
  const firstName = lead?.first_name || 'คุณ'

  return <MindIntakeClient voucherCode={code} firstName={firstName} />
}
