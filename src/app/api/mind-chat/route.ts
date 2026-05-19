import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateSession, runTurn } from '@/lib/mind/intake-agent'

// POST /api/mind-chat
//   { voucher: "RGD-MND-XXXXXX", message: "..." }
//   → { reply, ended, crisis_flag? }
//
// Required scopes:
//   - voucher must exist and belong to a mind-service lead
//   - safety classifier runs BEFORE Sonnet is called
//   - all turns persisted to mind_chat_messages
export async function POST(req: NextRequest) {
  try {
    const { voucher, message } = await req.json() as { voucher?: string; message?: string }

    if (!voucher || !/^RGD-MND-[A-Z0-9]{6}$/.test(voucher)) {
      return NextResponse.json({ error: 'voucher ไม่ถูกต้อง' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'กรุณาพิมพ์ข้อความ' }, { status: 400 })
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'ข้อความยาวเกินไป (จำกัด 2000 ตัวอักษร)' }, { status: 400 })
    }

    const ctx = await getOrCreateSession(voucher)
    if (!ctx) {
      return NextResponse.json(
        { error: 'voucher นี้ไม่พบ หรือไม่ใช่บริการ mind' },
        { status: 404 },
      )
    }

    const { reply, safetyFlag, ended } = await runTurn(ctx, message.trim())
    return NextResponse.json({
      reply,
      ended,
      crisis_flag: safetyFlag === 'safe' ? undefined : safetyFlag,
    })
  } catch (err) {
    console.error('/api/mind-chat error:', err)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 },
    )
  }
}
