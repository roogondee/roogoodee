import { NextRequest, NextResponse } from 'next/server'
import { LOCALE_COOKIE, LOCALE_HEADER, isValidLocale, resolveLocale } from '@/lib/i18n/config'

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Minimal session-cookie gate for /admin/* and /dmglp/staff/* (the W Medical
// GLP-1 program's staff area reuses the admin login; its per-role checks run
// in src/lib/dmglp/roles.ts).
// Full user lookup + role check happens in route handlers / server components
// (Edge middleware can't access the DB client comfortably).
// Formats accepted:
//   1. "<userId>.<hmac>"  — new ACL session
//   2. exact ADMIN_SECRET — legacy bootstrap (still usable before first user exists)
function adminGate(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  const isStaffArea = pathname.startsWith('/dmglp/staff')
  if (!pathname.startsWith('/admin') && !isStaffArea) return null
  if (pathname === '/admin/login') return null

  const loginUrl = new URL('/admin/login', req.url)
  if (isStaffArea) loginUrl.searchParams.set('next', pathname)

  const session = req.cookies.get('admin_session')?.value
  if (!session) {
    return NextResponse.redirect(loginUrl)
  }

  const looksLikeSignedSession = /^[^.]+\.[A-Za-z0-9_-]+$/.test(session)
  const isLegacy = session === process.env.ADMIN_SECRET

  if (!looksLikeSignedSession && !isLegacy) {
    return NextResponse.redirect(loginUrl)
  }

  return null
}

export function middleware(req: NextRequest) {
  const blocked = adminGate(req)
  if (blocked) return blocked

  const { pathname, searchParams } = req.nextUrl

  // ?lang=<code> wins over cookie and browser language — it is how ads and
  // shared links force a language. It is resolved in this same request rather
  // than via a redirect: a redirect would add a full round trip to the first
  // byte of every nationality-targeted ad click, which is the exact cost this
  // work exists to remove. The param is stripped client-side afterwards (see
  // I18nProvider) so a later reload cannot override a language the visitor
  // subsequently picks with the switcher.
  const urlLang = searchParams.get('lang')
  const explicit = isValidLocale(urlLang) ? urlLang : req.cookies.get(LOCALE_COOKIE)?.value

  const locale = resolveLocale({
    pathname,
    explicit,
    acceptLanguage: req.headers.get('accept-language'),
  })

  const headers = new Headers(req.headers)
  headers.set(LOCALE_HEADER, locale)
  const res = NextResponse.next({ request: { headers } })

  // Persist an explicit ?lang= so it survives navigation within the site.
  if (isValidLocale(urlLang)) {
    res.cookies.set(LOCALE_COOKIE, urlLang, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    })
  }

  return res
}

// Everything except API routes, Next internals and static files. Those neither
// render HTML nor need a locale, and keeping them out avoids paying for the
// middleware on every asset request.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
}
