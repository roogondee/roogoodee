import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  results.hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  results.hasLineToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN
  results.lineTokenPrefix = process.env.LINE_CHANNEL_ACCESS_TOKEN?.slice(0, 10) + '...'

  // Test Anthropic Claude Haiku
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'hello' }],
    })
    results.claudeOk = true
    results.claudeReply = (msg.content[0] as { type: string; text: string }).text
  } catch (e: unknown) {
    results.claudeOk = false
    results.claudeError = (e as Error).message
  }

  // Test LINE token validity
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    })
    const data = await res.json()
    results.lineTokenOk = res.ok
    results.lineInfo = data
  } catch (e: unknown) {
    results.lineTokenOk = false
    results.lineError = (e as Error).message
  }

  return NextResponse.json(results)
}
