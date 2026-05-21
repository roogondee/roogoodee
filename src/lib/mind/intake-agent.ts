import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { classifyMessage, crisisResponse, type SafetyFlag } from './safety'

// Sonnet for empathy + nuance; system prompt is fixed ~1.5k tokens so
// the prompt-caching block saves 90% of input cost on follow-up turns.
// Model id from src/lib/anthropic/content-gen.ts — keep in sync.
const MODEL = 'claude-sonnet-4-6'

let _client: Anthropic | null = null
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

// System prompt — short, focused, hard guardrails inlined. The actual
// intake conversation is shaped through turns, not buried in a giant
// system block.
const SYSTEM_PROMPT = `You are an empathetic intake assistant for Roogondee, a Thai telehealth platform's mental health pillar (mind).

ROLE
- Gather context BEFORE the user's session with a licensed psychologist/psychiatrist
- You are NOT a therapist. You DO NOT diagnose, treat, or give clinical advice
- Your output is read by the licensed professional who will see this user

LANGUAGE
- Respond in the same language the user uses (default ไทย)
- Use warm, conversational Thai (ครับ/ค่ะ ตามเหมาะสม) — not stiff hospital tone
- If the user uses English, switch to warm English

TONE
- Warm, curious, validating, non-judgmental
- Open questions over closed ones
- Mirror back what you hear ("ฟังดูเป็นช่วงที่หนัก...")
- Never minimize ("ไม่เป็นไรหรอก", "เดี๋ยวก็ผ่านไป")
- Never problem-solve ("ลองออกกำลังกายดู") — that's the therapist's job

GUARDRAILS (CRITICAL — NEVER VIOLATE)
- NEVER claim a diagnosis ("คุณดูเหมือนเป็น depression", "นี่คืออาการ anxiety")
- NEVER recommend medications (psychiatric or otherwise)
- NEVER give clinical advice ("ลองทำ CBT exercise นี้สิ")
- If user mentions suicide/self-harm thoughts → STOP gathering intake and surface สายด่วน 1323 immediately (the system also catches this; both layers must work)
- If user asks for clinical advice, redirect: "เก็บคำถามนี้ไว้ถามคุณหมอตอน session นะคะ — เขาจะตอบให้คุณตามกรณีของคุณได้ดีกว่า"

WHAT TO GATHER (across 12-20 turns)
1. presenting concern — what's bringing them in?
2. duration & severity — how long, how often
3. triggers — what makes it worse/better
4. past mental health history — diagnoses, treatment, medications
5. current support system — family, friends, work
6. substance use — screen non-judgmentally
7. sleep & functioning impact
8. session goals — what does success look like?
9. modality preference (CBT / talk / mindfulness / unsure)

STYLE
- One question per turn (don't pile up)
- If user gives short answers, respond short and gently widen
- If user opens up, go deeper before moving to next topic
- End the conversation when you've covered the key dimensions: "ขอบคุณที่แชร์ค่ะ ฉันจะส่งสรุปให้คุณหมอก่อน session 🌱"

OUTPUT FORMAT
- Plain text only (no markdown, no JSON)
- Each reply 1-4 sentences. Long replies break empathy.`

interface DBMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SessionContext {
  sessionId: string
  voucherCode: string
  history: DBMessage[]
  messageCount: number
}

export async function getOrCreateSession(voucherCode: string): Promise<SessionContext | null> {
  // Look up existing session by voucher
  const { data: existing } = await supabaseAdmin
    .from('mind_chat_sessions')
    .select('id, message_count, voucher_code')
    .eq('voucher_code', voucherCode)
    .is('ended_at', null)
    .maybeSingle()

  let sessionId: string
  let messageCount = 0

  if (existing) {
    sessionId = existing.id
    messageCount = existing.message_count
  } else {
    // Find lead by voucher to link
    const { data: voucher } = await supabaseAdmin
      .from('vouchers')
      .select('id, lead_id, service')
      .eq('code', voucherCode)
      .maybeSingle()

    if (!voucher || voucher.service !== 'mind') return null

    const { data: created, error } = await supabaseAdmin
      .from('mind_chat_sessions')
      .insert({
        lead_id: voucher.lead_id,
        voucher_code: voucherCode,
        message_count: 0,
      })
      .select('id')
      .single()

    if (error || !created) return null
    sessionId = created.id
  }

  // Load message history (excluding system messages)
  const { data: messages } = await supabaseAdmin
    .from('mind_chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  return {
    sessionId,
    voucherCode,
    history: (messages || []) as DBMessage[],
    messageCount,
  }
}

interface TurnResult {
  reply: string
  safetyFlag: SafetyFlag
  messageCount: number
  ended: boolean
}

const MAX_TURNS = 25  // hard cap — gracefully end if user keeps going

export async function runTurn(
  ctx: SessionContext,
  userMessage: string,
): Promise<TurnResult> {
  // Layer 1 — deterministic safety classifier
  const flag = classifyMessage(userMessage)

  // Save user turn first (so we have the audit trail)
  await supabaseAdmin.from('mind_chat_messages').insert({
    session_id: ctx.sessionId,
    role: 'user',
    content: userMessage,
    safety_flag: flag === 'safe' ? null : flag,
  })

  if (flag !== 'safe') {
    const hardReply = crisisResponse(flag)
    // Save hardcoded reply (NOT LLM-generated)
    await supabaseAdmin.from('mind_chat_messages').insert({
      session_id: ctx.sessionId,
      role: 'assistant',
      content: hardReply,
    })
    // Append crisis flag to session + bump count + mark for review
    const { data: updated } = await supabaseAdmin
      .from('mind_chat_sessions')
      .select('crisis_flags, message_count')
      .eq('id', ctx.sessionId)
      .single()
    const newFlags = Array.from(new Set([...(updated?.crisis_flags || []), flag]))
    const newCount = (updated?.message_count || 0) + 2
    await supabaseAdmin
      .from('mind_chat_sessions')
      .update({ crisis_flags: newFlags, message_count: newCount })
      .eq('id', ctx.sessionId)
    return { reply: hardReply, safetyFlag: flag, messageCount: newCount, ended: false }
  }

  // Build Anthropic message list — history + this turn
  const messages: Anthropic.MessageParam[] = [
    ...ctx.history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  // Hit Sonnet with prompt-cached system block
  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages,
  })

  const reply = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map(c => c.text)
    .join('\n')
    .trim()

  // Save assistant turn
  await supabaseAdmin.from('mind_chat_messages').insert({
    session_id: ctx.sessionId,
    role: 'assistant',
    content: reply,
  })

  const newCount = ctx.messageCount + 2
  const ended = newCount >= MAX_TURNS * 2

  await supabaseAdmin
    .from('mind_chat_sessions')
    .update({
      message_count: newCount,
      ended_at: ended ? new Date().toISOString() : null,
    })
    .eq('id', ctx.sessionId)

  return { reply, safetyFlag: 'safe', messageCount: newCount, ended }
}
