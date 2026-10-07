// Small server-side helpers shared by the /dmglp/staff pages, server
// actions, cron and LINE webhook. All use the service-role client.

import { supabaseAdmin } from '@/lib/supabase'
import { pushLineMessages, textMessage } from '@/lib/growth/line'
import { notifyLineGroup } from '@/lib/line-notify'
import { DEFAULT_ELIGIBILITY_RULES, type EligibilityRules } from './eligibility'
import { NO_SHOW_CALL_AFTER_DAYS, type ConversionName } from './config'
import { generateRefCode } from './attribution'

export interface RuleSet extends EligibilityRules {
  min_days_per_step: number
  long_gap_days: number
  no_show_call_after_days: number
}

export async function getRules(): Promise<RuleSet> {
  const { data } = await supabaseAdmin.from('dmglp_eligibility_rules').select('key, value')
  const map: Record<string, number> = {}
  for (const r of data ?? []) map[r.key] = Number(r.value)
  return {
    obesity_bmi: map.obesity_bmi ?? DEFAULT_ELIGIBILITY_RULES.obesity_bmi,
    overweight_bmi: map.overweight_bmi ?? DEFAULT_ELIGIBILITY_RULES.overweight_bmi,
    min_days_per_step: map.min_days_per_step ?? 28,
    long_gap_days: map.long_gap_days ?? 14,
    no_show_call_after_days: map.no_show_call_after_days ?? NO_SHOW_CALL_AFTER_DAYS,
  }
}

export interface PriceItem {
  code: string
  name_th: string
  category: 'drug' | 'service' | 'lab' | 'package'
  price: number
  placeholder: boolean
  active: boolean
}

export async function getPriceItems(): Promise<PriceItem[]> {
  const { data } = await supabaseAdmin
    .from('dmglp_price_items')
    .select('code, name_th, category, price, placeholder, active')
    .order('category')
    .order('code')
  return (data ?? []).map(p => ({ ...p, price: Number(p.price) })) as PriceItem[]
}

export async function getPriceMap(): Promise<Record<string, number>> {
  const items = await getPriceItems()
  return Object.fromEntries(items.map(i => [i.code, i.price]))
}

// One row per (attribution, conversion name); a repeat is a no-op.
export async function recordConversion(attributionId: string | null | undefined, name: ConversionName, at: Date = new Date()) {
  if (!attributionId) return
  const { error } = await supabaseAdmin
    .from('dmglp_conversions')
    .upsert({ attribution_id: attributionId, name, occurred_at: at.toISOString() }, { onConflict: 'attribution_id,name', ignoreDuplicates: true })
  if (error) console.error('[dmglp] conversion', error.message)
}

// Attribution id for a patient, via their lead.
export async function attributionForPatient(patientId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('dmglp_patients')
    .select('lead:dmglp_leads(attribution_id)')
    .eq('id', patientId)
    .maybeSingle()
  const lead = (data as { lead?: { attribution_id: string | null } | { attribution_id: string | null }[] | null } | null)?.lead
  const row = Array.isArray(lead) ? lead[0] : lead
  return row?.attribution_id ?? null
}

export async function createAttribution(input: {
  gclid?: string | null
  utm?: Record<string, string> | null
  channel: string
  partner_id?: string | null
  cookie_consent: boolean
  landing_path?: string | null
}): Promise<{ id: string; ref_code: string } | null> {
  // Four-digit codes collide eventually; retry a few times on the unique index.
  for (let i = 0; i < 5; i++) {
    const ref_code = generateRefCode()
    const { data, error } = await supabaseAdmin
      .from('dmglp_attribution')
      .insert({
        ref_code,
        gclid: input.gclid || null,
        utm: input.utm && Object.keys(input.utm).length ? input.utm : null,
        channel: input.channel,
        partner_id: input.partner_id || null,
        cookie_consent: input.cookie_consent,
        landing_path: input.landing_path || null,
      })
      .select('id, ref_code')
      .single()
    if (!error && data) return data
    if (error && error.code !== '23505') { console.error('[dmglp] attribution', error.message); return null }
  }
  return null
}

export interface AlertInput {
  patient_id?: string | null
  source: 'survey' | 'fridge' | 'stock' | 'eligibility' | 'titration'
  severity: 'high' | 'normal'
  message: string
}

// Creates the alert; a high-severity one is also pushed to the on-duty LINE
// group (LINE_NOTIFY_GROUP_ID) so the pharmacist/doctor see it at once.
export async function createAlert(input: AlertInput) {
  const { data } = await supabaseAdmin.from('dmglp_alerts').insert(input).select('id').single()
  if (input.severity === 'high') {
    await notifyLineGroup({
      service: 'glp1',
      source: 'DMGLP alert',
      name: input.patient_id ? `ผู้ป่วย ${input.patient_id.slice(0, 8)}` : '-',
      note: input.message,
    }).catch(() => undefined)
  }
  return data?.id ?? null
}

// LIFF app for the patient-facing pages (/dmglp/liff). Unset → no link is sent.
const LIFF_DMGLP_ID = process.env.NEXT_PUBLIC_LIFF_DMGLP_ID || ''

export function liffUrl(page: 'appointments' | 'survey' | 'program', apptId?: string): string | null {
  if (!LIFF_DMGLP_ID) return null
  const q = new URLSearchParams({ page })
  if (apptId) q.set('appt', apptId)
  return `https://liff.line.me/${LIFF_DMGLP_ID}?${q.toString()}`
}

export async function pushToPatient(lineUserId: string | null | undefined, text: string): Promise<boolean> {
  if (!lineUserId) return false
  return pushLineMessages(lineUserId, [textMessage(text)])
}

export const PATIENT_COLUMNS = 'id, hn, first_name, last_name, sex, birth_date, phone, line_user_id, lead_id, partner_id, created_at'

export function patientName(p: { first_name: string; last_name: string }): string {
  return `${p.first_name} ${p.last_name}`.trim()
}
