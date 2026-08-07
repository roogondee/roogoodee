// Server-side verification of a LIFF id_token.
//
// The client can trivially forge a userId, so /api/quiz/claim-line never
// trusts profile data sent from the browser — it verifies the id_token
// against LINE's endpoint and uses the `sub` (userId) from the response.
// Requires LINE_LOGIN_CHANNEL_ID (the LINE Login channel that owns the LIFF
// app — NOT the Messaging API channel). Returns null on any failure so
// callers can degrade to the anonymous session-claim flow.

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || ''

export interface VerifiedLiffUser {
  userId: string
  displayName: string | null
}

export async function verifyLiffIdToken(idToken: string): Promise<VerifiedLiffUser | null> {
  if (!LINE_LOGIN_CHANNEL_ID) {
    console.warn('liff-verify skipped: LINE_LOGIN_CHANNEL_ID not set')
    return null
  }
  if (!idToken) return null

  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: LINE_LOGIN_CHANNEL_ID }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`liff-verify rejected: ${res.status} — ${body.slice(0, 200)}`)
      return null
    }
    const data = (await res.json()) as { sub?: string; name?: string }
    if (!data.sub || !/^U[0-9a-f]{32}$/.test(data.sub)) return null
    return { userId: data.sub, displayName: data.name || null }
  } catch (err) {
    console.error('liff-verify error:', err)
    return null
  }
}
