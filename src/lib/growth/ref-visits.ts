// Website ref codes, server side: mint at landing, link at LINE, count at the
// counter. The visit conversion is the same "a patient actually came" signal
// the growth loops already send (src/lib/growth/visit.ts) — this file gets
// /medical-certificate and /clinic visitors onto it, since neither page has
// a voucher.
//
// A visit is recorded once, by whichever path sees the code first:
//   cert   — staff typed the code into a certificate on cert.roogondee.com
//            (extra.ref_code); syncRefVisitsFromCerts() picks it up daily
//   redeem — staff typed it into /admin/redeem
//
// Reporting never counts a visit twice: a code the visitor sent over LINE has
// a lead, and the lead path (markLeadVisited) reports it; a code with no lead
// (they phoned, or walked in with the code from the page) is reported from
// the ref row itself — Meta here, Google via /api/ads/offline-conversions.

import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import { resolveContact } from '@/lib/crm/contacts'
import { sendMetaEvents } from '@/lib/meta-capi'
import { fetchWmedicalRefVisits, wmedicalBridgeConfigured } from '@/lib/certs/wmedical'
import { newRefCode, parseBareRefCode, parseRefCode, type RefProgram } from '@/lib/refcodes'
import { VISIT_VALUE_THB } from './config'
import { markLeadVisited } from './visit'

export interface RefRow {
  id: string
  ref_code: string
  program: RefProgram
  gclid: string | null
  fbc: string | null
  fbp: string | null
  utm: Record<string, string> | null
  cookie_consent: boolean
  client_ip: string | null
  user_agent: string | null
  lead_id: string | null
  line_contact_at: string | null
  visited_at: string | null
  visit_source: 'cert' | 'redeem' | null
  created_at: string
}

const REF_COLUMNS = 'id, ref_code, program, gclid, fbc, fbp, utm, cookie_consent, client_ip, user_agent, lead_id, line_contact_at, visited_at, visit_source, created_at'

export const REF_SOURCE: Record<RefProgram, string> = {
  medcert: 'medcert-landing',
  clinic: 'clinic-landing',
}

export const REF_LABEL: Record<RefProgram, string> = {
  medcert: 'ใบรับรองแพทย์',
  clinic: 'คลินิก / นัดพบแพทย์',
}

const HOSPITAL_PHONE = '034-110-988'

export async function mintRefCode(input: {
  program: RefProgram
  gclid?: string | null
  fbc?: string | null
  fbp?: string | null
  utm?: Record<string, string>
  consent: boolean
  ip?: string | null
  userAgent?: string | null
  path?: string | null
}): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref_code = newRefCode(input.program)
    const { error } = await supabaseAdmin.from('site_ref_codes').insert({
      ref_code,
      program: input.program,
      gclid: input.gclid || null,
      fbc: input.fbc || null,
      fbp: input.fbp || null,
      utm: input.utm && Object.keys(input.utm).length ? input.utm : null,
      cookie_consent: input.consent,
      // PDPA: device details only once the visitor has accepted the banner.
      client_ip: input.consent ? input.ip || null : null,
      user_agent: input.consent ? (input.userAgent || '').slice(0, 500) || null : null,
      landing_path: input.path || null,
    })
    if (!error) return ref_code
    if ((error as { code?: string }).code !== '23505') {
      console.error('[ref] mint failed:', error.message)
      return null
    }
  }
  return null
}

// The banner is often answered after the code was minted.
// A withdrawal always clears what was stored, even after the visit was
// recorded — that report already went out under the consent given then.
export async function setRefConsent(refCode: string, consent: boolean, ip?: string | null, userAgent?: string | null) {
  await supabaseAdmin
    .from('site_ref_codes')
    .update(consent
      ? { cookie_consent: true, client_ip: ip || null, user_agent: (userAgent || '').slice(0, 500) || null }
      : { cookie_consent: false, client_ip: null, user_agent: null })
    .eq('ref_code', refCode)
}

export async function getRef(refCode: string): Promise<RefRow | null> {
  const { data } = await supabaseAdmin.from('site_ref_codes').select(REF_COLUMNS).eq('ref_code', refCode).maybeSingle()
  return (data as RefRow | null) ?? null
}

function lineReply(program: RefProgram, code: string): string {
  if (program === 'medcert') {
    return [
      'ขอบคุณที่ติดต่อโรงพยาบาลดับเบิ้ลยู เมดิคอลค่ะ',
      'แจ้งในแชทนี้ได้เลยว่าต้องการใบรับรองแพทย์แบบไหน หรือจะนำไปยื่นที่ใด (เช่น สมัครงาน ทำใบขับขี่ ยื่นราชการ) ทีมงานจะแจ้งรายละเอียดและค่าใช้จ่ายให้ค่ะ',
      '',
      `ตอนมาตรวจ แจ้งรหัส ${code} กับเจ้าหน้าที่ได้เลยค่ะ`,
      `หรือโทร ${HOSPITAL_PHONE}`,
    ].join('\n')
  }
  return [
    'ขอบคุณที่ติดต่อโรงพยาบาลดับเบิ้ลยู เมดิคอลค่ะ',
    'เล่าอาการหรือบริการที่ต้องการไว้ในแชทนี้ได้เลย ทีมงานจะช่วยนัดพบแพทย์ให้ค่ะ',
    'ถ้ามีอาการรุนแรง เช่น เจ็บหน้าอก หายใจลำบาก แขนขาอ่อนแรงทันที ให้โทร 1669 ทันทีนะคะ',
    '',
    `ตอนมาถึงโรงพยาบาล แจ้งรหัส ${code} กับเจ้าหน้าที่ได้เลยค่ะ`,
    `หรือโทร ${HOSPITAL_PHONE}`,
  ].join('\n')
}

// LINE webhook hook: the landing's LINE button pre-fills "… (MC-K7Q2M)".
// Creates the lead carrying the ad click ids, links it to the code, pings
// the sales group. Returns the reply to send, or null when the message holds
// no MC-/CL- code (the caller then carries on as usual).
export async function handleRefLineMessage(userId: string, text: string): Promise<string | null> {
  const parsed = parseRefCode(text)
  if (!parsed || !userId) return null

  const ref = await getRef(parsed.code)
  const program: RefProgram = ref?.program ?? parsed.program

  // Re-sent the same code (or tapped the button twice): one lead is enough.
  if (ref?.lead_id) return lineReply(program, parsed.code)

  const contact = await resolveContact({ line_user_id: userId }).catch(() => null)
  const utm = ref?.utm ?? {}
  const consent = ref?.cookie_consent ?? false
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert({
      first_name: `LINE (${REF_LABEL[program]})`,
      // Bot convention: phone carries the platform user id (column is how
      // the CRM finds a LINE user's rows); realPhone() in visit.ts skips it.
      phone: userId,
      service: program,
      source: REF_SOURCE[program],
      // Walked in with the code before ever messaging: the visit is already
      // recorded (and was reported as visit-ref-<code>). Carry it onto the
      // lead — set directly, not via markLeadVisited, so Meta gets no second
      // event — because the offline feed and /admin/growth read a linked
      // code's visit from its lead from now on.
      status: ref?.visited_at ? 'visited' : 'new',
      visited_at: ref?.visited_at ?? null,
      note: `${parsed.code}${ref ? '' : ' (ไม่พบรหัสในระบบ)'}: ${text.slice(0, 400)}`,
      line_user_id: userId,
      contact_id: contact?.id ?? null,
      gclid: ref?.gclid ?? null,
      fbc: ref?.fbc ?? null,
      fbp: ref?.fbp ?? null,
      client_ip: ref?.client_ip ?? null,
      user_agent: ref?.user_agent ?? null,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_term: utm.utm_term ?? null,
      utm_content: utm.utm_content ?? null,
      // Ad platforms only ever hear about this lead if the visitor accepted
      // the cookie banner on our page (same rule as every other lead path).
      consent_pdpa: consent,
      consent_at: consent ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  if (error) console.error('[ref] lead insert failed:', error.message)

  if (ref && lead) {
    await supabaseAdmin
      .from('site_ref_codes')
      .update({ lead_id: lead.id, line_contact_at: new Date().toISOString() })
      .eq('id', ref.id)
      .is('lead_id', null)
  }

  await notifyLineGroup({
    service: program,
    source: `หน้า${REF_LABEL[program]} (LINE)`,
    note: `${parsed.code}${ref?.gclid ? ' · มาจาก Google Ads' : ''}`,
  }).catch(() => undefined)

  return lineReply(program, parsed.code)
}

export type RefVisitResult =
  | { status: 'visited'; ref: RefRow }
  | { status: 'already'; ref: RefRow }
  | { status: 'not_found' }

// Idempotent: only the call that wins the visited_at stamp reports.
export async function markRefVisited(refCode: string, source: 'cert' | 'redeem'): Promise<RefVisitResult> {
  const { data, error } = await supabaseAdmin
    .from('site_ref_codes')
    .update({ visited_at: new Date().toISOString(), visit_source: source })
    .eq('ref_code', refCode)
    .is('visited_at', null)
    .select(REF_COLUMNS)
  if (error) throw new Error(`ref visit stamp: ${error.message}`)

  const ref = (data as RefRow[] | null)?.[0]
  if (!ref) {
    const existing = await getRef(refCode)
    return existing ? { status: 'already', ref: existing } : { status: 'not_found' }
  }

  try {
    if (ref.lead_id) {
      // Same pipeline step as a voucher redeem, but never moves a lead
      // backwards (a 'customer' stays a customer).
      await supabaseAdmin.from('leads').update({ status: 'visited' }).eq('id', ref.lead_id).in('status', ['new', 'contacted', 'qualified', 'booked'])
      await markLeadVisited(ref.lead_id)
    } else {
      await reportRefVisitToMeta(ref)
    }
  } catch (err) {
    // The stamp stands (the patient did come); a failed ad ping is logged,
    // never surfaced to the counter.
    console.error('[ref] visit report failed:', err)
  }
  return { status: 'visited', ref }
}

async function reportRefVisitToMeta(ref: RefRow): Promise<void> {
  if (!ref.cookie_consent) return
  if (!ref.fbc && !ref.fbp) return // nothing Meta could match it to
  await sendMetaEvents({
    events: [{ event_name: 'Purchase', event_id: `visit-ref-${ref.ref_code}` }],
    service: ref.program,
    action_source: 'physical_store',
    user: {
      external_id: ref.ref_code,
      ip: ref.client_ip ?? undefined,
      user_agent: ref.user_agent ?? undefined,
      fbc: ref.fbc ?? undefined,
      fbp: ref.fbp ?? undefined,
    },
    // Generic on purpose: a medical-certificate visit can be a sick-leave
    // note, so nothing about why they came reaches the ad platform.
    custom_data: { value: VISIT_VALUE_THB, currency: 'THB', content_name: 'Clinic Visit' },
  })
}

// Daily (post-visit cron): certificates staff tagged with a website code on
// cert.roogondee.com since the last few days → visits. Re-reading a window
// is harmless; markRefVisited only acts on the first stamp.
export async function syncRefVisitsFromCerts(now = Date.now(), lookbackDays = 3) {
  if (!wmedicalBridgeConfigured()) return { skipped: 'WMEDICAL_BRIDGE_SECRET not set' }
  const rows = await fetchWmedicalRefVisits(new Date(now - lookbackDays * 24 * 60 * 60 * 1000))
  let visited = 0, already = 0, unknown = 0
  for (const r of rows) {
    // The admin field holds only the code, so a run-together "MCK7Q2M" counts.
    const parsed = parseBareRefCode(r.ref_code)
    if (!parsed) { unknown++; continue }
    const res = await markRefVisited(parsed.code, 'cert')
    if (res.status === 'visited') visited++
    else if (res.status === 'already') already++
    else unknown++
  }
  return { checked: rows.length, visited, already, unknown }
}
