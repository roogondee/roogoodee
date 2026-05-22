import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import { anthropic, CHATBOT_MODEL } from '@/lib/chatbot/anthropic'

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD & PrEP', glp1: 'GLP-1 ลดน้ำหนัก', ckd: 'CKD โรคไต',
  foreign: 'แรงงานต่างด้าว', mens: 'สุขภาพชายวัย 40+',
  women: 'สุขภาพเพศหญิง', mind: 'สุขภาพจิต & ความสัมพันธ์',
}

const SYSTEM_PROMPT = `คุณเป็นโค้ช sales ของคลินิก telehealth ภาษาไทย ช่วยตัดสินใจว่า "ครั้งหน้าควรทำอะไรกับลูกค้าคนนี้"

ตอบกลับเป็น JSON เท่านั้น schema:
{
  "action": "สั้นๆ 1 บรรทัด (≤ 60 ตัวอักษร) เช่น 'โทรกลับยืนยันคิว' หรือ 'ส่ง LINE ถามผลตรวจ'",
  "channel": "call | line | sms",
  "due_in_days": 1-14,
  "reasoning": "อธิบายเหตุผล 1-2 ประโยค"
}

กฎ:
- ถ้าโทรไม่รับ 2 ครั้งติด → แนะนำ LINE/SMS แทนการโทรซ้ำ
- ถ้า booked แล้ว → ติดตามใกล้วันนัด ไม่ต้องเร่งรัด
- ถ้า not_interested → snooze 14 วัน ลอง win-back
- ลูกค้า tier=urgent → ติดตามทุก 24 ชม.
- ถ้าใช้ผ่าน mind pillar และ outcome=callback_requested → call within 24h เสมอ (safety-sensitive)
- ห้ามแนะนำสิ่งที่ไม่เกี่ยวกับการติดต่อลูกค้าคนนี้`

async function assertCanAccess(leadId: string, role: string, userId: string | null) {
  if (role !== 'sale' || !userId) return true
  const { data } = await supabaseAdmin
    .from('leads')
    .select('assigned_to')
    .eq('id', leadId)
    .maybeSingle()
  return !!data && data.assigned_to === userId
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await assertCanAccess(params.id, me.role, me.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const [{ data: lead }, { data: activities }] = await Promise.all([
    supabaseAdmin
      .from('leads')
      .select('first_name, last_name, service, lead_tier, lead_score, status, note, last_contacted_at, next_action_at, next_action_note, created_at')
      .eq('id', params.id)
      .maybeSingle(),
    supabaseAdmin
      .from('lead_activities')
      .select('kind, outcome, body, created_at')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (!lead) return NextResponse.json({ error: 'lead_not_found' }, { status: 404 })

  const serviceLabel = SERVICE_LABELS[lead.service] || lead.service
  const ageDays = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86_400_000)

  const activityLines = (activities || []).map(a => {
    const d = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86_400_000)
    const ago = d === 0 ? 'วันนี้' : `${d} วันที่แล้ว`
    return `- ${ago}: ${a.kind}${a.outcome ? ` → ${a.outcome}` : ''}${a.body ? ` — "${a.body.slice(0, 100)}"` : ''}`
  })

  const userPrompt = [
    `ชื่อ: ${lead.first_name} ${lead.last_name || ''}`,
    `บริการ: ${serviceLabel}`,
    `Tier: ${lead.lead_tier || '-'} (score ${lead.lead_score ?? 0})`,
    `Status: ${lead.status || 'new'}`,
    `Lead อายุ: ${ageDays} วัน`,
    `ติดต่อล่าสุด: ${lead.last_contacted_at ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86_400_000) + ' วันที่แล้ว' : 'ยังไม่เคย'}`,
    lead.note ? `Sticky note: "${lead.note.slice(0, 200)}"` : null,
    '',
    `Activity ล่าสุด (${activities?.length || 0} ครั้ง):`,
    activityLines.length > 0 ? activityLines.join('\n') : '(ยังไม่มี activity)',
    '',
    'แนะนำว่าครั้งหน้าควรทำอะไร — ตอบเป็น JSON ตามที่ระบุ',
  ].filter(Boolean).join('\n')

  try {
    const resp = await anthropic.messages.create({
      model: CHATBOT_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = resp.content
      .filter(b => b.type === 'text')
      .map(b => (b as { text: string }).text)
      .join('')

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'invalid_ai_response', raw: text }, { status: 502 })
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      action?: string
      channel?: string
      due_in_days?: number
      reasoning?: string
    }
    if (!parsed.action || !parsed.channel || typeof parsed.due_in_days !== 'number') {
      return NextResponse.json({ error: 'incomplete_ai_response', raw: text }, { status: 502 })
    }

    return NextResponse.json({
      action:       parsed.action.slice(0, 200),
      channel:      ['call', 'line', 'sms'].includes(parsed.channel) ? parsed.channel : 'call',
      due_in_days:  Math.max(1, Math.min(14, parsed.due_in_days)),
      reasoning:    (parsed.reasoning || '').slice(0, 300),
    })
  } catch (err) {
    console.error('suggest-action error:', err)
    return NextResponse.json({ error: 'ai_call_failed' }, { status: 502 })
  }
}
