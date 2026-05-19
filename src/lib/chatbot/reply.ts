import { anthropic, CHATBOT_MODEL } from './anthropic'
import { CHATBOT_SYSTEM_PROMPT } from './system-prompt'

// LINE replyToken expires after 1 minute; cap AI latency well under that
// so a slow/hung upstream still leaves room for a canned fallback reply.
const AI_TIMEOUT_MS = 12_000

const FALLBACK_REPLY = [
  'ขอบคุณที่ทักมา รู้ก่อนดี(รู้งี้) 💚',
  '',
  'ตอนนี้ระบบ AI ตอบช้ากว่าปกติ',
  'ลองทำแบบประเมินสุขภาพฟรี (2 นาที) ที่',
  'https://roogondee.com/quiz',
  '',
  'รับ voucher ตรวจฟรีมูลค่า 500฿ ทันที',
].join('\n')

export async function generateReply(userText: string): Promise<string> {
  try {
    const aiPromise = anthropic.messages.create({
      model: CHATBOT_MODEL,
      max_tokens: 512,
      system: CHATBOT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userText }],
    })
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI timeout')), AI_TIMEOUT_MS),
    )
    const msg = await Promise.race([aiPromise, timeoutPromise])
    const block = msg.content[0]
    const text = block?.type === 'text' ? block.text : ''
    return text || FALLBACK_REPLY
  } catch (err) {
    console.error('generateReply failed:', err)
    return FALLBACK_REPLY
  }
}
