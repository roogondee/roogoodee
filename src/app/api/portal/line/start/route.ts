import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { buildAuthorizeUrl, lineLoginConfigured } from '@/lib/line-login'

export const runtime = 'nodejs'

// Kick off LINE Login: set an anti-CSRF state cookie and redirect to LINE.
export async function GET() {
  if (!lineLoginConfigured()) {
    return NextResponse.redirect(new URL('/portal?error=unavailable', process.env.SITE_BASE_URL || 'https://roogondee.com'))
  }
  const state = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(buildAuthorizeUrl(state))
  res.cookies.set('line_login_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })
  return res
}
