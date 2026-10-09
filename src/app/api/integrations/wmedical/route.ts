import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logLeadAccess, requestIp } from '@/lib/audit'
import { notifyLineGroup, notifySaleGroupText } from '@/lib/line-notify'
import { markLeadVisited } from '@/lib/growth/visit'
import {
  BOOKABLE_STATUSES,
  SIGNATURE_HEADER,
  VISITABLE_STATUSES,
  VISIT_MATCH_WINDOW_DAYS,
  idempotencyKey,
  leadInsert,
  leadNote,
  leadSummary,
  parseEvent,
  phoneSha256,
  typeLabel,
  verifySignature,
  visitActivityBody,
  type WmhLeadCreated,
  type WmhVisitCompleted,
} from '@/lib/integrations/wmedical'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Inbound events from the W Medical systems (hospital website, pharmacy).
// Contract, privacy rules and setup: src/lib/integrations/wmedical.ts and
// docs/system-integration.md.
//
//   lead.created    → a new lead in the pipeline, or — when the same phone
//                     already has an open lead here — a timeline entry on it,
//                     so a quiz lead who then books on the hospital site stays
//                     one card instead of two.
//   visit.completed → the most recent open lead with that phone hash is
//                     stamped visited (markLeadVisited: ROI dashboard, Meta
//                     CAPI, Google offline conversions). No match → nothing
//                     is stored.

const MAX_BODY_BYTES = 16 * 1024
const SYSTEM_ACTOR = 'system:wmedical'

interface OpenLead {
  id: string
  status: string | null
  first_name: string | null
  service: string | null
}

// Most recent lead with one of these phone hashes that hasn't come in yet.
async function findOpenLead(hashes: string[]): Promise<OpenLead | null> {
  const since = new Date(Date.now() - VISIT_MATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, status, first_name, service')
    .in('phone_sha256', hashes)
    .is('visited_at', null)
    .not('status', 'in', '(customer,converted)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`lead lookup failed: ${error.message}`)
  return (data as OpenLead[] | null)?.[0] ?? null
}

async function addActivity(leadId: string, kind: 'note' | 'visit', body: string, outcome: string | null = null) {
  const { error } = await supabaseAdmin.from('lead_activities').insert([{
    lead_id: leadId, actor_email: SYSTEM_ACTOR, kind, outcome, body,
  }])
  if (error) throw new Error(`activity insert failed: ${error.message}`)
}

async function handleLead(e: WmhLeadCreated, ip: string | undefined) {
  const hash = phoneSha256(e.phone)
  const existing = hash ? await findOpenLead([hash]) : null

  if (existing) {
    const booked = e.type === 'booking'
    await addActivity(existing.id, 'note', leadNote(e), booked ? 'booked' : null)
    if (booked && existing.status && BOOKABLE_STATUSES.includes(existing.status)) {
      await supabaseAdmin.from('leads').update({ status: 'booked' })
        .eq('id', existing.id).eq('status', existing.status)
    }
    logLeadAccess({ leadId: existing.id, actor: SYSTEM_ACTOR, action: 'activity', details: { event: 'lead.created', type: e.type }, ip })
    if (booked || e.type === 'group_booking') {
      try {
        await notifySaleGroupText([
          `📅 ลีดเดิม${booked ? 'จองนัด' : 'ขอจองตรวจแบบกลุ่ม'}ผ่านเว็บโรงพยาบาล W Medical แล้ว`,
          `👤 ${e.name}`,
          `📞 ${e.phone}`,
          `📋 ${leadSummary(e)}`,
          booked ? 'สถานะในระบบเปลี่ยนเป็น booked แล้ว — ไม่ต้องโทรชวนจองซ้ำ' : 'ลีดนี้มีอยู่แล้วในระบบ — ตามต่อจากการ์ดเดิม',
          '',
          '👉 https://www.roogondee.com/admin',
        ].join('\n'))
      } catch (err) {
        console.error('[wmedical] sales notify failed:', err)
      }
    }
    return { action: 'merged' as const, lead_id: existing.id }
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert([{ ...leadInsert(e), fbclid: e.attribution.fbclid ?? null }])
    .select('id')
    .single()
  if (error) throw new Error(`lead insert failed: ${error.message}`)
  const leadId = (data as { id: string }).id
  logLeadAccess({ leadId, actor: SYSTEM_ACTOR, action: 'update', details: { event: 'lead.created', type: e.type }, ip })

  // Newsletter sign-ups asked for news, not a call.
  if (e.type !== 'subscriber') {
    try {
      await notifyLineGroup({
        name: e.name,
        phone: e.phone,
        service: e.type === 'group_booking' ? 'foreign' : 'general',
        source: `เว็บโรงพยาบาล W Medical (${typeLabel(e.type)})`,
        note: leadSummary(e),
      })
    } catch (err) {
      console.error('[wmedical] notifyLineGroup failed:', err)
    }
  }
  return { action: 'created' as const, lead_id: leadId }
}

async function handleVisit(e: WmhVisitCompleted, ip: string | undefined) {
  const lead = await findOpenLead(e.phone_sha256)
  if (!lead) return 'no_match'

  const { firstVisit } = await markLeadVisited(lead.id)
  if (!firstVisit) return 'already_visited'

  if (lead.status && VISITABLE_STATUSES.includes(lead.status)) {
    await supabaseAdmin.from('leads').update({ status: 'visited' })
      .eq('id', lead.id).eq('status', lead.status)
  }
  await addActivity(lead.id, 'visit', visitActivityBody(e))
  logLeadAccess({ leadId: lead.id, actor: SYSTEM_ACTOR, action: 'update', details: { event: 'visit.completed', system: e.system }, ip })
  return 'visit_recorded'
}

export async function POST(req: NextRequest) {
  const secret = process.env.WMEDICAL_WEBHOOK_SECRET || ''
  if (!secret) {
    // Never accept unsigned events — off until the secret is set.
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const body = await req.text()
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 })
  }
  if (!verifySignature(body, req.headers.get(SIGNATURE_HEADER), secret)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 })
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const parsed = parseEvent(json)
  if (!parsed.ok) {
    if (parsed.ignorable) return NextResponse.json({ ok: true, ignored: true })
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const event = parsed.event
  const ip = requestIp(req)

  // Claim the event first so a repeated delivery is a no-op; released again
  // if processing fails, so a retry can still go through.
  const key = idempotencyKey(event)
  if (key) {
    const { error } = await supabaseAdmin
      .from('processed_webhook_events')
      .insert({ event_id: key, source: 'wmedical' })
    if (error) {
      if ((error as { code?: string }).code === '23505') return NextResponse.json({ ok: true, duplicate: true })
      console.error('[wmedical] dedup claim failed:', error.message)
    }
  }

  try {
    if (event.event === 'lead.created') {
      const result = await handleLead(event, ip)
      return NextResponse.json({ ok: true, ...result })
    }
    const outcome = await handleVisit(event, ip)
    console.info(`[wmedical] visit.completed ${event.system}:${event.type} → ${outcome}`)
    // The sender isn't told whether the patient was one of our leads.
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (key) await supabaseAdmin.from('processed_webhook_events').delete().eq('event_id', key)
    console.error('[wmedical] processing failed:', err)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}
