import { supabaseAdmin } from '@/lib/supabase'
import { anthropic, CHATBOT_MODEL } from '@/lib/chatbot/anthropic'
import { sendToContact } from '@/lib/messaging/push'
import type { CrmContact, NurtureSequence, SequenceStep, SequenceTrigger } from './types'
import type { Service } from '@/types'

const DAY = 24 * 60 * 60 * 1000

function runAtForStep(step: SequenceStep | undefined): string {
  const offset = step?.day_offset ?? 0
  return new Date(Date.now() + offset * DAY).toISOString()
}

// Enroll a contact into the best active sequence matching a trigger: a
// pillar-specific sequence wins over a generic (service-null) one. Idempotent:
// the unique (contact_id, sequence_id) index prevents duplicate enrollments.
export async function enrollByTrigger(
  contact: CrmContact,
  trigger: SequenceTrigger,
  service?: Service | null
): Promise<void> {
  const { data: seqs } = await supabaseAdmin
    .from('nurture_sequences')
    .select('*')
    .eq('trigger', trigger)
    .eq('active', true)

  const seq = ((seqs as NurtureSequence[] | null) ?? [])
    .filter((s) => !service || !s.service || s.service === service)
    .sort((a, b) => (a.service ? 0 : 1) - (b.service ? 0 : 1))[0]
  if (!seq) return

  await supabaseAdmin
    .from('nurture_enrollments')
    .upsert(
      {
        contact_id: contact.id,
        sequence_id: seq.id,
        current_step: 0,
        status: 'active',
        next_run_at: runAtForStep(seq.steps?.[0]),
      },
      { onConflict: 'contact_id,sequence_id', ignoreDuplicates: true }
    )
}

// Stop all active enrollments for a contact (reply / booking / opt-out).
export async function stopEnrollments(contactId: string): Promise<void> {
  await supabaseAdmin
    .from('nurture_enrollments')
    .update({ status: 'stopped' })
    .eq('contact_id', contactId)
    .eq('status', 'active')
}

const SYSTEM = `คุณเป็นแอดมินเพจสุขภาพ "รู้ก่อนดี (รู้งี้)" คุยกับลูกค้าทางแชตแบบเป็นกันเอง สั้น กระชับ ไม่ขายตรงเกินไป
เขียนข้อความติดตามภาษาไทย 1-3 ประโยค ไม่ใช้คำการันตี (เช่น 100%, หายขาด) ไม่ตัดสินรูปร่าง ลงท้ายชวนคุยต่อได้แบบไม่กดดัน
ส่งคืนเฉพาะข้อความที่จะส่งให้ลูกค้า ไม่ต้องมีคำอธิบายอื่น`

async function renderMessage(step: SequenceStep, contact: CrmContact): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: CHATBOT_MODEL,
      max_tokens: 300,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `บริบทลูกค้า: ${contact.name || 'ลูกค้า'}\nเป้าหมายข้อความนี้: ${step.prompt}\nเขียนข้อความติดตามที่จะส่งทางแชต`,
      }],
    })
    const block = msg.content[0]
    if (block.type === 'text' && block.text.trim()) return block.text.trim()
  } catch (e) {
    console.error('renderMessage failed, using raw prompt:', (e as Error).message)
  }
  return step.prompt
}

interface DueRow {
  id: string
  contact_id: string
  sequence_id: string
  current_step: number
}

// Advances every due enrollment by one step. Returns counts for the cron log.
export async function runDueEnrollments(limit = 30): Promise<{ sent: number; failed: number; completed: number }> {
  const nowIso = new Date().toISOString()
  const { data: due } = await supabaseAdmin
    .from('nurture_enrollments')
    .select('id, contact_id, sequence_id, current_step')
    .eq('status', 'active')
    .lte('next_run_at', nowIso)
    .limit(limit)

  let sent = 0, failed = 0, completed = 0

  for (const row of (due ?? []) as DueRow[]) {
    const { data: contact } = await supabaseAdmin
      .from('crm_contacts').select('*').eq('id', row.contact_id).maybeSingle()
    const { data: seq } = await supabaseAdmin
      .from('nurture_sequences').select('*').eq('id', row.sequence_id).maybeSingle()
    if (!contact || !seq) continue

    const steps = (seq.steps ?? []) as SequenceStep[]
    const step = steps[row.current_step]
    if (!step) {
      await supabaseAdmin.from('nurture_enrollments').update({ status: 'completed' }).eq('id', row.id)
      completed++
      continue
    }

    const text = await renderMessage(step, contact as CrmContact)
    const result = await sendToContact(contact as CrmContact, text)
    if (!result.success) { failed++; continue }
    sent++

    const nextIndex = row.current_step + 1
    if (nextIndex >= steps.length) {
      await supabaseAdmin.from('nurture_enrollments')
        .update({ status: 'completed', last_sent_at: nowIso }).eq('id', row.id)
      completed++
    } else {
      await supabaseAdmin.from('nurture_enrollments').update({
        current_step: nextIndex,
        last_sent_at: nowIso,
        next_run_at: runAtForStep(steps[nextIndex]),
      }).eq('id', row.id)
    }
  }

  return { sent, failed, completed }
}
