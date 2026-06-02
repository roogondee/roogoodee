// LINE Login (OAuth 2.1 / OIDC) — SEPARATE channel from the Messaging API.
// Requires a "LINE Login" channel in the LINE Developers console with these
// env vars; if absent the portal shows a "not available yet" notice.
//   LINE_LOGIN_CHANNEL_ID
//   LINE_LOGIN_CHANNEL_SECRET
// Callback URL to register: {SITE_BASE_URL}/api/portal/line/callback

const AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const PROFILE_URL = 'https://api.line.me/v2/profile'

export function lineLoginConfigured(): boolean {
  return !!(process.env.LINE_LOGIN_CHANNEL_ID && process.env.LINE_LOGIN_CHANNEL_SECRET)
}

function baseUrl(): string {
  return (process.env.SITE_BASE_URL || 'https://roogondee.com').replace(/\/$/, '')
}

export function redirectUri(): string {
  return `${baseUrl()}/api/portal/line/callback`
}

// Build the authorize URL. `state` is an anti-CSRF token we also store in a cookie.
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINE_LOGIN_CHANNEL_ID || '',
    redirect_uri: redirectUri(),
    state,
    scope: 'profile openid',
  })
  return `${AUTH_URL}?${params.toString()}`
}

export interface LineProfile {
  userId: string
  displayName?: string
}

// Exchange the auth code for a token, then fetch the LINE profile (userId).
export async function exchangeCodeForProfile(code: string): Promise<LineProfile | null> {
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(),
        client_id: process.env.LINE_LOGIN_CHANNEL_ID || '',
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET || '',
      }),
    })
    const token = await tokenRes.json()
    if (!tokenRes.ok || !token.access_token) {
      console.error('LINE token exchange failed:', token)
      return null
    }

    const profRes = await fetch(PROFILE_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    const prof = await profRes.json()
    if (!profRes.ok || !prof.userId) {
      console.error('LINE profile fetch failed:', prof)
      return null
    }
    return { userId: prof.userId, displayName: prof.displayName }
  } catch (e) {
    console.error('LINE login exchange error:', (e as Error).message)
    return null
  }
}
