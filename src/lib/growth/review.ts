// Post-visit review request: one LINE message the day after a voucher is
// redeemed, asking for 1–5 stars via quick-reply buttons.
//
//   4–5 → thank you + W Medical's Google review link (GOOGLE_REVIEW_URL) +
//         the patient's referral link (REFERRAL_SERVICES only)
//   1–3 → apology + the sales LINE group is pinged to call back, AND the same
//         Google review link.
//
// The Google link goes to every rating on purpose. Sending it only to happy
// patients is "review gating" — Google's review policy forbids selectively
// soliciting positive reviews, and a listing caught doing it can have its
// reviews removed. The low-rating branch leads with the fix instead; it never
// withholds the link. Do not "optimise" this into a gate.
//
// Pillars are limited by REVIEW_SERVICES (config.ts) — never sensitive ones.

import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import { REVIEW_SERVICES, isIn } from './config'
import { replyLineMessages, textMessage, type LineMessage } from './line'
import { getOrCreateReferralCode, referralShareMessages } from './referral'

const GOOGLE_REVIEW_URL = (process.env.GOOGLE_REVIEW_URL || '').trim()

const SERVICE_NAME: Record<string, string> = {
  glp1: 'ตรวจน้ำตาล/HbA1c',
  ckd: 'ตรวจคัดกรองโรคไต',
}

const POSTBACK_RE = /^rv=([0-9a-f-]{36})&r=([1-5])$/i

export function reviewRequestMessage(voucherId: string, service: string, firstName?: string | null): LineMessage {
  const who = firstName && !/^LINE Lead$/i.test(firstName) ? `คุณ${firstName} ` : ''
  return {
    type: 'text',
    text: [
      `สวัสดีค่ะ ${who}ขอบคุณที่มา${SERVICE_NAME[service] || 'ตรวจสุขภาพ'}ที่ W Medical Hospital นะคะ`,
      'การบริการครั้งนี้เป็นอย่างไรบ้างคะ? กดให้คะแนนด้านล่างได้เลย (ใช้เวลา 1 วินาที)',
    ].join('\n'),
    quickReply: {
      items: [5, 4, 3, 2, 1].map(n => ({
        type: 'action',
        action: {
          type: 'postback',
          label: `${n} ดาว ${'★'.repeat(n)}`,
          data: `rv=${voucherId}&r=${n}`,
          displayText: `ให้ ${n} ดาว`,
        },
      })),
    },
  }
}

export function isReviewPostback(data: unknown): data is string {
  return typeof data === 'string' && POSTBACK_RE.test(data)
}

// Handles a star tap from the review request. Only the LINE user the voucher
// belongs to can rate it, and only once.
export async function handleReviewPostback(event: {
  replyToken?: string
  source?: { userId?: string }
  postback?: { data?: string }
}): Promise<void> {
  const match = POSTBACK_RE.exec(event.postback?.data || '')
  const userId = event.source?.userId
  if (!match || !userId || !event.replyToken) return
  const [, voucherId, ratingStr] = match
  const rating = Number(ratingStr)

  const { data: voucher } = await supabaseAdmin
    .from('vouchers')
    .select('id, service, review_rating, lead:leads(id, first_name, phone, line_user_id)')
    .eq('id', voucherId)
    .maybeSingle()
  const lead = voucher && (Array.isArray(voucher.lead) ? voucher.lead[0] : voucher.lead)
  if (!voucher || !lead || lead.line_user_id !== userId) return
  if (!isIn(REVIEW_SERVICES, voucher.service)) return

  if (voucher.review_rating != null) {
    await replyLineMessages(event.replyToken, [textMessage('ได้รับคะแนนของคุณแล้วค่ะ ขอบคุณมากนะคะ')])
    return
  }

  // Conditional on review_rating still null: a double tap can't rate twice
  // or fire the callback alert twice.
  const { data: updated } = await supabaseAdmin
    .from('vouchers')
    .update({ review_rating: rating, review_rated_at: new Date().toISOString() })
    .eq('id', voucher.id)
    .is('review_rating', null)
    .select('id')
  if (!updated?.length) return

  if (rating >= 4) {
    const messages: LineMessage[] = [textMessage(
      GOOGLE_REVIEW_URL
        ? `ขอบคุณมากค่ะ ดีใจที่ประทับใจนะคะ\nถ้าสะดวก ช่วยเล่าประสบการณ์สั้น ๆ บน Google ให้คนอื่นได้รู้ด้วยนะคะ\n${GOOGLE_REVIEW_URL}`
        : 'ขอบคุณมากค่ะ ดีใจที่ประทับใจนะคะ',
    )]
    const code = await getOrCreateReferralCode({
      leadId: lead.id, voucherId: voucher.id, service: voucher.service, lineUserId: userId,
    })
    if (code) messages.push(...referralShareMessages(code, voucher.service))
    await replyLineMessages(event.replyToken, messages)
    return
  }

  await replyLineMessages(event.replyToken, [textMessage([
    'ขอบคุณที่บอกเรานะคะ ขอโทษที่ครั้งนี้ยังไม่ดีพอ',
    'ทีมงานจะติดต่อกลับเพื่อสอบถามและแก้ไขให้ค่ะ หรือพิมพ์เล่าในแชตนี้ได้เลย',
    GOOGLE_REVIEW_URL ? `\nหากต้องการแสดงความคิดเห็นบน Google ก็ทำได้ที่\n${GOOGLE_REVIEW_URL}` : '',
  ].filter(Boolean).join('\n'))])
  await notifyLineGroup({
    name: lead.first_name || 'ลูกค้า',
    phone: /^0\d{8,9}$/.test(lead.phone || '') ? lead.phone : 'LINE เชื่อมแล้ว — ทักในแชท OA ได้เลย',
    service: voucher.service,
    source: ` รีวิวหลังมาตรวจ: ${rating} ดาว — โปรดโทรกลับ`,
    note: `ลูกค้าให้ ${rating}/5 ดาวหลังมาตรวจ — สอบถามปัญหาและแก้ไข`,
  })
}
