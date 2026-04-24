// Google reCAPTCHA v3 helpers.
// Fails open (returns true) when RECAPTCHA_SECRET_KEY is not configured,
// so local/dev environments keep working without signup.

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
const MIN_SCORE = 0.5

export interface VerifyResult {
  success: boolean
  score?: number
  action?: string
  reason?: string
}

export async function verifyRecaptcha(token: string | undefined, expectedAction?: string): Promise<VerifyResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) return { success: true, reason: 'recaptcha_not_configured' }
  if (!token) return { success: false, reason: 'missing_token' }

  try {
    const body = new URLSearchParams({ secret, response: token })
    const res = await fetch(VERIFY_URL, { method: 'POST', body })
    const data = await res.json() as {
      success: boolean
      score?: number
      action?: string
      'error-codes'?: string[]
    }

    if (!data.success) {
      return { success: false, reason: (data['error-codes'] || []).join(',') || 'verify_failed' }
    }
    if (expectedAction && data.action && data.action !== expectedAction) {
      return { success: false, score: data.score, action: data.action, reason: 'action_mismatch' }
    }
    if (typeof data.score === 'number' && data.score < MIN_SCORE) {
      return { success: false, score: data.score, action: data.action, reason: 'low_score' }
    }
    return { success: true, score: data.score, action: data.action }
  } catch (err) {
    console.error('recaptcha verify error:', err)
    return { success: false, reason: 'network_error' }
  }
}
