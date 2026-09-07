import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { anthropic, CHATBOT_MODEL } from '@/lib/chatbot/anthropic'
import { WORKPERMIT_TOOLS, executeWorkPermitTool } from '@/lib/workpermit/tools'
import { WORKPERMIT_SYSTEM_PROMPT } from '@/lib/workpermit/prompt'
import { triage } from '@/lib/advice/triage'
import { checkAdviceRateLimit, clientIpFrom } from '@/lib/advice/rate-limit'
import type { ToolExecutionContext, LeadAttribution } from '@/lib/agent/tools'

// POST /api/workpermit-chat — Work Permit renewal Q&A bot behind the
// /foreign/workpermit Google Ads landing page. See src/lib/workpermit/prompt.ts
// for the FACTS block and hard guardrails this route must not weaken.
//
// Same session/message-trust shape as /api/advice: the client echoes back the
// sessionId we returned, and only the LATEST user turn from the client body is
// trusted — everything before that is loaded from chat_sessions server-side.
//
// Deliberately reuses the /advice safety layer (triage()) even though this bot
// is not medical — the audience is health-adjacent and a self-harm disclosure
// or physical emergency typed into any of our chat boxes must get the same
// deterministic 1669/1323 reply, never an LLM-generated one.

const MAX_TOOL_ITERATIONS = 4
const MAX_TOKENS = 800
const MAX_SESSION_TURNS = 40
const SESSION_LIMIT_REPLY =
  'บทสนทนายาวเกินกำหนด กรุณาเริ่มใหม่ หรือโทร 081-902-3540 / แชท LINE @roogondee'

type ClientMessage = { role: 'user' | 'assistant'; content: string }

interface WorkPermitChatRequest {
  messages?: ClientMessage[]
  sessionId?: string | null
  attribution?: LeadAttribution
}

function extractDisplayText(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
}

function getConversationSnippet(messages: Anthropic.MessageParam[]): string {
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

function cleanAttrValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, 120) : null
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = clientIpFrom(req)
    const rl = checkAdviceRateLimit(clientIp)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'มีคำขอมากเกินไป กรุณาลองใหม่อีกสักครู่ หรือโทร 081-902-3540' },
        { status: 429, headers: rl.retryAfterSec ? { 'Retry-After': String(rl.retryAfterSec) } : undefined }
      )
    }

    const body = (await req.json()) as WorkPermitChatRequest
    const clientMessages = Array.isArray(body.messages) ? body.messages : []
    if (clientMessages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    let sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
    let messages: Anthropic.MessageParam[] = []

    if (sessionId) {
      const { data } = await supabaseAdmin
        .from('chat_sessions')
        .select('messages,turn_count')
        .eq('id', sessionId)
        .single()
      if (data && Array.isArray(data.messages)) {
        messages = data.messages as Anthropic.MessageParam[]
        if (data.turn_count >= MAX_SESSION_TURNS) {
          return NextResponse.json(
            { error: 'session_limit', text: SESSION_LIMIT_REPLY },
            { status: 200 }
          )
        }
      } else {
        sessionId = null
      }
    }

    const latestUser = clientMessages[clientMessages.length - 1]
    if (!latestUser || latestUser.role !== 'user' || !latestUser.content.trim()) {
      return NextResponse.json({ error: 'latest message must be non-empty user' }, { status: 400 })
    }
    const latestUserText = latestUser.content.slice(0, 2000)
    messages.push({ role: 'user', content: latestUserText })

    // ─── Safety layer — runs BEFORE the model, every turn. Never skip this. ───
    const result = triage(latestUserText)

    let finalText: string
    let leadCaptured = false
    let leadId: string | null = null

    if (result.hardcodedReply) {
      // Emergency / crisis: deterministic reply only, model is never called.
      finalText = result.hardcodedReply
      messages.push({ role: 'assistant', content: finalText })
    } else {
      const attribution = {
        utm_source: cleanAttrValue(body.attribution?.utm_source),
        utm_medium: cleanAttrValue(body.attribution?.utm_medium),
        utm_campaign: cleanAttrValue(body.attribution?.utm_campaign),
        gclid: cleanAttrValue(body.attribution?.gclid),
      }

      const ctx: ToolExecutionContext = {
        sessionId: sessionId || 'pending',
        conversationSnippet: getConversationSnippet(messages),
        leadSource: 'workpermit-chat',
        notifyLine: true,
        attribution,
      }

      finalText = ''
      for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const response = await anthropic.messages.create({
          model: CHATBOT_MODEL,
          max_tokens: MAX_TOKENS,
          system: WORKPERMIT_SYSTEM_PROMPT,
          tools: WORKPERMIT_TOOLS,
          messages,
        })

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
          const toolResult = await executeWorkPermitTool(use.name, use.input, ctx)
          if (toolResult.leadCreated) {
            leadCaptured = true
            leadId = toolResult.leadCreated.leadId
          }
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: JSON.stringify(toolResult.output),
          })
        }
        messages.push({ role: 'user', content: toolResultBlocks })
      }

      if (!finalText) {
        finalText = 'ขออภัยค่ะ ระบบประมวลผลไม่สำเร็จ กรุณาลองพิมพ์ใหม่ หรือโทร 081-902-3540 / LINE @roogondee'
      }
    }

    const turnCount = messages.filter(m => m.role === 'user').length
    if (sessionId) {
      const update: Record<string, unknown> = {
        messages,
        turn_count: turnCount,
        service_hint: 'workpermit',
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
          service_hint: 'workpermit',
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
      triage: result.level,
    })
  } catch (err) {
    console.error('Work permit chat error:', err)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่ หรือโทร 081-902-3540 / LINE @roogondee' },
      { status: 500 }
    )
  }
}
