import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AGENT_TOOLS, executeTool, ToolExecutionContext } from '@/lib/agent/tools'
import {
  buildSystemPrompt,
  normalizeServiceContext,
  serviceContextFromPath,
  ServiceContext,
} from '@/lib/agent/prompts'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOOL_ITERATIONS = 6
const MAX_SESSION_TURNS = 40

type ClientMessage = { role: 'user' | 'assistant'; content: string }

interface ChatRequest {
  messages?: ClientMessage[]
  sessionId?: string | null
  // Either an explicit service hint ("std" | "glp1" | "ckd" | "foreign" | "general")
  // or a raw pathname like "/std" that we'll map ourselves.
  service?: string
  path?: string
}

function getConversationSnippet(messages: Anthropic.MessageParam[]): string {
  // Pull the last 3 user texts for the lead note
  const texts: string[] = []
  for (let i = messages.length - 1; i >= 0 && texts.length < 3; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    const content = m.content
    if (typeof content === 'string') {
      texts.unshift(content)
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text') texts.unshift(block.text)
      }
    }
  }
  return texts.join(' | ').slice(0, 300)
}

function extractDisplayText(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest
    const clientMessages = Array.isArray(body.messages) ? body.messages : []
    if (clientMessages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Load or create the session. The client echoes back whatever sessionId we
    // returned last turn; if missing or unknown, we start fresh.
    let sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
    let messages: Anthropic.MessageParam[] = []
    let existingServiceHint: ServiceContext | null = null

    if (sessionId) {
      const { data } = await supabaseAdmin
        .from('chat_sessions')
        .select('messages,turn_count,service_hint')
        .eq('id', sessionId)
        .single()
      if (data && Array.isArray(data.messages)) {
        messages = data.messages as Anthropic.MessageParam[]
        existingServiceHint = normalizeServiceContext(data.service_hint)
        if (data.turn_count >= MAX_SESSION_TURNS) {
          return NextResponse.json(
            { error: 'session_limit', text: 'บทสนทนายาวเกินกำหนด กรุณาเริ่มใหม่ หรือโทรหาทีมงานที่ 02-xxx-xxxx' },
            { status: 200 }
          )
        }
      } else {
        sessionId = null // unknown id → start fresh
      }
    }

    // Service context: explicit > path > existing session hint > general.
    // Once a session has a non-general hint we keep it (user won't bounce between pages mid-chat).
    const explicit = normalizeServiceContext(body.service)
    const fromPath = typeof body.path === 'string' ? serviceContextFromPath(body.path) : 'general'
    const currentService: ServiceContext =
      explicit !== 'general'
        ? explicit
        : fromPath !== 'general'
        ? fromPath
        : existingServiceHint ?? 'general'

    // Append only the latest user turn from the client; we trust server-side history
    // for everything before that so a malicious client can't rewrite past turns.
    const latestUser = clientMessages[clientMessages.length - 1]
    if (!latestUser || latestUser.role !== 'user' || !latestUser.content.trim()) {
      return NextResponse.json({ error: 'latest message must be non-empty user' }, { status: 400 })
    }
    messages.push({ role: 'user', content: latestUser.content.slice(0, 2000) })

    // Agent loop: keep calling the model while it wants tools
    const ctx: ToolExecutionContext = {
      sessionId: sessionId || 'pending',
      conversationSnippet: getConversationSnippet(messages),
    }

    let leadCaptured = false
    let leadId: string | null = null
    let finalText = ''

    const systemPrompt = buildSystemPrompt(currentService)

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: systemPrompt,
        tools: AGENT_TOOLS,
        messages,
      })

      // Record the assistant turn in full (text + tool_use blocks) so the next
      // call has matching IDs for any tool_result blocks we're about to add.
      messages.push({ role: 'assistant', content: response.content })

      if (response.stop_reason !== 'tool_use') {
        finalText = extractDisplayText(response.content)
        break
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
      for (const use of toolUses) {
        const result = await executeTool(use.name, use.input, ctx)
        if (result.leadCreated) {
          leadCaptured = true
          leadId = result.leadCreated.leadId
        }
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: JSON.stringify(result.output),
        })
      }
      messages.push({ role: 'user', content: toolResultBlocks })
    }

    if (!finalText) {
      finalText = 'ขออภัย ระบบประมวลผลไม่สำเร็จ กรุณาลองพิมพ์ใหม่อีกครั้ง'
    }

    // Persist session
    const turnCount = messages.filter(m => m.role === 'user').length
    if (sessionId) {
      const update: Record<string, unknown> = {
        messages,
        turn_count: turnCount,
        service_hint: currentService,
        updated_at: new Date().toISOString(),
      }
      if (leadId) update.lead_id = leadId
      await supabaseAdmin.from('chat_sessions').update(update).eq('id', sessionId)
    } else {
      const { data } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
          messages,
          turn_count: turnCount,
          service_hint: currentService,
          lead_id: leadId,
        })
        .select('id')
        .single()
      sessionId = data?.id ?? null
    }

    return NextResponse.json({
      text: finalText,
      sessionId,
      leadCaptured,
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
