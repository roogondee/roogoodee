import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { newEmployerToken } from '@/lib/growth/employer'

export const runtime = 'nodejs'

// Employer (HR) portal accounts. Manager-only: an account is a standing grant
// of access to a workforce's health-certificate list.
//
// The raw token is returned exactly once (create / regenerate) as a full
// entry link; only its sha256 is stored.

function entryLink(req: NextRequest, token: string): string {
  const base = (process.env.SITE_BASE_URL || req.nextUrl.origin).replace(/\/$/, '')
  return `${base}/hr/k/${token}`
}

function cleanNames(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return Array.from(new Set(v.map(x => String(x).trim()).filter(Boolean))).slice(0, 20)
}

async function managerOr403() {
  const me = await getSessionUser()
  return me && me.role === 'manager' ? me : null
}

export async function POST(req: NextRequest) {
  const me = await managerOr403()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    name?: string; match_names?: string[]; contact_name?: string; contact_phone?: string
  }
  const name = (body.name || '').trim().slice(0, 200)
  const matchNames = cleanNames(body.match_names)
  if (!name) return NextResponse.json({ error: 'กรุณากรอกชื่อบริษัท' }, { status: 400 })
  if (matchNames.length === 0) {
    return NextResponse.json({ error: 'กรุณาระบุชื่อนายจ้างที่ใช้ในใบรับรองอย่างน้อย 1 ชื่อ' }, { status: 400 })
  }

  const { token, hash } = newEmployerToken()
  const { data, error } = await supabaseAdmin.from('employer_accounts').insert({
    name,
    match_names: matchNames,
    contact_name: (body.contact_name || '').trim().slice(0, 200) || null,
    contact_phone: (body.contact_phone || '').trim().slice(0, 50) || null,
    token_hash: hash,
    created_by: me.id,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id, link: entryLink(req, token) })
}

// PATCH ?id=… { action: 'regenerate' | 'deactivate' | 'activate' } or { match_names }
export async function PATCH(req: NextRequest) {
  const me = await managerOr403()
  if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const body = (await req.json().catch(() => ({}))) as { action?: string; match_names?: string[] }

  if (body.action === 'regenerate') {
    // Invalidates the old link immediately (its hash no longer matches).
    const { token, hash } = newEmployerToken()
    const { error } = await supabaseAdmin.from('employer_accounts').update({ token_hash: hash, active: true }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, link: entryLink(req, token) })
  }
  if (body.action === 'deactivate' || body.action === 'activate') {
    const { error } = await supabaseAdmin.from('employer_accounts').update({ active: body.action === 'activate' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (body.match_names) {
    const names = cleanNames(body.match_names)
    if (names.length === 0) return NextResponse.json({ error: 'ต้องมีอย่างน้อย 1 ชื่อ' }, { status: 400 })
    const { error } = await supabaseAdmin.from('employer_accounts').update({ match_names: names }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'nothing to do' }, { status: 400 })
}
