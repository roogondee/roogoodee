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
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { service, first_name, last_name, phone, age, gender, note } = body

    if (!first_name || !phone) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทร' }, { status: 400 })
    }

    const rawSource = typeof body.source === 'string' ? body.source : ''
    const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'roogondee.com'

    // LINE userId from LIFF — keep only U[0-9a-f]{32} format to avoid storing
    // junk if a different client sends something unexpected.
    const rawLineId = typeof body.line_id === 'string' ? body.line_id : ''
    const line_id = /^U[0-9a-f]{32}$/.test(rawLineId) ? rawLineId : null

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([{ service, first_name, last_name, phone, age, gender, note, source, line_id }])
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

    // Send LINE group notification (non-blocking)
    void notifyLineGroup({
      name: `${first_name} ${last_name || ''}`.trim(),
      phone,
      service: service || 'general',
      source,
      note,
    })

    return NextResponse.json({ success: true, id: data[0].id })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 })
  }
}
