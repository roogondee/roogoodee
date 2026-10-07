import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getDmglpUser, can } from '@/lib/dmglp/roles'
import { dmglpAudit } from '@/lib/dmglp/audit'
import { adsTimestamp } from '@/lib/dmglp/dates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Controlled-drug ledger CSV for the monthly report / Track & Trace
// submission (§4.8). Field list is what the MOPH form asks for; adjust the
// header row here if the template changes.
const HEADER = ['dispensed_at', 'sku', 'lot', 'expiry', 'received_at', 'supplier_doc', 'patient_hn', 'prescription_id', 'doctor_name', 'doctor_license', 'pharmacist', 'pharmacist_license']

function cell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  const me = await getDmglpUser()
  if (!me || !can(me.role, 'pharmacy.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from('dmglp_dispenses')
    .select('id, dispensed_at, doctor_name, doctor_license, prescription_id, patient:dmglp_patients(hn), pen:dmglp_pens(sku, lot, expiry, received_at, supplier_doc), pharmacist:admin_users!dmglp_dispenses_pharmacist_id_fkey(name, email, license_no)')
    .order('dispensed_at', { ascending: true })
    .limit(10000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const one = <T,>(v: T | T[] | null): T | null => Array.isArray(v) ? (v[0] ?? null) : v
  const lines = [HEADER.join(',')]
  for (const d of data ?? []) {
    const pen = one(d.pen) as { sku: string; lot: string; expiry: string; received_at: string; supplier_doc: string | null } | null
    const p = one(d.patient) as { hn: string | null } | null
    const ph = one(d.pharmacist) as { name: string | null; email: string; license_no: string | null } | null
    lines.push([adsTimestamp(d.dispensed_at), pen?.sku, pen?.lot, pen?.expiry, pen?.received_at, pen?.supplier_doc, p?.hn, d.prescription_id, d.doctor_name, d.doctor_license, ph?.name || ph?.email, ph?.license_no].map(cell).join(','))
  }
  dmglpAudit(me, 'export', 'dmglp_dispenses', null, { rows: lines.length - 1 })
  return new NextResponse('﻿' + lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="dmglp-controlled-drug-${new Date().toISOString().slice(0, 10)}.csv"` },
  })
}
