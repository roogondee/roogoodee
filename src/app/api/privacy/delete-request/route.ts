import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { notifyLineGroup } from '@/lib/line-notify'
import { requestIp } from '@/lib/audit'

function normalizePhone(p: string): string {
  return p.replace(/[-\s]/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      phone?: string
      email?: string
      reason?: string
      recaptcha_token?: string
    }

    const phone = body.phone ? normalizePhone(body.phone) : ''
    if (!/^0\d{8,9}$/.test(phone)) {
      return NextResponse.json({ error: 'เบอร์โทรไม่ถูกต้อง' }, { status: 400 })
    }

    const captcha = await verifyRecaptcha(body.recaptcha_token, 'privacy_delete')
    if (!captcha.success) {
      return NextResponse.json({ error: 'ตรวจพบการใช้งานผิดปกติ ลองใหม่อีกครั้ง' }, { status: 400 })
    }

    const ip = requestIp(req)
    const { error } = await supabaseAdmin
      .from('data_deletion_requests')
      .insert([{
        phone,
        email:        body.email?.trim() || null,
        reason:       body.reason?.trim()?.slice(0, 500) || null,
        requester_ip: ip || null,
      }])
    if (error) throw error

    void notifyLineGroup({
      name:    body.email || phone,
      phone,
      service: 'general',
      source:  'คำขอลบข้อมูล (PDPA)',
      note:    body.reason?.slice(0, 100),
    })

    return NextResponse.json({
      ok: true,
      message: 'รับคำขอแล้ว ทีมงานจะดำเนินการลบข้อมูลภายใน 30 วัน และแจ้งกลับทางช่องทางที่คุณให้ไว้',
    })
  } catch (err) {
    console.error('delete-request error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' },
      { status: 500 },
    )
  }
}
