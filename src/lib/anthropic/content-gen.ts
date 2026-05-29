import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
export function anthropicSonnet(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export const CONTENT_MODEL = 'claude-sonnet-4-6'

export type CaptionBundle = {
  headline: string
  subline: string
  caption: string
  cta: string
}

const SERVICE_META: Record<string, { label: string; voucher_hint: string }> = {
  glp1: { label: 'GLP-1 ลดน้ำหนัก', voucher_hint: 'รับฟรี FBS+HbA1c (มูลค่า 500฿) ที่ W Medical Hospital' },
  std:  { label: 'ตรวจ STD / PrEP HIV', voucher_hint: 'ตรวจ HIV+Syphilis ฟรี รู้ผลใน 1 ชั่วโมง' },
  ckd:  { label: 'ตรวจไต CKD', voucher_hint: 'ตรวจปัสสาวะหาโปรตีนฟรี ที่ W Medical Hospital' },
  foreign: { label: 'ตรวจสุขภาพแรงงานต่างด้าว', voucher_hint: 'ตรวจ 9 รายการตามใบอนุญาตทำงาน — W Medical สมุทรสาคร' },
}

const SYSTEM_PROMPT = `คุณเป็นแอดมินเพจสุขภาพ "รู้ก่อนดี (รู้งี้)" / roogondee.com
โดยบริษัท เจียรักษา จำกัด ร่วมกับ W Medical Hospital สมุทรสาคร
เขียน caption + Story ภาษาไทย กระชับ คล้ายเพื่อนคุยให้ฟัง — ไม่แข็ง ไม่ขายตรง

ผู้ใช้จะแนบรูปภาพมาให้ — ดูรูปแล้วเขียน copy ที่เชื่อมกับสิ่งที่อยู่ในรูป (สี / mood / องค์ประกอบ) อย่างเป็นธรรมชาติ

ส่งคืนเป็น JSON เท่านั้น (ไม่มีคำอธิบาย ไม่มี markdown fence) ตาม schema:
{
  "headline": "ข้อความใหญ่ในสตอรี่ 4-8 คำ ตัวสะดุดตา",
  "subline":  "ขยายความ 1 ประโยค 8-16 คำ",
  "caption":  "caption ฉบับเต็มแบบลงโพสต์ 2-4 บรรทัด ≤320 ตัวอักษร พร้อม CTA ทักไลน์",
  "cta":      "ประโยค CTA สั้น ๆ ≤6 คำ เช่น 'ทักไลน์รับโค้ดฟรี'"
}

กฎ:
- headline + subline จะถูก render บนรูป → อย่าใช้ emoji เลย
- caption ใส่ emoji ได้ไม่เกิน 2 ตัว
- ห้าม markdown (** ## - *) ทุกฟิลด์
- ห้ามคำชวนตัดสินรูปร่าง (เช่น "อ้วน", "พุงยื่น", "น่าเกลียด")
- ห้ามคำการันตี (เช่น "100%", "หายขาด", "รักษาหายแน่นอน")
- ลิงก์ใน caption ใช้ roogondee.com หรือชื่อ LINE @roogondee เท่านั้น`

const BLOCKLIST = [
  '100%', 'หายขาด', 'รักษาหาย', 'การันตี', 'อ้วน', 'พุงยื่น', 'น่าเกลียด',
  'แจกยา', 'ยาฟรี',
]

function stripFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

const EMOJI_RE = /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[☀-➿]/

function checkCompliance(bundle: CaptionBundle): string[] {
  const blob = `${bundle.headline}\n${bundle.subline}\n${bundle.caption}`
  const issues: string[] = []
  for (const term of BLOCKLIST) {
    if (blob.includes(term)) issues.push(`blocklist: ${term}`)
  }
  if (EMOJI_RE.test(bundle.headline)) issues.push('emoji in headline')
  if (EMOJI_RE.test(bundle.subline)) issues.push('emoji in subline')
  return issues
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch image ${res.status}`)
  const mediaType = res.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await res.arrayBuffer())
  return { data: buf.toString('base64'), mediaType }
}

export async function generateCaptionFromImage(opts: {
  imageUrl: string
  service: 'glp1' | 'std' | 'ckd' | 'foreign'
  mode?: 'post' | 'story'
}): Promise<CaptionBundle> {
  const meta = SERVICE_META[opts.service]
  if (!meta) throw new Error(`unknown service: ${opts.service}`)

  const userText = `vertical: ${meta.label}
mode: ${opts.mode || 'post'} (จะใช้ทั้ง blog post + FB feed + FB Story)
ข้อมูลโปร: ${meta.voucher_hint}
สถานที่ตรวจ: W Medical Hospital สมุทรสาคร
ลิงก์เว็บ: https://roogondee.com

ดูรูปที่แนบ แล้วเขียน copy ที่เชื่อมโยงกับภาพ — ส่งคืน JSON ตาม schema เท่านั้น`

  const { data: b64, mediaType } = await fetchImageAsBase64(opts.imageUrl)
  const client = anthropicSonnet()

  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const msg = await client.messages.create({
        model: CONTENT_MODEL,
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: b64 } },
            { type: 'text', text: userText },
          ],
        }],
      })
      const block = msg.content[0]
      if (block.type !== 'text') throw new Error('no text response')
      const parsed = JSON.parse(stripFence(block.text)) as Partial<CaptionBundle>
      const bundle: CaptionBundle = {
        headline: (parsed.headline || '').trim(),
        subline: (parsed.subline || '').trim(),
        caption: (parsed.caption || '').trim(),
        cta: (parsed.cta || '').trim(),
      }
      for (const k of ['headline', 'subline', 'caption', 'cta'] as const) {
        if (!bundle[k]) throw new Error(`missing field: ${k}`)
      }
      const issues = checkCompliance(bundle)
      if (issues.length > 0) throw new Error(`compliance: ${issues.join(', ')}`)
      return bundle
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`generateCaptionFromImage failed after 3 attempts: ${lastErr}`)
}

const ARTICLE_SYSTEM = `คุณเป็นนักเขียนบทความสุขภาพของเว็บ "รู้ก่อนดี (รู้งี้)" / roogondee.com ร่วมกับ W Medical Hospital สมุทรสาคร

เขียนบทความ blog ภาษาไทยจาก caption + รูปที่ผู้ใช้แนบมา — ขยายเนื้อหา 400-700 คำ ใช้ภาษาเป็นกันเอง อ่านง่าย ให้ความรู้จริง ไม่ขายตรง

ส่งคืนเป็น HTML เท่านั้น (ไม่มี markdown, ไม่มี code fence) โครงสร้าง:
- <p> 2-4 ย่อหน้าเปิดเรื่อง (hook + ทำไมเรื่องนี้สำคัญ)
- <h2> หัวข้อย่อย 2-3 อัน + <p> ใต้แต่ละหัวข้อ
- <ul><li> ลิสต์ key takeaway 3-5 ข้อ
- <p> ย่อหน้าปิด + invite ทำ quiz / ทักไลน์

กฎเข้ม:
- ห้ามใช้คำการันตี (100%, หายขาด, รักษาหายแน่นอน)
- ห้ามคำตัดสินรูปร่าง (อ้วน, น่าเกลียด)
- ห้ามใส่ link ภายนอกอื่นนอกจาก roogondee.com
- ห้ามมี <html>, <body>, <head> — ส่งเฉพาะเนื้อหา block-level
- ห้ามใช้ <script>, <style>, inline style, on* handlers`

export async function generateArticleFromCaption(opts: {
  imageUrl: string
  service: 'glp1' | 'std' | 'ckd' | 'foreign'
  caption: CaptionBundle
}): Promise<string> {
  const meta = SERVICE_META[opts.service]
  if (!meta) throw new Error(`unknown service: ${opts.service}`)

  const { data: b64, mediaType } = await fetchImageAsBase64(opts.imageUrl)
  const userText = `vertical: ${meta.label}
ข้อมูลโปร: ${meta.voucher_hint}
สถานที่ตรวจ: W Medical Hospital สมุทรสาคร

Headline: ${opts.caption.headline}
Subline: ${opts.caption.subline}
Caption: ${opts.caption.caption}

ขยายเป็นบทความ blog HTML ตามโครงที่กำหนด — ส่งคืน HTML เท่านั้น`

  const client = anthropicSonnet()
  const msg = await client.messages.create({
    model: CONTENT_MODEL,
    // Thai HTML is token-dense — a 400-700 word article needs well above 2500
    // tokens, or Sonnet stops mid-sentence and we publish a truncated article.
    max_tokens: 4096,
    system: ARTICLE_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: b64 } },
        { type: 'text', text: userText },
      ],
    }],
  })
  // Reject truncated output so the caller falls back to the complete caption
  // HTML instead of storing an article cut off mid-sentence.
  if (msg.stop_reason === 'max_tokens') {
    throw new Error('article gen hit max_tokens — output truncated')
  }
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('no text response from article gen')
  const html = stripFence(block.text)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
  return html
}
