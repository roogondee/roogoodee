import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification } from '@/lib/email'
import { notifyLineGroup } from '@/lib/line-notify'
import { NextRequest, NextResponse } from 'next/server'

// Allowed values for the user-supplied source tag. Anything else falls back
// to the website default. We keep the list closed so this public endpoint
// can't be used to inject arbitrary text into our analytics.
const ALLOWED_SOURCES = new Set([
  'roogondee.com',
  'contact-form',
  'line-broadcast',
  'fb-broadcast',
  'campaign',
  'mou-landing',
  'mou-chat',
  'workpermit-landing',
  'workpermit-chat',
  'health-program-landing',
])

// Headcount bands offered by WorkPermitLeadForm. Closed set for the same
// reason as ALLOWED_SOURCES: this endpoint is public, and the column is meant
// to be groupable in reporting, not free text.
const WORKER_COUNTS = new Set(['1-5', '6-20', '21-50', '50+'])

// UTM values come straight from the URL — keep only short plain strings.
function cleanUtm(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.slice(0, 120) : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { service, first_name, last_name, phone, age, gender } = body
    const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : body.note

    if (!first_name || !phone) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทร' }, { status: 400 })
    }

    // Honeypot — real forms render this field hidden and leave it empty.
    // Fake-accept so bots don't learn they were filtered.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ success: true, id: null })
    }

    const rawSource = typeof body.source === 'string' ? body.source : ''
    const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'roogondee.com'

    // LINE userId from LIFF — keep only U[0-9a-f]{32} format to avoid storing
    // junk if a different client sends something unexpected.
    const rawLineId = typeof body.line_id === 'string' ? body.line_id : ''
    const line_id = /^U[0-9a-f]{32}$/.test(rawLineId) ? rawLineId : null

    // Headcount and company used to survive only as Thai text inside `note`
    // ("จำนวนแรงงาน: 21-50"), so nobody could sort the pipeline by deal size or
    // ask how many 50+ enquiries a campaign produced without parsing prose.
    const rawWorkerCount = typeof body.worker_count === 'string' ? body.worker_count : ''
    const worker_count = WORKER_COUNTS.has(rawWorkerCount) ? rawWorkerCount : null
    const company = typeof body.company === 'string' && body.company.trim() !== ''
      ? body.company.trim().slice(0, 200)
      : null

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([{
        service, first_name, last_name, phone, age, gender, note, source, line_id,
        company, worker_count,
        consent_pdpa: body.consent_pdpa === true,
        consent_at: typeof body.consent_at === 'string' ? body.consent_at : null,
        utm_source: cleanUtm(body.utm_source),
        utm_medium: cleanUtm(body.utm_medium),
        utm_campaign: cleanUtm(body.utm_campaign),
        gclid: cleanUtm(body.gclid),
      }])
      .select()

    if (error) throw error

    // Send email notification (non-blocking)
    sendLeadNotification({
      name: `${first_name} ${last_name || ''}`.trim(),
      phone,
      service: service || 'general',
      source,
      note,
    })

    // Await so the LINE push completes before the lambda freezes on Vercel.
    try {
      await notifyLineGroup({
        name: `${first_name} ${last_name || ''}`.trim(),
        phone,
        service: service || 'general',
        source,
        note,
      })
    } catch (err) {
      console.error('notifyLineGroup failed:', err)
    }

    return NextResponse.json({ success: true, id: data[0].id })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 })
  }
}
