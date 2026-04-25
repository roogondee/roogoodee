import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, hashPassword } from '@/lib/auth'

interface RouteParams { params: { id: string } }

// PATCH — toggle disabled, change role, or reset password
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const me = await getSessionUser()
  if (!me || me.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    action?: 'disable' | 'enable' | 'reset_password' | 'set_role'
    password?: string
    role?: 'manager' | 'sale'
  }

  const update: Record<string, unknown> = {}

  if (body.action === 'disable') update.disabled_at = new Date().toISOString()
  else if (body.action === 'enable') update.disabled_at = null
  else if (body.action === 'reset_password') {
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว' }, { status: 400 })
    }
    update.password_hash = await hashPassword(body.password)
  } else if (body.action === 'set_role') {
    if (body.role !== 'manager' && body.role !== 'sale') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (params.id === me.id && body.role !== 'manager') {
      return NextResponse.json({ error: 'ลบสิทธิ์ manager ของตัวเองไม่ได้' }, { status: 400 })
    }
    update.role = body.role
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('admin_users')
    .update(update)
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
