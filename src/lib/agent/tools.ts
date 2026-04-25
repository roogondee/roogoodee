import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLeadNotification } from '@/lib/email'

// ─── Service knowledge base ──────────────────────────────────────────────
// Hardcoded facts the agent can read via get_service_info. Keep short —
// long copy goes into blog posts and is retrieved via search_blog_posts.

const SERVICE_INFO: Record<
  'std' | 'glp1' | 'ckd' | 'foreign',
  { label: string; summary: string; offerings: string[]; pricing?: string; location: string }
> = {
  std: {
    label: 'STD & PrEP HIV',
    summary:
      'ตรวจโรคติดต่อทางเพศสัมพันธ์และรับยา PrEP ป้องกัน HIV แบบเป็นมิตร ไม่ตัดสิน ผลรวดเร็ว',
    offerings: [
      'ตรวจ HIV (4th gen, rapid test)',
      'ตรวจ STD panel 10 โรค (ซิฟิลิส หนองใน คลามิเดีย ฯลฯ)',
      'ยา PrEP / PEP',
      'วัคซีน HPV',
      'คำปรึกษาโดยแพทย์',
    ],
    pricing: 'เริ่มต้น 500 บาท ขึ้นกับแพ็กเกจ',
    location: 'W Medical Hospital, Samut Sakhon (ใกล้ กทม.)',
  },
  glp1: {
    label: 'GLP-1 ลดน้ำหนัก',
    summary:
      'โปรแกรมลดน้ำหนักด้วยยากลุ่ม GLP-1 (Ozempic, Wegovy, Saxenda) ภายใต้การดูแลของแพทย์',
    offerings: [
      'ประเมิน BMI และความเหมาะสมโดยแพทย์',
      'ยา Ozempic / Wegovy / Saxenda',
      'ติดตามผลและปรับโดสรายเดือน',
      'คำแนะนำโภชนาการและการออกกำลังกาย',
    ],
    pricing: 'ขึ้นกับยาและระยะเวลา ติดต่อทีมเพื่อรับใบเสนอราคา',
    location: 'W Medical Hospital, Samut Sakhon',
  },
  ckd: {
    label: 'CKD คลินิกโรคไต',
    summary:
      'คลินิกดูแลผู้ป่วยโรคไตเรื้อรัง (CKD) ตั้งแต่ระยะต้นจนถึงฟอกไต',
    offerings: [
      'ตรวจค่าไต (eGFR, creatinine, BUN)',
      'วางแผนชะลอโรคไต',
      'คำปรึกษาเรื่องอาหารและยา',
      'ส่งต่อเพื่อฟอกไตเมื่อจำเป็น',
    ],
    location: 'W Medical Hospital, Samut Sakhon',
  },
  foreign: {
    label: 'ตรวจสุขภาพแรงงานต่างด้าว',
    summary:
      'ตรวจสุขภาพเพื่อต่อใบอนุญาตทำงาน / ยื่น ตม. สำหรับแรงงาน พม่า ลาว กัมพูชา เวียดนาม',
    offerings: [
      'ตรวจสุขภาพตามมาตรฐานกรมการจัดหางาน',
      'เอกซเรย์ปอด ตรวจเลือด ตรวจปัสสาวะ',
      'ใบรับรองแพทย์ 2 ภาษา',
      'บริการเป็นกลุ่ม นายจ้างพาไปได้',
    ],
    pricing: 'เริ่มต้น 500 บาท/คน (กลุ่มได้ส่วนลด)',
    location: 'W Medical Hospital, Samut Sakhon',
  },
}

// ─── Tool definitions (sent to Claude) ───────────────────────────────────

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_blog_posts',
    description:
      'Search the roogondee.com health blog for published articles relevant to the user question. ' +
      'Use this when the user asks a specific medical question (symptoms, medications, procedures, costs) ' +
      'so the answer is grounded in real articles. Returns title, excerpt, slug, and service tag.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keywords to search for. Thai or English. Keep under ~6 words.',
        },
        service: {
          type: 'string',
          enum: ['std', 'glp1', 'ckd', 'foreign'],
          description: 'Optional: narrow results to one service line.',
        },
        limit: {
          type: 'number',
          description: 'Max results to return. Default 5, hard cap 8.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_service_info',
    description:
      'Return structured info about one of our four service lines (offerings, pricing hints, location). ' +
      'Use this before quoting prices or listing what we offer so the answer matches reality.',
    input_schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['std', 'glp1', 'ckd', 'foreign'],
          description: 'Which service line.',
        },
      },
      required: ['service'],
    },
  },
  {
    name: 'create_lead',
    description:
      'Save the user as a sales lead once they have shared BOTH their name AND a Thai phone number and have ' +
      'expressed interest. Triggers an email to the clinic team who will call back within 30 minutes. ' +
      'Do NOT call this tool speculatively — only when the user agrees to be contacted.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'First name or full name, as given by the user.' },
        phone: {
          type: 'string',
          description: 'Thai phone number, 9–10 digits, starting with 0. Example: 0812345678.',
        },
        service: {
          type: 'string',
          enum: ['std', 'glp1', 'ckd', 'foreign', 'general'],
          description: 'Which service the lead is interested in.',
        },
        note: {
          type: 'string',
          description: 'Short (<300 chars) summary of the conversation / user needs.',
        },
      },
      required: ['name', 'phone', 'service'],
    },
  },
  {
    name: 'book_appointment',
    description:
      'Create an appointment request when the user wants to book a specific date/time or visit the clinic. ' +
      'Same contact capture as create_lead but flagged as appointment_request so the team prioritizes it. ' +
      'Requires name and phone.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string', description: 'Thai phone, starts with 0, 9–10 digits.' },
        service: {
          type: 'string',
          enum: ['std', 'glp1', 'ckd', 'foreign', 'general'],
        },
        preferred_date: {
          type: 'string',
          description: 'User\'s preferred date/time in plain text (e.g. "พรุ่งนี้บ่าย", "25 เม.ย. 10:00"). Optional.',
        },
        note: { type: 'string' },
      },
      required: ['name', 'phone', 'service'],
    },
  },
]

// ─── Tool execution ──────────────────────────────────────────────────────

export interface ToolExecutionContext {
  sessionId: string
  conversationSnippet: string // last few turns, for lead notes
}

export interface ToolResult {
  // JSON-serializable content sent back to Claude as the tool_result
  output: unknown
  // Side-effects surfaced to the route handler (e.g. flag leadCaptured)
  leadCreated?: { leadId: string; service: string }
}

function sanitizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 9 || digits.length > 10) return null
  if (!digits.startsWith('0')) return null
  return digits
}

async function handleSearchBlogPosts(input: {
  query: string
  service?: string
  limit?: number
}): Promise<unknown> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 8)
  const q = input.query.trim().slice(0, 120)
  if (!q) return { results: [] }

  // ILIKE across title + excerpt + content. Supabase .or() with commas escaped.
  const pattern = `%${q.replace(/%/g, '').replace(/,/g, ' ')}%`
  let builder = supabaseAdmin
    .from('posts')
    .select('title,slug,excerpt,service')
    .eq('status', 'published')
    .or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (input.service) builder = builder.eq('service', input.service)

  const { data, error } = await builder
  if (error) return { results: [], error: error.message }
  return {
    results: (data ?? []).map(p => ({
      title: p.title,
      url: `https://roogondee.com/blog/${p.slug}`,
      excerpt: (p.excerpt || '').slice(0, 220),
      service: p.service,
    })),
  }
}

function handleGetServiceInfo(input: { service: string }): unknown {
  const key = input.service as keyof typeof SERVICE_INFO
  const info = SERVICE_INFO[key]
  if (!info) return { error: `unknown service: ${input.service}` }
  return info
}

async function handleCreateLead(
  input: { name: string; phone: string; service: string; note?: string },
  ctx: ToolExecutionContext,
  source: 'chat-widget' | 'appointment_request',
  extraNote?: string
): Promise<ToolResult> {
  const phone = sanitizePhone(input.phone)
  if (!phone) {
    return {
      output: {
        ok: false,
        error:
          'invalid_phone: phone must be a Thai number starting with 0 and 9–10 digits. Ask the user to confirm.',
      },
    }
  }
  const name = (input.name || '').trim().slice(0, 80)
  if (!name) {
    return { output: { ok: false, error: 'invalid_name: ask the user for their name.' } }
  }

  const service = ['std', 'glp1', 'ckd', 'foreign', 'general'].includes(input.service)
    ? input.service
    : 'general'

  const note = [extraNote, input.note, ctx.conversationSnippet]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 500)

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      first_name: name,
      phone,
      service,
      source,
      status: 'new',
      note,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { output: { ok: false, error: `db_error: ${error?.message ?? 'unknown'}` } }
  }

  // Fire-and-forget email; errors already swallowed inside sendLeadNotification
  sendLeadNotification({ name, phone, service, source, note })

  return {
    output: {
      ok: true,
      message:
        'Lead saved. Team will call back within 30 minutes. Tell the user to expect the call from 0-2-xxx-xxxx.',
    },
    leadCreated: { leadId: data.id, service },
  }
}

export async function executeTool(
  name: string,
  rawInput: unknown,
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const input = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as Record<string, unknown>

  try {
    if (name === 'search_blog_posts') {
      return { output: await handleSearchBlogPosts(input as { query: string; service?: string; limit?: number }) }
    }
    if (name === 'get_service_info') {
      return { output: handleGetServiceInfo(input as { service: string }) }
    }
    if (name === 'create_lead') {
      return handleCreateLead(
        input as { name: string; phone: string; service: string; note?: string },
        ctx,
        'chat-widget'
      )
    }
    if (name === 'book_appointment') {
      const preferred = typeof input.preferred_date === 'string' ? input.preferred_date : ''
      return handleCreateLead(
        input as { name: string; phone: string; service: string; note?: string },
        ctx,
        'appointment_request',
        preferred ? `appointment_preferred=${preferred}` : undefined
      )
    }
    return { output: { error: `unknown_tool: ${name}` } }
  } catch (err) {
    return { output: { error: `tool_exception: ${err instanceof Error ? err.message : String(err)}` } }
  }
}
