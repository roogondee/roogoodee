import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { service, first_name, last_name, phone, age, gender, note } = body

    if (!first_name || !phone) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทร' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([{ service, first_name, last_name, phone, age, gender, note, source: 'roogondee.com' }])
      .select()

    if (error) throw error

    // Send email notification (non-blocking)
    sendLeadNotification({
      name: `${first_name} ${last_name || ''}`.trim(),
      phone,
      service: service || 'general',
      source: 'contact-form',
      note,
    })

    return NextResponse.json({ success: true, id: data[0].id })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 })
  }
}
