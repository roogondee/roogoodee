// LINE webhook hook for the DMGLP landing (§4.9 step 2): the LINE button on
// /dmglp pre-fills "สนใจคลินิกเบาหวาน (DM-4821)"; when that first message
// arrives we link the LINE user to the attribution row, create the lead, and
// record the `line_contact` conversion. Returns the reply text to send, or
// null when the message carries no ref code (caller continues as usual).

import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import { parseRefCode } from './attribution'
import { recordConversion } from './db'
import { HOSPITAL_PHONE } from './config'

export const DMGLP_LINE_REPLY = [
  'ขอบคุณที่สนใจโปรแกรมดูแลเบาหวานและเมตาบอลิกของโรงพยาบาลดับเบิ้ลยู เมดิคอลค่ะ',
  'ทีมงานจะติดต่อกลับเพื่อนัดพบแพทย์ประเมินเบื้องต้นภายในวันทำการถัดไป',
  '',
  'รบกวนพิมพ์ชื่อและเบอร์โทรที่สะดวกให้ติดต่อไว้ในแชทนี้ได้เลยค่ะ',
  `หรือโทร ${HOSPITAL_PHONE}`,
].join('\n')

export async function handleDmglpRefMessage(userId: string, text: string, displayName?: string | null): Promise<string | null> {
  const ref = parseRefCode(text)
  if (!ref || !userId) return null

  const { data: attribution } = await supabaseAdmin
    .from('dmglp_attribution').select('id, channel').eq('ref_code', ref).maybeSingle()
  if (!attribution) {
    // Unknown code (typo or a code we never issued): still a warm lead.
    await upsertLead(userId, displayName, null, `ref code ${ref} ไม่พบในระบบ`)
    return DMGLP_LINE_REPLY
  }

  await upsertLead(userId, displayName, attribution.id, null)
  await recordConversion(attribution.id, 'line_contact')
  await notifyLineGroup({ service: 'glp1', source: 'DMGLP LINE', name: displayName || undefined, note: `${ref} (${attribution.channel || '-'})` }).catch(() => undefined)
  return DMGLP_LINE_REPLY
}

async function upsertLead(userId: string, displayName: string | null | undefined, attributionId: string | null, note: string | null) {
  const { data: existing } = await supabaseAdmin.from('dmglp_leads').select('id, attribution_id').eq('line_user_id', userId).maybeSingle()
  if (existing) {
    if (!existing.attribution_id && attributionId) {
      await supabaseAdmin.from('dmglp_leads').update({ attribution_id: attributionId, updated_at: new Date().toISOString() }).eq('id', existing.id)
    }
    return existing.id
  }
  const { data } = await supabaseAdmin
    .from('dmglp_leads')
    .insert({ line_user_id: userId, display_name: displayName || null, attribution_id: attributionId, notes: note })
    .select('id').single()
  // Link a patient created earlier by phone/HN who has no LINE yet? No — the
  // patient record is linked by staff from the profile page, never guessed.
  return data?.id ?? null
}
