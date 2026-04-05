import { NextResponse } from 'next/server'

export async function GET() {
  const res = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_SITE_URL || 'https://roogondee.com'))
  res.cookies.delete('admin_session')
  return res
}
