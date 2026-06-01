import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { computeHealthScore } from '@/lib/lab/score'
import type { LabAnalyte } from '@/lib/lab/types'

export const runtime = 'nodejs'

// PATCH /api/admin/lab/[id]/confirm
// Body: { analytes?, reviewerName?, reviewerLicense? }
// Optional corrected analytes (human review), then flips status->confirmed,
// sets the public verify token + reviewer sign-off.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {
    status: 'confirmed',
    confirmed_by: me.id,
    confirmed_at: new Date().toISOString(),
    public_token: randomUUID().replace(/-/g, ''),
    reviewer_name: body.reviewerName?.trim() || me.name || me.email,
    reviewer_license: body.reviewerLicense?.trim() || null,
  }

  // If staff corrected analytes, persist them and recompute the health score.
  if (Array.isArray(body.analytes)) {
    const analytes = body.analytes as LabAnalyte[]
    const { score, risk_level } = computeHealthScore(analytes)
    update.analytes = analytes
    update.health_score = score
    update.risk_level = risk_level
  }

  // Preserve an existing token if already confirmed once.
  const { data: current } = await supabaseAdmin
    .from('lab_reports')
    .select('public_token, patient_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (current.public_token) update.public_token = current.public_token

  const { data, error } = await supabaseAdmin
    .from('lab_reports')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logLeadAccess({ actor: me.email, action: 'lab_confirm', details: { patient_id: current.patient_id, report_id: params.id }, ip: requestIp(req) })
  return NextResponse.json({ report: data })
}
