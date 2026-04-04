import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { service, first_name, last_name, phone, age, gender, note } = body

    if (!first_name || !phone) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทร' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([{ service, first_name, last_name, phone, age, gender, note, source: 'roogondee.com' }])
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, id: data[0].id })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 })
  }
}
