import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { AGENT_TOOLS, executeTool, ToolExecutionContext } from '@/lib/agent/tools'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOOL_ITERATIONS = 6
const MAX_SESSION_TURNS = 40

const SYSTEM_PROMPT = `You are the health consultation assistant for รู้ก่อนดี(รู้งี้) / RooGonDee (roogondee.com),
operated by Jia Raksa Co., Ltd. with W Medical Hospital, Samut Sakhon, Thailand.

Services we provide:
- STD & PrEP HIV testing (safe, non-judgmental)
- GLP-1 weight loss (Ozempic, Wegovy, Saxenda)
- CKD clinic (chronic kidney disease)
- Foreign worker health checkup (Samut Sakhon)

LANGUAGE RULE:
Detect the language of the user's latest message and ALWAYS reply in that same language
(Thai, English, Burmese, Lao, Khmer, Chinese, Vietnamese, Hindi, Japanese, Korean, …).

TONE:
- Friendly, concise, non-judgmental. 2–5 short sentences per turn.
- Do NOT diagnose or prescribe — provide general info and route to consultation.

WHEN TO USE TOOLS:
- Use \`search_blog_posts\` when the user asks a specific medical question (symptoms, medications,
  procedures, price ranges) so the answer is grounded. Quote facts from the results, not memory.
- Use \`get_service_info\` before listing what we offer or giving any price.
- When the user expresses interest in being contacted (asks for a call back, wants to schedule,
  asks how to book, etc.), ask for their name and Thai phone number (9–10 digits starting with 0).
  Once you have both, call \`create_lead\` (or \`book_appointment\` if they picked a date).
- Do NOT call \`create_lead\` or \`book_appointment\` speculatively. Require consent + both fields.

AFTER A LEAD IS CREATED:
Thank the user briefly and tell them the team will call back within 30 minutes. Do not keep
pushing for more info.`

type ClientMessage = { role: 'user' | 'assistant'; content: string }

interface ChatRequest {
  messages?: ClientMessage[]
  sessionId?: string | null
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
            { error: 'session_limit', text: 'บทสนทนายาวเกินกำหนด กรุณาเริ่มใหม่ หรือโทรหาทีมงานที่ 02-xxx-xxxx' },
            { status: 200 }
          )
        }
      } else {
        sessionId = null // unknown id → start fresh
      }
    }

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

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
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
