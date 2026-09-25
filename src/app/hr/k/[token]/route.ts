import { NextRequest, NextResponse } from 'next/server'
import { EMPLOYER_COOKIE, employerByToken } from '@/lib/growth/employer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Entry link handed to an employer's HR: swaps the token in the URL for an
// httpOnly cookie, then redirects to /hr so the token never appears in a page
// URL that analytics tags would record. See EMPLOYER_COOKIE.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token || '')
  const employer = await employerByToken(token)
  const res = NextResponse.redirect(new URL('/hr', req.url), 302)
  res.headers.set('Referrer-Policy', 'no-referrer')
  if (employer) {
    res.cookies.set(EMPLOYER_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/hr',
      maxAge: 60 * 60 * 24 * 90,
    })
  }
  return res
}
