// Patient referral: a patient who rated their visit 4–5 stars gets a personal
// link to pass on. The friend lands in the normal quiz funnel (and the normal
// monthly voucher quota) — referral adds attribution, not a new offer.
//
// What the friend is told they get is the standing free-screening line each
// pillar already advertises. What the REFERRER gets is deliberately not
// hardcoded: no reward has been agreed with W Medical, so the share message
// only mentions one when REFERRAL_REWARD_TEXT is set, and the wording must be
// something staff can honour without knowing whether a friend visited.

import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { REFERRAL_SERVICES, isIn } from './config'
import { textMessage, type LineMessage } from './line'

const SITE_BASE = (process.env.SITE_BASE_URL || 'https://roogondee.com').replace(/\/$/, '')
const REWARD_TEXT = (process.env.REFERRAL_REWARD_TEXT || '').trim()

// Same alphabet as voucher codes (no 0/1/O/I). The REF segment never matches
// the chat bot's VOUCHER_REGEX, so a pasted referral code is not mistaken
// for a voucher.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const REFERRAL_CODE_RE = /^RGD-REF-[A-Z2-9]{6}$/

function newCode(): string {
  const bytes = randomBytes(6)
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length]
  return `RGD-REF-${s}`
}

// What the friend is offered — the existing free-screening line for the
// pillar, never anything new.
const FRIEND_OFFER: Record<string, string> = {
  glp1: 'ตรวจน้ำตาล FBS + HbA1c ฟรี',
  ckd: 'ตรวจโปรตีนในปัสสาวะ (คัดกรองโรคไต) ฟรี',
}

const SERVICE_NAME: Record<string, string> = {
  glp1: 'GLP-1 / เบาหวาน-น้ำหนัก',
  ckd: 'โรคไต',
}

export function referralUrl(code: string): string {
  return `${SITE_BASE}/r/${code}`
}

export async function getOrCreateReferralCode(p: {
  leadId: string
  voucherId: string | null
  service: string
  lineUserId: string | null
}): Promise<string | null> {
  if (!isIn(REFERRAL_SERVICES, p.service)) return null

  const { data: existing } = await supabaseAdmin
    .from('referral_codes')
    .select('code')
    .eq('lead_id', p.leadId)
    .eq('service', p.service)
    .maybeSingle()
  if (existing?.code) return existing.code as string

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode()
    const { error } = await supabaseAdmin.from('referral_codes').insert({
      code,
      lead_id: p.leadId,
      voucher_id: p.voucherId,
      service: p.service,
      line_user_id: p.lineUserId,
    })
    if (!error) return code
    // 23505 on the (lead_id, service) index = a concurrent tap won; reuse it.
    const { data: again } = await supabaseAdmin
      .from('referral_codes').select('code').eq('lead_id', p.leadId).eq('service', p.service).maybeSingle()
    if (again?.code) return again.code as string
  }
  return null
}

export function referralShareMessages(code: string, service: string): LineMessage[] {
  const url = referralUrl(code)
  const offer = FRIEND_OFFER[service] || 'ตรวจคัดกรองฟรี'
  const shareText = [
    `ลองทำแบบประเมินสุขภาพ${SERVICE_NAME[service] ? ` (${SERVICE_NAME[service]})` : ''} 2 นาที`,
    `รับสิทธิ์${offer} ที่ W Medical Hospital (มีจำนวนจำกัดต่อเดือน)`,
    url,
  ].join('\n')

  return [
    textMessage([
      'มีคนใกล้ตัวที่ควรตรวจเหมือนกันไหมคะ?',
      `ส่งลิงก์นี้ให้เขาได้เลย เขาจะได้สิทธิ์${offer}เหมือนคุณ (มีจำนวนจำกัดต่อเดือน)`,
      REWARD_TEXT ? `\nสิทธิ์สำหรับคุณ: ${REWARD_TEXT}` : '',
    ].filter(Boolean).join('\n')),
    {
      type: 'template',
      altText: `แชร์สิทธิ์ตรวจฟรีให้เพื่อน: ${url}`,
      template: {
        type: 'buttons',
        text: `โค้ดของคุณ: ${code}`,
        actions: [
          { type: 'uri', label: 'แชร์ให้เพื่อนใน LINE', uri: `https://line.me/R/share?text=${encodeURIComponent(shareText)}` },
          { type: 'uri', label: 'เปิดลิงก์', uri: url },
        ],
      },
    },
  ]
}

// There is deliberately no "your friend came in" push to the referrer: that
// would tell one person another person's clinic visit — health data under
// PDPA — without the friend's consent. Referral results are visible to the
// team on /admin/growth only.
