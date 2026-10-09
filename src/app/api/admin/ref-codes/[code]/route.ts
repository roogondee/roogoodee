import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, requestIp } from '@/lib/auth'
import { logLeadAccess } from '@/lib/audit'
import { getRef, markRefVisited, REF_LABEL } from '@/lib/growth/ref-visits'
import { parseBareRefCode } from '@/lib/refcodes'

interface RouteParams { params: { code: string } }

// Website ref codes (MC-xxxxx / CL-xxxxx) at the counter — the /admin/redeem
// screen sends them here instead of the voucher route. Recording the visit is
// what reports it to Google Ads / Meta (src/lib/growth/ref-visits.ts).

function codeFrom(params: RouteParams['params']): string | null {
  return parseBareRefCode(decodeURIComponent(params.code))?.code ?? null
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = codeFrom(params)
  if (!code) return NextResponse.json({ error: 'รูปแบบรหัสไม่ถูกต้อง' }, { status: 400 })
  const ref = await getRef(code)
  if (!ref) return NextResponse.json({ error: 'ไม่พบรหัสอ้างอิงนี้' }, { status: 404 })

  return NextResponse.json({
    ref: {
      code: ref.ref_code,
      program: ref.program,
      label: REF_LABEL[ref.program],
      created_at: ref.created_at,
      via_line: !!ref.lead_id,
      from_ads: !!(ref.gclid || ref.fbc),
      visited_at: ref.visited_at,
      visit_source: ref.visit_source,
    },
  })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = codeFrom(params)
  if (!code) return NextResponse.json({ error: 'รูปแบบรหัสไม่ถูกต้อง' }, { status: 400 })

  const res = await markRefVisited(code, 'redeem')
  if (res.status === 'not_found') return NextResponse.json({ error: 'ไม่พบรหัสอ้างอิงนี้' }, { status: 404 })
  if (res.status === 'already') {
    return NextResponse.json({ error: 'รหัสนี้บันทึกว่ามาแล้ว', visited_at: res.ref.visited_at }, { status: 409 })
  }

  if (res.ref.lead_id) {
    logLeadAccess({
      leadId: res.ref.lead_id,
      actor: me.email,
      action: 'redeem',
      details: { ref_code: code },
      ip: requestIp(req),
    })
  }
  return NextResponse.json({ ok: true, visited_at: res.ref.visited_at })
}
