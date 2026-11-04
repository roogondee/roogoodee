// Tap-to-answer options for the /advice chat.
//
// Visitors on /advice are on a phone, feeling unwell, and arrived from an ad.
// Typing an answer is where they gave up: of the few who typed a first
// message, none typed a second. So every question the model asks now carries
// its likely answers, and the chat renders them as buttons.
//
// The model appends them as one last line:
//     [[options: วันนี้ | 2-3 วัน | เกิน 1 สัปดาห์ | ไม่แน่ใจ]]
// The route strips that line from what the visitor sees and returns the
// options separately. A reply without the line simply has no buttons, so a
// model that forgets never breaks the chat. A tapped option is sent as an
// ordinary user message and goes through the same triage as typed text.
//
// No imports on purpose: pure, so tests/advice/quick-replies.test.mts can run
// it under `node --test` without a bundler.

export const MAX_QUICK_REPLIES = 4
export const MAX_QUICK_REPLY_LENGTH = 40

// Lenient about what the model actually writes: single or double brackets,
// "options"/"ตัวเลือก", either separator.
const MARKER_RE = /\[\[?\s*(?:options|ตัวเลือก)\s*[:：]\s*([^\]\n]*)\]?\]/gi

export function extractQuickReplies(text: string): { text: string; options: string[] } {
  if (!text) return { text: '', options: [] }
  let options: string[] = []
  const stripped = text.replace(MARKER_RE, (_m, body: string) => {
    // Only the last marker counts (the one attached to the closing question).
    options = body
      .split(/[|｜]/)
      .map(s => s.replace(/\*\*|__/g, '').trim())
      .filter(s => s.length > 0 && s.length <= MAX_QUICK_REPLY_LENGTH)
    return ''
  })
  const seen = new Set<string>()
  const unique = options.filter(o => (seen.has(o) ? false : (seen.add(o), true))).slice(0, MAX_QUICK_REPLIES)
  return {
    text: stripped.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(),
    // A single option is not a choice; it would just be a button that answers for them.
    options: unique.length >= 2 ? unique : [],
  }
}
