import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `คุณเป็นผู้เชี่ยวชาญด้านสุขภาพระดับ Medical Grade สำหรับ รู้ก่อนดี(รู้งี้) (roogondee.com)
โดย บริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร

กฎการตอบ:
- ภาษาไทยที่อ่านง่าย เป็นกันเอง ไม่ตัดสิน
- Evidence-based ระบุแหล่งอ้างอิงถ้ามี
- ความยาวคำตอบ 200-400 คำ
- ลงท้ายด้วยคำแนะนำให้ปรึกษาผู้เชี่ยวชาญสำหรับกรณีส่วนตัว
- ห้ามวินิจฉัยโรคโดยตรง แต่ให้ข้อมูลที่มีประโยชน์
- ห้ามใช้ HTML หรือ Markdown — ตอบเป็นข้อความธรรมดา`

function detectService(q: string): string {
  const lower = q.toLowerCase()
  if (/std|hiv|prep|pep|โรคติดต่อ|ทางเพศ|ซิฟิลิส|หนองใน/.test(lower)) return 'std'
  if (/glp|ลดน้ำหนัก|อ้วน|bmi|ozempic|saxenda|ไขมัน/.test(lower)) return 'glp1'
  if (/ไต|egfr|creatinine|ckd|ล้างไต|ฟอสฟอรัส/.test(lower)) return 'ckd'
  if (/แรงงาน|ต่างด้าว|myanmar|ใบรับรองแพทย์|ตม/.test(lower)) return 'foreign'
  return 'general'
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json()
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return NextResponse.json({ error: 'กรุณาพิมพ์คำถามให้ครบถ้วน' }, { status: 400 })
    }

    const q = question.trim().slice(0, 500)

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: q }],
    })

    const answer = (msg.content[0] as { type: string; text: string }).text.trim()
    const service = detectService(q)

    // Save to Supabase (best-effort — table may not exist yet)
    try {
      await supabaseAdmin.from('qa_posts').insert({
        question: q,
        answer,
        service,
        published: true,
      })
    } catch {
      // Table doesn't exist yet — silently continue
    }

    return NextResponse.json({ answer, service })
  } catch (err) {
    console.error('Ask API error:', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
