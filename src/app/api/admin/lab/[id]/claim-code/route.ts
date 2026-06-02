import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { logLeadAccess, requestIp } from '@/lib/audit'

export const runtime = 'nodejs'

// Unambiguous alphabet (no 0/O/1/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CLAIM_TTL_DAYS = 14

function genCode(len = 8): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

// POST /api/admin/lab/{patientId}/claim-code — staff issues a single-use code
// the patient enters once (after LINE login) to link their LINE id to results.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: patient } = await supabaseAdmin
    .from('patients').select('id, name').eq('id', params.id).maybeSingle()
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 })

  const expiresAt = new Date(Date.now() + CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode()
    const { data, error } = await supabaseAdmin
      .from('patient_claim_codes')
      .insert([{ patient_id: patient.id, code, issued_by: me.id, expires_at: expiresAt }])
      .select('code, expires_at')
      .single()
    if (!error && data) {
      logLeadAccess({ actor: me.email, action: 'update', details: { event: 'issue_claim_code', patient_id: patient.id }, ip: requestIp(req) })
      return NextResponse.json({ ok: true, code: data.code, expires_at: data.expires_at })
    }
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'ไม่สามารถสร้างรหัสได้' }, { status: 500 })
}
