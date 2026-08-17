import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { anthropic, CHATBOT_MODEL } from '@/lib/chatbot/anthropic'
import { CONTENT_MODEL as SONNET_MODEL } from '@/lib/anthropic/content-gen'
import { ADVICE_TOOLS, INTAKE_TOOLS, executeAdviceTool } from '@/lib/advice/tools'
import { buildIntakePrompt, buildAssessmentPrompt, buildFollowupPrompt, type AdvicePhase } from '@/lib/advice/prompt'
import { triage, escalate, type TriageLevel } from '@/lib/advice/triage'
import { checkAdviceRateLimit, clientIpFrom } from '@/lib/advice/rate-limit'
import type { ToolExecutionContext, LeadAttribution } from '@/lib/agent/tools'

// POST /api/advice — general-illness advice AI behind the /advice Google Ads
// landing page. See docs/advice-google-ads.md for the ad-side setup and
// CLAUDE.md "Advice AI" for the safety contract this route must not weaken.
//
// Same session/message-trust shape as /api/chat: the client echoes back the
// sessionId we returned, and only the LATEST user turn from the client body is
// trusted — everything before that is loaded from chat_sessions server-side so
// a tampered client can't rewrite history.
//
// Two-model handoff (see src/lib/advice/prompt.ts for the full rationale):
// this turn starts on Haiku doing history-taking (phase='intake'). The moment
// the model calls submit_intake, the tool loop below switches model+prompt to
// Sonnet for one detailed assessment reply, then persists phase='assessment_done'
// so later turns in this session skip straight to the lighter follow-up prompt.

const MAX_TOOL_ITERATIONS = 8
const HAIKU_MAX_TOKENS = 800
const SONNET_MAX_TOKENS = 1500
const MAX_SESSION_TURNS = 40
const SESSION_LIMIT_REPLY =
  'บทสนทนายาวเกินกำหนด กรุณาเริ่มใหม่ หรือแชทกับทีมงานทาง LINE @roogondee'

type ClientMessage = { role: 'user' | 'assistant'; content: string }

interface AdviceRequest {
  messages?: ClientMessage[]
  sessionId?: string | null
  path?: string
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
        { error: 'มีคำขอมากเกินไป กรุณาลองใหม่อีกสักครู่ หรือแชทกับทีมงานทาง LINE @roogondee' },
        { status: 429, headers: rl.retryAfterSec ? { 'Retry-After': String(rl.retryAfterSec) } : undefined }
      )
    }

    const body = (await req.json()) as AdviceRequest
    const clientMessages = Array.isArray(body.messages) ? body.messages : []
    if (clientMessages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    let sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
    let messages: Anthropic.MessageParam[] = []
    let priorTriageLevel: TriageLevel | null = null
    let phase: AdvicePhase = 'intake'

    if (sessionId) {
      const { data } = await supabaseAdmin
        .from('chat_sessions')
        .select('messages,turn_count,triage_level,advice_phase')
        .eq('id', sessionId)
        .single()
      if (data && Array.isArray(data.messages)) {
        messages = data.messages as Anthropic.MessageParam[]
        priorTriageLevel = (data.triage_level as TriageLevel | null) ?? null
        phase = (data.advice_phase as AdvicePhase | null) ?? 'intake'
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
    const triageLevel = escalate(priorTriageLevel, result.level)

    let finalText: string
    let leadCaptured = false
    let leadId: string | null = null
    let suggestedService: string | null = null

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
        leadSource: 'advice-chat',
        notifyLine: true,
        attribution,
      }

      // Mutable so the loop can hand off from Haiku/intake to Sonnet/assessment
      // the moment submit_intake fires, without a second HTTP round-trip.
      let currentModel: string = CHATBOT_MODEL
      let currentMaxTokens = HAIKU_MAX_TOKENS
      let currentTools = phase === 'intake' ? INTAKE_TOOLS : ADVICE_TOOLS
      let currentSystemPrompt =
        phase === 'intake' ? buildIntakePrompt(triageLevel) : buildFollowupPrompt(triageLevel)
      finalText = ''

      for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const response = await anthropic.messages.create({
          model: currentModel,
          max_tokens: currentMaxTokens,
          system: currentSystemPrompt,
          tools: currentTools,
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
          const toolResult = await executeAdviceTool(use.name, use.input, ctx)
          if (toolResult.leadCreated) {
            leadCaptured = true
            leadId = toolResult.leadCreated.leadId
          }
          if (toolResult.serviceSuggested) {
            suggestedService = toolResult.serviceSuggested
          }
          if (toolResult.intakeSubmitted) {
            // Hand off: next iteration answers with Sonnet's detailed
            // assessment prompt, no submit_intake in its tool set (nothing
            // left to hand off to once this fires).
            phase = 'assessment_done'
            currentModel = SONNET_MODEL
            currentMaxTokens = SONNET_MAX_TOKENS
            currentTools = ADVICE_TOOLS
            currentSystemPrompt = buildAssessmentPrompt(triageLevel)
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
        finalText = 'ขออภัยค่ะ ระบบประมวลผลไม่สำเร็จ กรุณาลองพิมพ์ใหม่อีกครั้ง หรือแชททีมงานทาง LINE @roogondee'
      }
    }

    const turnCount = messages.filter(m => m.role === 'user').length
    if (sessionId) {
      const update: Record<string, unknown> = {
        messages,
        turn_count: turnCount,
        service_hint: 'advice',
        triage_level: triageLevel,
        advice_phase: phase,
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
          service_hint: 'advice',
          triage_level: triageLevel,
          advice_phase: phase,
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
      triage: triageLevel,
      suggestedService,
    })
  } catch (err) {
    console.error('Advice chat error:', err)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่ หรือแชทกับทีมงานทาง LINE @roogondee' },
      { status: 500 }
    )
  }
}
