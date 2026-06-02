import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { exchangeCodeForProfile } from '@/lib/line-login'
import { makePatientSession, patientCookieName } from '@/lib/patient-auth'

export const runtime = 'nodejs'

const BASE = process.env.SITE_BASE_URL || 'https://roogondee.com'

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, BASE))
}

// LINE redirects here with ?code & ?state. Verify state, resolve the LINE
// profile, then either log the patient in (already linked) or send them to
// the claim step (first time).
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = req.cookies.get('line_login_state')?.value

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirect('/portal?error=state')
  }

  const profile = await exchangeCodeForProfile(code)
  if (!profile) return redirect('/portal?error=line')

  // Already linked? Log straight in.
  const { data: linked } = await supabaseAdmin
    .from('patients')
    .select('id, line_id')
    .eq('line_id', profile.userId)
    .maybeSingle()

  if (linked) {
    const res = redirect('/portal/results')
    res.cookies.set(patientCookieName(), makePatientSession(linked.id, profile.userId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    res.cookies.delete('line_login_state')
    return res
  }

  // Not linked yet — stash the verified LINE id in a short-lived cookie and
  // send them to enter the staff-issued claim code.
  const res = redirect('/portal/claim')
  res.cookies.set('line_pending', profile.userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 900,
    path: '/',
  })
  res.cookies.delete('line_login_state')
  return res
}
