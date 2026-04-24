import { NextRequest, NextResponse } from 'next/server'

// Minimal session-cookie gate for /admin/*.
// Full user lookup + role check happens in route handlers / server components
// (Edge middleware can't access the DB client comfortably).
// Formats accepted:
//   1. "<userId>.<hmac>"  — new ACL session
//   2. exact ADMIN_SECRET — legacy bootstrap (still usable before first user exists)

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin')) return NextResponse.next()
  if (req.nextUrl.pathname === '/admin/login') return NextResponse.next()

  const session = req.cookies.get('admin_session')?.value
  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  const looksLikeSignedSession = /^[^.]+\.[A-Za-z0-9_-]+$/.test(session)
  const isLegacy = session === process.env.ADMIN_SECRET

  if (!looksLikeSignedSession && !isLegacy) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
