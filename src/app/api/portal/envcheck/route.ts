import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// TEMPORARY diagnostic: reports WHICH portal-related env vars are visible to
// the running deployment, as booleans only — never the values. Remove after
// confirming LINE Login env wiring.
export async function GET() {
  const present = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 0)
  return NextResponse.json({
    LINE_LOGIN_CHANNEL_ID: present('LINE_LOGIN_CHANNEL_ID'),
    LINE_LOGIN_CHANNEL_SECRET: present('LINE_LOGIN_CHANNEL_SECRET'),
    SITE_BASE_URL: present('SITE_BASE_URL'),
    LINE_CHANNEL_ACCESS_TOKEN: present('LINE_CHANNEL_ACCESS_TOKEN'),
    matchingKeys: Object.keys(process.env).filter((k) => k.includes('LOGIN')).sort(),
  })
}
