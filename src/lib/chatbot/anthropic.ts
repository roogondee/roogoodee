import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const CHATBOT_MODEL = 'claude-haiku-5-5'

// Haiku 5.5 thinks by default (adaptive, effort `medium`). Chat replies are
// short and latency-bound, so every chat route runs at `low`. Thinking tokens
// count against max_tokens and Thai costs more tokens than on Haiku 4.5, which
// is why the caps on these routes are larger than the reply length implies.
export const CHAT_OUTPUT_CONFIG = { effort: 'low' } as const

// A response can now begin with thinking blocks — never read content[0].
export function responseText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}
