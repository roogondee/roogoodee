import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser, hashPassword } from '@/lib/auth'

export async function GET() {
  const me = await getSessionUser()
  if (!me || me.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, name, role, created_at, disabled_at, last_login_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data || [] })
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me || me.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { email?: string; name?: string; role?: string; password?: string }
  const email = body.email?.trim().toLowerCase() || ''
  const role = body.role === 'manager' ? 'manager' : 'sale'
  const password = body.password || ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email ไม่ถูกต้อง' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว' }, { status: 400 })
  }

  const hash = await hashPassword(password)
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert([{ email, name: body.name?.trim() || null, role, password_hash: hash }])
    .select('id, email, name, role, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email นี้ถูกใช้แล้ว' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user: data })
}
