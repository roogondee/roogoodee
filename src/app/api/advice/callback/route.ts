import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import { sendLeadNotification } from '@/lib/email'
import { checkAdviceRateLimit, clientIpFrom } from '@/lib/advice/rate-limit'
import { ADVICE_NO_NAME } from '@/lib/advice/tools'

export const runtime = 'nodejs'

// POST /api/advice/callback — the one-field "ฝากเบอร์ให้พยาบาลโทรเช็ก" box
// under the /advice chat. A phone number is the whole form: the visitor
// already told the chat what is wrong, so the nurse's briefing is built from
// the session transcript here instead of asking them to type it again.
//
// Same lead shape as the chat's own create_lead (source 'advice-chat', so
// /admin/growth and the offline Ads feed treat both the same), and idempotent
// per session: a session that already produced a lead never makes a second.

type Block = { type?: string; name?: string; input?: Record<string, unknown>; text?: string }
type StoredMessage = { role: string; content: string | Block[] }

function clean(v: unknown, max = 120): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
}

function sanitizePhone(raw: unknown): string | null {
  const digits = typeof raw === 'string' ? raw.replace(/\D/g, '') : ''
  return /^0\d{8,9}$/.test(digits) ? digits : null
}

// What the nurse needs to open the call with: the intake summary when the
// chat got that far, otherwise the visitor's first message.
function briefingFrom(messages: StoredMessage[]): string {
  for (const m of messages) {
    if (m.role !== 'assistant' || !Array.isArray(m.content)) continue
    const intake = m.content.find(b => b.type === 'tool_use' && b.name === 'submit_intake')
    if (intake?.input) {
      const i = intake.input
      return [i.chief_complaint, i.duration, i.severity, i.associated_symptoms]
        .filter(x => typeof x === 'string' && x.trim())
        .join(' · ')
    }
  }
  const first = messages.find(m => m.role === 'user' && typeof m.content === 'string')
  return typeof first?.content === 'string' ? first.content : ''
}

export async function POST(req: NextRequest) {
  const ip = clientIpFrom(req)
  if (!checkAdviceRateLimit(ip).allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  // Honeypot — fake-accept so bots don't learn they were filtered.
  if (clean(body.website)) return NextResponse.json({ ok: true })

  const phone = sanitizePhone(body.phone)
  if (!phone) return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400 })
  const name = clean(body.name, 80) || ADVICE_NO_NAME

  const sessionId = clean(body.sessionId, 64)
  let messages: StoredMessage[] = []
  if (sessionId) {
    const { data } = await supabaseAdmin
      .from('chat_sessions')
      .select('messages, lead_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (data?.lead_id) return NextResponse.json({ ok: true, already: true })
    if (Array.isArray(data?.messages)) messages = data.messages as StoredMessage[]
  }

  const briefing = briefingFrom(messages)
  const note = `ขอให้พยาบาลโทรเช็กอาการ (ฝากเบอร์ใต้แชท /advice)${briefing ? `: ${briefing}` : ''}`.slice(0, 500)
  const attr = (body.attribution && typeof body.attribution === 'object' ? body.attribution : {}) as Record<string, unknown>

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert({
      first_name: name,
      phone,
      service: 'general',
      source: 'advice-chat',
      status: 'new',
      note,
      utm_source: clean(attr.utm_source),
      utm_medium: clean(attr.utm_medium),
      utm_campaign: clean(attr.utm_campaign),
      gclid: clean(attr.gclid, 200),
    })
    .select('id')
    .single()
  if (error || !lead) {
    console.error('[advice-callback] insert failed:', error?.message)
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
  }

  if (sessionId) {
    await supabaseAdmin.from('chat_sessions').update({ lead_id: lead.id }).eq('id', sessionId).is('lead_id', null)
  }

  sendLeadNotification({ name, phone, service: 'general', source: 'advice-chat', note })
  try {
    await notifyLineGroup({ name, phone, service: 'general', source: 'advice-chat', note })
  } catch (err) {
    console.error('[advice-callback] notifyLineGroup failed:', err)
  }

  return NextResponse.json({ ok: true })
}
