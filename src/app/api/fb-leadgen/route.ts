import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { issueVoucher } from '@/lib/quiz/voucher'
import { pickNextAssignee } from '@/lib/quiz/assign'
import { notifyLeadToSale } from '@/lib/line-notify'
import type { Service } from '@/types'

export const maxDuration = 60

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || ''
const FB_APP_SECRET = process.env.FB_APP_SECRET || ''
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || ''
const GRAPH = 'https://graph.facebook.com/v19.0'

// FB_LEADGEN_FORM_MAP maps Lead Ad form_id → service. Set per ad form so we
// know which voucher to issue. Format: "form_id_1:glp1,form_id_2:std"
function loadFormMap(): Record<string, Service> {
  const raw = process.env.FB_LEADGEN_FORM_MAP || ''
  const out: Record<string, Service> = {}
  for (const pair of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [id, svc] = pair.split(':').map(s => s.trim())
    if (id && svc && ['glp1', 'std', 'ckd', 'foreign', 'mens'].includes(svc)) {
      out[id] = svc as Service
    }
  }
  return out
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!FB_APP_SECRET) return true
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const expected = createHmac('sha256', FB_APP_SECRET).update(rawBody).digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  if (expected.length !== received.length) return false
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}

// Webhook verification (GET) — same flow as fb-webhook. We split into a
// separate URL so leadgen can be enabled/disabled in the FB App Dashboard
// independently from the messaging webhook.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

interface LeadgenChange {
  field?: string
  value?: {
    leadgen_id?: string
    form_id?: string
    page_id?: string
    ad_id?: string
    adset_id?: string
    campaign_id?: string
    created_time?: number
  }
}

interface LeadField {
  name: string
  values: string[]
}

interface LeadgenData {
  id: string
  field_data?: LeadField[]
  form_id?: string
  ad_id?: string
  adset_id?: string
  campaign_id?: string
}

async function fetchLeadgenData(leadgenId: string): Promise<LeadgenData | null> {
  if (!FB_PAGE_ACCESS_TOKEN) {
    console.error('[fb-leadgen] missing FB_PAGE_ACCESS_TOKEN')
    return null
  }
  const url = `${GRAPH}/${leadgenId}?fields=id,field_data,form_id,ad_id,adset_id,campaign_id&access_token=${FB_PAGE_ACCESS_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) {
    console.error('[fb-leadgen] fetch failed:', res.status, await res.text())
    return null
  }
  return (await res.json()) as LeadgenData
}

function pickField(field_data: LeadField[] | undefined, names: string[]): string | null {
  if (!field_data) return null
  for (const want of names) {
    const f = field_data.find(x => x.name?.toLowerCase() === want.toLowerCase())
    if (f && f.values?.[0]) return f.values[0].trim()
  }
  return null
}

function normalizePhone(p: string): string {
  const digits = p.replace(/[^\d]/g, '')
  // FB Lead Ads can deliver in +66… or 0… formats; normalize to local 0XXXXXXXXX
  if (digits.startsWith('66') && digits.length >= 11) return '0' + digits.slice(2)
  return digits
}

async function processLeadgen(change: LeadgenChange) {
  const v = change.value || {}
  const leadgenId = v.leadgen_id
  if (!leadgenId) return

  // Dedup — Meta retries on 5xx and we'd otherwise issue duplicate vouchers.
  const { error: claimErr } = await supabaseAdmin
    .from('processed_webhook_events')
    .insert({ event_id: `fb-leadgen-${leadgenId}`, source: 'fb-leadgen' })
  if (claimErr) {
    if ((claimErr as { code?: string }).code === '23505') return
    console.error('[fb-leadgen] dedup error:', claimErr)
  }

  const data = await fetchLeadgenData(leadgenId)
  if (!data) return

  const formMap = loadFormMap()
  const service = (v.form_id && formMap[v.form_id]) || (data.form_id && formMap[data.form_id]) || 'glp1'

  const rawPhone = pickField(data.field_data, ['phone_number', 'phone'])
  const phone = rawPhone ? normalizePhone(rawPhone) : ''
  const fullName = pickField(data.field_data, ['full_name', 'first_name', 'name']) || 'FB Lead'
  const email = pickField(data.field_data, ['email'])
  const lineId = pickField(data.field_data, ['line_id', 'line'])

  if (!phone || !/^0\d{8,9}$/.test(phone)) {
    console.warn('[fb-leadgen] invalid phone, saving lead without voucher', { leadgenId, rawPhone })
  }

  const assignee = await pickNextAssignee()

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('leads')
    .insert([{
      service,
      first_name: fullName.split(' ')[0],
      last_name:  fullName.split(' ').slice(1).join(' ') || null,
      phone:      phone || `fb-leadgen-${leadgenId}`,
      email:      email || null,
      line_id:    lineId || null,
      assigned_to: assignee,
      assigned_at: assignee ? new Date().toISOString() : null,
      consent_pdpa: true,                     // Lead Ads requires user to tap consent in form
      consent_at:   new Date().toISOString(),
      source:       'facebook-leadgen',
      ad_id:        v.ad_id || data.ad_id || null,
      adset_id:     v.adset_id || data.adset_id || null,
      campaign_id:  v.campaign_id || data.campaign_id || null,
      utm_source:   'facebook',
      utm_medium:   'lead-ad',
      status:       'new',
    }])
    .select()
    .single()

  if (insertErr) {
    console.error('[fb-leadgen] insert error:', insertErr)
    return
  }

  // Only issue a voucher if we have a usable phone — otherwise the customer
  // can't redeem at the hospital and the team would just have a broken row.
  if (phone && /^0\d{8,9}$/.test(phone)) {
    const voucher = await issueVoucher({ leadId: inserted.id, service })
    void notifyLeadToSale({
      name:         fullName,
      phone,
      line_id:      lineId || undefined,
      email:        email || undefined,
      service,
      tier:         'warm',
      score:        0,
      voucher_code: voucher.code,
      voucher_expires_at: voucher.expires_at,
      reasons:      ['FB Lead Ads form'],
    })
  } else {
    void notifyLeadToSale({
      name:         fullName,
      phone:        rawPhone || '-',
      email:        email || undefined,
      service,
      tier:         'warm',
      score:        0,
      voucher_code: '(missing phone)',
      reasons:      ['FB Lead Ads form — phone invalid, manual follow-up needed'],
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)

    if (body.object !== 'page') {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue
        try {
          await processLeadgen(change)
        } catch (err) {
          console.error('[fb-leadgen] process error:', err)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[fb-leadgen] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

