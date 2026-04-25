import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, makeSessionValue } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; password?: string }

  // ── Legacy bootstrap: allow ADMIN_SECRET-only login ONLY while no admin_users exist
  const { count } = await supabaseAdmin
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .is('disabled_at', null)
  const legacyMode = (count ?? 0) === 0

  if (legacyMode) {
    const supplied = body.password || ''
    if (!process.env.ADMIN_SECRET || supplied !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true, legacy: true })
    res.cookies.set('admin_session', process.env.ADMIN_SECRET, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  }

  // ── Normal email + password login
  const email = body.email?.trim().toLowerCase() || ''
  const password = body.password || ''
  if (!email || !password) {
    return NextResponse.json({ error: 'กรุณากรอก email และรหัสผ่าน' }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('id, password_hash, disabled_at')
    .eq('email', email)
    .maybeSingle()

  if (!user || user.disabled_at) {
    return NextResponse.json({ error: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' }, { status: 401 })
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' }, { status: 401 })

  await supabaseAdmin
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', makeSessionValue(user.id), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
