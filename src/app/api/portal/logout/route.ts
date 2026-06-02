import { NextResponse } from 'next/server'
import { patientCookieName } from '@/lib/patient-auth'

export const runtime = 'nodejs'

export async function GET() {
  const res = NextResponse.redirect(new URL('/portal', process.env.SITE_BASE_URL || 'https://roogondee.com'))
  res.cookies.delete(patientCookieName())
  return res
}
