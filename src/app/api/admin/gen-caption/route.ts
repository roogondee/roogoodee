import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { anthropic, CHATBOT_MODEL } from '@/lib/chatbot/anthropic'

type Service = 'glp1' | 'std' | 'ckd' | 'foreign' | 'mens'
type Tone = 'informative' | 'urgent' | 'friendly' | 'question'
type Goal = 'awareness' | 'lead'

const SERVICE_BRIEF: Record<Service, string> = {
  glp1: 'GLP-1 injection สำหรับลดน้ำหนัก (Ozempic/Wegovy/Mounjaro class). Voucher RGD-GLP1-XXXXXX → ตรวจ FBS + HbA1c ฟรี (มูลค่า 500฿) ที่ W Medical Hospital. หมดอายุใน 14 วัน.',
  std:  'STD & PrEP HIV. Voucher RGD-STD-XXXXXX → ตรวจ HIV + Syphilis ฟรี รู้ผลใน 1 ชม. ไม่บอกชื่อ ไม่มีในระบบ.',
  ckd:  'โรคไตเรื้อรัง (CKD). Voucher RGD-CKD-XXXXXX → ตรวจ urine protein ฟรี. เน้นคนเบาหวาน/ความดันที่ยังไม่รู้ตัวว่าไตเริ่มเสื่อม.',
  foreign: 'ตรวจสุขภาพแรงงานต่างด้าว B2B (HR/ผู้จัดการโรงงาน) ใน สมุทรสาคร. ครบ 9 จุดตาม Work Permit. ทีมไปตรวจที่โรงงานได้.',
  mens: 'สุขภาพชาย (PE, ED). Voucher RGD-MEN-XXXXXX. ใช้คำสุภาพ เลี่ยงคำที่ ad platform reject.',
}

const TONE_GUIDE: Record<Tone, string> = {
  informative: 'ให้ข้อมูลเชิง educate, ตัวเลข/ข้อเท็จจริง, neutral',
  urgent:      'สร้าง urgency, voucher จำกัด, expire soon, ก่อนสาย',
  friendly:    'อบอุ่น เป็นเพื่อน, ไม่กดดัน, ภาษาพูดเบา ๆ',
  question:    'เปิดด้วยคำถามดึง engagement, ให้คน comment ตอบ',
}

const GOAL_GUIDE: Record<Goal, string> = {
  awareness: 'เป้าหมาย Awareness — เน้น brand "รู้ก่อนดี", educate, ไม่ขายตรง, CTA เบา ๆ "เรียนรู้เพิ่มเติม"',
  lead:      'เป้าหมาย Lead — push ทำ quiz รับ voucher, CTA ชัด, urgency',
}

interface GenRequest {
  service: Service
  tone: Tone
  goal: Goal
  topic?: string
}

interface CaptionVariant {
  version: string
  caption: string
  hashtags: string[]
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as GenRequest
  const { service, tone, goal, topic } = body

  if (!SERVICE_BRIEF[service] || !TONE_GUIDE[tone] || !GOAL_GUIDE[goal]) {
    return NextResponse.json({ error: 'Invalid service/tone/goal' }, { status: 400 })
  }

  const utm = `?utm_source=fb&utm_medium=organic&utm_campaign=${service}_${goal}`
  const ctaUrl = service === 'foreign'
    ? `https://roogondee.com/services/foreign${utm}`
    : `https://roogondee.com/quiz/${service}${utm}`

  const prompt = `คุณเป็น copywriter ของแบรนด์ "รู้ก่อนดี" (Roogondee) — telehealth lead-gen ไทย.

Service ที่จะโพสต์:
${SERVICE_BRIEF[service]}

Tone: ${TONE_GUIDE[tone]}
Goal: ${GOAL_GUIDE[goal]}
${topic ? `Topic เฉพาะ: ${topic}` : ''}

CTA URL: ${ctaUrl}

สร้าง caption ภาษาไทย 3 versions สำหรับ Facebook feed (จะใช้กับรูปที่เตรียมไว้แล้ว):
- A: สั้น punchy (≤80 คำ, hook แรง)
- B: ยาวมี story (120-180 คำ, มี narrative)
- C: เปิดด้วยคำถาม (≤100 คำ, ดึง comment)

กฎ:
- ห้ามอ้าง "รักษาหาย", "100%", "ดีที่สุด" — โดน Meta reject
- ห้าม before/after, ห้ามคำว่า "you are overweight/sick"
- ใส่ "ปรึกษาแพทย์ก่อน" ถ้าเกี่ยวกับยา
- ใส่ CTA URL ครบทุก version
- ใส่ disclaimer สั้น ๆ ถ้าจำเป็น (GLP-1, PrEP)
- ห้ามใช้ emoji เกิน 3 ตัว/version

ตอบเป็น JSON เท่านั้น:
{
  "variants": [
    {"version": "A", "caption": "...", "hashtags": ["#tag1", "#tag2", ...]},
    {"version": "B", "caption": "...", "hashtags": [...]},
    {"version": "C", "caption": "...", "hashtags": [...]}
  ]
}`

  try {
    const res = await anthropic.messages.create({
      model: CHATBOT_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = res.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No response from model' }, { status: 500 })
    }

    const match = text.text.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'Model returned non-JSON', raw: text.text }, { status: 500 })
    }

    const parsed = JSON.parse(match[0]) as { variants: CaptionVariant[] }
    return NextResponse.json({ ok: true, ctaUrl, variants: parsed.variants })
  } catch (err) {
    console.error('[gen-caption]', err)
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
