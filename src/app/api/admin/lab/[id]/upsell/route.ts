import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { issueVoucher } from '@/lib/quiz/voucher'
import { resolveContact } from '@/lib/crm/contacts'
import { enrollByTrigger } from '@/lib/crm/sequences'
import type { LabUpsell } from '@/lib/lab/types'

export const runtime = 'nodejs'

// POST { upsellIndex } — acts on a lab upsell suggestion: links/creates a lead
// for the patient, issues a pillar voucher, and enrols the contact into the
// cross-pillar nurture sequence. clinical_followup just records a lead note.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { upsellIndex } = (await req.json().catch(() => ({}))) as { upsellIndex?: number }

  const { data: report } = await supabaseAdmin
    .from('lab_reports').select('id, patient_id, upsell').eq('id', params.id).maybeSingle()
  if (!report) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const upsell = (report.upsell ?? []) as LabUpsell[]
  const u = upsell[upsellIndex ?? -1]
  if (!u) return NextResponse.json({ error: 'invalid upsellIndex' }, { status: 400 })

  const { data: patient } = await supabaseAdmin
    .from('patients').select('id, name, phone').eq('id', report.patient_id).maybeSingle()
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 })

  const contact = await resolveContact({
    patient_id: patient.id, phone: patient.phone, name: patient.name,
  })

  const service = u.kind === 'pillar' ? u.service : null
  const phone = patient.phone || `LAB-${patient.id.slice(0, 8)}`

  // Find or create a lead for this patient (+ service for pillar upsell).
  let leadQuery = supabaseAdmin.from('leads').select('id').eq('patient_id', patient.id)
  if (service) leadQuery = leadQuery.eq('service', service)
  const { data: existingLead } = await leadQuery.limit(1)
  let leadId = existingLead?.[0]?.id as string | undefined

  if (!leadId) {
    const { data: lead, error } = await supabaseAdmin.from('leads').insert([{
      first_name: patient.name,
      phone,
      service: service ?? 'glp1',
      source: 'lab-upsell',
      status: 'new',
      patient_id: patient.id,
      contact_id: contact?.id ?? null,
      utm_source: 'lab',
      utm_campaign: 'lab-upsell',
      note: u.kind === 'clinical_followup' ? `ตรวจเพิ่ม: ${u.title} — ${u.recommended_tests.join(', ')}` : null,
    }]).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    leadId = lead.id
  }

  let voucher = null
  if (service) {
    voucher = await issueVoucher({ leadId: leadId!, service })
    if (contact) await enrollByTrigger(contact, 'lab_abnormal', service)
  }

  logLeadAccess({ actor: me.email, action: 'lab_upsell', details: { patient_id: patient.id, report_id: params.id, kind: u.kind, service }, ip: requestIp(req) })
  return NextResponse.json({ ok: true, voucher, leadId })
}
