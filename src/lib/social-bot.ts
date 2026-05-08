import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Sales-oriented prompt: every reply must steer the user toward a service
// landing page / contact CTA. Bot's job is not just Q&A — it's a top-of-funnel
// closer that hands the user off to the quiz / contact page so a voucher gets
// issued and the lead lands in the W Medical LINE group.
const SYSTEM_PROMPT = `คุณคือ AI sales assistant ของ "รู้ก่อนดี(รู้งี้)" (roogondee.com) — บริการของบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

บริการของเรา (ผลิตภัณฑ์ที่ต้องขาย):
- STD & PrEP HIV: ตรวจฟรี HIV+Syphilis ผล 1 ชม. → /quiz/std → voucher RGD-STD-XXXXXX
- GLP-1 ลดน้ำหนัก: Semaglutide/Liraglutide + ตรวจ FBS+HbA1c ฟรี (มูลค่า 500฿) → /quiz/glp1 → voucher RGD-GLP1-XXXXXX (อายุ 14 วัน)
- CKD โรคไต: ตรวจ urine protein ฟรี ชะลอการเสื่อมของไต → /quiz/ckd → voucher RGD-CKD-XXXXXX
- ตรวจสุขภาพแรงงานต่างด้าว (B2B): Work Permit checkup สำหรับ HR สมุทรสาคร → /contact?service=foreign

CRITICAL LANGUAGE RULE:
- Detect the user's language and ALWAYS reply in that SAME language.
- Thai → Thai, English → English, Burmese → Burmese, Lao → Lao, Khmer → Khmer,
  Chinese → Chinese, Vietnamese → Vietnamese, Hindi → Hindi, Japanese → Japanese, Korean → Korean

CRITICAL SALES RULE — every single reply MUST close with a CTA:
1. ตอบคำถามให้สั้น กระชับ เป็นมิตร ไม่ตัดสิน (max 4 sentences)
2. หลังตอบ ให้ "ลากเข้า funnel" เสมอ — แนะนำบริการที่เกี่ยวข้องที่สุด พร้อมประโยชน์ที่จับต้องได้ (ตรวจฟรี / voucher / 1 ชม. รู้ผล / ปรึกษาฟรีไม่ตัดสิน)
3. ใส่ลิงก์ quiz หรือ contact ของบริการนั้น 1 ลิงก์เสมอ (อย่ายัดหลายลิงก์):
   - STD/PrEP/HIV → https://roogondee.com/quiz/std
   - ลดน้ำหนัก/GLP-1/อ้วน → https://roogondee.com/quiz/glp1
   - ไต/CKD → https://roogondee.com/quiz/ckd
   - แรงงานต่างด้าว/HR/B2B → https://roogondee.com/contact?service=foreign
   - ทั่วไป (ไม่ตรง vertical) → https://roogondee.com/quiz/glp1 (default to GLP-1, popular vertical)
4. ปิดท้ายด้วย CTA สั้นๆ เช่น "ทำแบบประเมิน 1 นาทีรับ voucher ตรวจฟรีเลยค่ะ" (translate to user's language)
5. ห้าม diagnose / สั่งยา — แนะนำให้พบแพทย์ที่ W Medical เสมอ
6. ถ้าผู้ใช้ถามราคา/โปรโมชั่น/อยากจอง → push CTA ทันที พร้อมบอกว่า voucher ฟรีและไม่มีค่าใช้จ่ายแอบแฝง
7. ถ้าผู้ใช้แค่ทักทาย/ถามทั่วไป → ใช้โอกาสนั้นถามอาการ/ความสนใจของเขาแล้วโยงเข้า service ที่ใกล้ที่สุด`

export const SERVICE_KEYWORDS: Record<string, string[]> = {
  std:     ['std', 'hiv', 'prep', 'pep', 'ซิฟิลิส', 'หนองใน', 'เริม', 'ตรวจเลือด', 'ตรวจโรค', 'เพศสัมพันธ์'],
  glp1:    ['glp', 'ozempic', 'saxenda', 'ลดน้ำหนัก', 'อ้วน', 'bmi', 'ยาฉีด', 'เบาหวาน'],
  ckd:     ['ไต', 'ckd', 'ครีเอตินิน', 'creatinine', 'egfr', 'ล้างไต', 'โรคไต'],
  foreign: ['แรงงาน', 'ต่างด้าว', 'myanmar', 'เมียนมา', 'กัมพูชา', 'ลาว', 'เวียดนาม', 'ใบรับรองแพทย์', 'work permit'],
}

export function detectService(text: string): string {
  const lower = text.toLowerCase()
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return service
  }
  return 'general'
}

export async function askClaude(question: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text : ''
}

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || ''
const IG_PAGE_ACCESS_TOKEN = process.env.IG_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN
const GRAPH = 'https://graph.facebook.com/v19.0'

type Platform = 'fb' | 'ig'

function tokenFor(platform: Platform): string {
  return platform === 'ig' ? IG_PAGE_ACCESS_TOKEN : FB_PAGE_ACCESS_TOKEN
}

// Send a Messenger DM (FB) or IG Direct DM. Same Graph endpoint, different token.
export async function sendDM(platform: Platform, recipientId: string, text: string) {
  const token = tokenFor(platform)
  if (!token) {
    console.error(`[social-bot] missing token for ${platform}`)
    return
  }
  const res = await fetch(`${GRAPH}/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[social-bot] ${platform} DM error:`, res.status, err)
  }
}

// Public reply on a comment thread.
//   FB: POST /{comment-id}/comments
//   IG: POST /{ig-comment-id}/replies
export async function replyToComment(platform: Platform, commentId: string, message: string) {
  const token = tokenFor(platform)
  if (!token) return
  const path = platform === 'ig' ? `${commentId}/replies` : `${commentId}/comments`
  const res = await fetch(`${GRAPH}/${path}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[social-bot] ${platform} comment reply error:`, res.status, err)
  }
}

// Private DM triggered by a comment. Meta lets a Page send one private message
// per comment within 7 days. Works for both FB and IG via /me/messages with
// recipient: { comment_id }. Required scope: pages_messaging.
export async function sendPrivateReplyFromComment(
  platform: Platform,
  commentId: string,
  text: string,
) {
  const token = tokenFor(platform)
  if (!token) return
  const res = await fetch(`${GRAPH}/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[social-bot] ${platform} private reply error:`, res.status, err)
  }
}

// Short, friendly public comment that hands off to DM. Same copy works for FB
// and IG; we keep it Thai-default since most commenters on the page are Thai.
// Long AI replies under public comments look spammy — sales conversion happens
// in DM where we can ask qualifying questions and push the quiz.
export function publicCommentHandoff(service: string): string {
  const cta: Record<string, string> = {
    std:     'ส่งข้อมูลเรื่องตรวจ STD/HIV ฟรี',
    glp1:    'ส่งข้อมูลเรื่องลดน้ำหนัก + voucher ตรวจฟรี',
    ckd:     'ส่งข้อมูลเรื่องดูแลไต + ตรวจ urine protein ฟรี',
    foreign: 'ส่งข้อมูลตรวจสุขภาพแรงงานต่างด้าว',
    general: 'ส่งข้อมูลและ voucher ตรวจฟรีให้',
  }
  return `ขอบคุณที่สนใจค่ะ 💚 ทักแชทเข้ามาที่ Inbox ได้เลย เรา${cta[service] || cta.general}ให้ทันทีค่ะ`
}

// First-touch opener for Click-to-Messenger ads. The `ref` param on m.me URLs
// (e.g. m.me/roogondee?ref=glp1_voucher) lands here so the bot can open with a
// service-specific qualifying question + direct quiz link instead of waiting
// for the user to type. Higher conversion than letting AI improvise on a blank
// thread because we already know what the ad promised.
const REFERRAL_OPENERS: Record<string, string> = {
  glp1:    'สวัสดีค่ะ 💚 สนใจตรวจฟรี FBS+HbA1c (มูลค่า 500฿) + voucher GLP-1 ลดน้ำหนักใช่มั้ยคะ?\n\nบอกหน่อยค่ะ น้ำหนัก/ส่วนสูงประมาณเท่าไหร่ และเคยลองลดน้ำหนักด้วยวิธีไหนมาบ้าง?\n\nหรือกดทำแบบประเมิน 1 นาทีรับ voucher ตรวจฟรีทันที 👉 https://roogondee.com/quiz/glp1',
  std:     'สวัสดีค่ะ 💚 สนใจตรวจ HIV+Syphilis ฟรี รู้ผลใน 1 ชม. ใช่มั้ยคะ?\n\nที่ W Medical สมุทรสาคร — ปลอดภัย เป็นความลับ ไม่ตัดสิน\n\nกดทำแบบประเมิน 1 นาทีรับ voucher 👉 https://roogondee.com/quiz/std',
  ckd:     'สวัสดีค่ะ 💚 สนใจตรวจ urine protein ฟรี ดูแลไตใช่มั้ยคะ?\n\nเหมาะมากถ้าเป็นเบาหวาน/ความดัน/อายุ 40+ — รู้ก่อนชะลอการเสื่อมของไตได้\n\nกดทำแบบประเมิน 1 นาทีรับ voucher 👉 https://roogondee.com/quiz/ckd',
  foreign: 'สวัสดีค่ะ 💚 บริการตรวจสุขภาพแรงงานต่างด้าว Work Permit\n\nรองรับเป็นกลุ่ม (B2B) สำหรับ HR/factory สมุทรสาคร — ใบรับรอง สบส. 001/2569 + LA 7044P/2568\n\nติดต่อทีมขายโดยตรง 👉 https://roogondee.com/contact?service=foreign',
  general: 'สวัสดีค่ะ ยินดีต้อนรับสู่ รู้ก่อนดี (รู้งี้) 💚\n\nสนใจบริการอะไรเป็นพิเศษคะ?\n• 💉 ลดน้ำหนัก GLP-1\n• 🧪 ตรวจ STD/HIV ฟรี\n• 🫘 ดูแลไต CKD\n\nหรือทำแบบประเมิน 1 นาทีรับ voucher 👉 https://roogondee.com/quiz/glp1',
}

// Map ad ref payload to a service. Marketing sets `ref` in the ad config;
// we look at the prefix so values like `glp1_voucher`, `glp1_aug26`, `glp1`
// all route to the GLP-1 opener.
export function serviceFromRef(ref: string | undefined | null): string {
  if (!ref) return 'general'
  const lower = ref.toLowerCase()
  if (lower.startsWith('glp')) return 'glp1'
  if (lower.startsWith('std') || lower.startsWith('hiv') || lower.startsWith('prep')) return 'std'
  if (lower.startsWith('ckd') || lower.startsWith('kidney')) return 'ckd'
  if (lower.startsWith('foreign') || lower.startsWith('worker') || lower.startsWith('hr')) return 'foreign'
  return 'general'
}

export function referralOpener(service: string): string {
  return REFERRAL_OPENERS[service] || REFERRAL_OPENERS.general
}

// Canned reply when a sender exceeds the per-hour rate limit. We still want
// to keep them in the funnel (link to quiz) instead of going completely silent.
export function rateLimitReply(): string {
  return 'ขอโทษค่ะ ตอนนี้คนทักเยอะมาก เดี๋ยวทีมดูแลจะตอบกลับโดยตรงค่ะ 💚\n\nระหว่างนี้กดทำแบบประเมิน 1 นาทีเพื่อรับ voucher ตรวจฟรีทันทีได้ที่ 👉 https://roogondee.com/quiz/glp1'
}
