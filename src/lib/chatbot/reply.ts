import { anthropic, CHATBOT_MODEL } from './anthropic'
import { CHATBOT_SYSTEM_PROMPT } from './system-prompt'

export async function generateReply(userText: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: CHATBOT_MODEL,
    max_tokens: 512,
    system: CHATBOT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userText }],
  })
  const block = msg.content[0]
  return block?.type === 'text' ? block.text : ''
}
