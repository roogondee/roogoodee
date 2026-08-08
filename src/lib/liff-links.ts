import type { Service } from '@/types'

// Canonical entry point into the LINE funnel.
//
// Since the web quiz was retired (see QuizGate), every "start the quiz" CTA
// has to route through LINE: the LIFF app's bot-link is set to Aggressive,
// so opening one of these links prompts a non-follower to add @roogondee
// before the quiz renders. That is what enforces "add LINE first, then quiz"
// — it is LINE's own gate, not something the site can be talked out of.

const LIFF_QUIZ_ID =
  process.env.NEXT_PUBLIC_LIFF_QUIZ_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''

// Plain add-friend link — used when no LIFF app is configured yet, so the
// CTA still lands somewhere useful instead of a dead liff.line.me/ URL.
export const LINE_OA_URL = 'https://line.me/ti/p/@roogondee'

export interface LiffQuizLinkOptions {
  service?: Service | null
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export function liffQuizUrl(opts: LiffQuizLinkOptions = {}): string {
  if (!LIFF_QUIZ_ID) return LINE_OA_URL

  const params = new URLSearchParams()
  if (opts.service) params.set('service', opts.service)
  params.set('utm_source', opts.utm_source || 'web')
  params.set('utm_medium', opts.utm_medium || 'quiz_gate')
  if (opts.utm_campaign) params.set('utm_campaign', opts.utm_campaign)

  return `https://liff.line.me/${LIFF_QUIZ_ID}?${params.toString()}`
}

export function hasLiffQuiz(): boolean {
  return !!LIFF_QUIZ_ID
}
