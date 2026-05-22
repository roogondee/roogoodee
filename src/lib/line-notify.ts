const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_NOTIFY_GROUP_ID = process.env.LINE_NOTIFY_GROUP_ID || ''

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD & PrEP',
  glp1: 'GLP-1 ลดน้ำหนัก',
  ckd: 'CKD โรคไต',
  foreign: 'แรงงานต่างด้าว',
  mens: 'สุขภาพชายวัย 40+',
  women: 'สุขภาพเพศหญิง',
  mind: 'สุขภาพจิต & ความสัมพันธ์',
  general: 'ทั่วไป',
  'chat-widget': 'Chat Widget',
}

const TIER_ICON: Record<string, string> = {
  urgent: '🚨 URGENT',
  hot: '🔥 HOT',
  warm: '⚡ Warm',
  cold: '❄️ Cold',
}

interface NotifyParams {
  name?: string
  phone?: string
  service: string
  source: string
  note?: string
}

async function pushLine(to: string, text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE push skipped: LINE_CHANNEL_ACCESS_TOKEN not set')
    return
  }
  if (!to) {
    console.warn('LINE push skipped: empty `to` target')
    return
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text }],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`LINE push failed: ${res.status} ${res.statusText} — ${body}`)
    }
  } catch (err) {
    console.error('LINE push error:', err)
  }
}

// Spec §5.3: direct voucher delivery to user (requires userId obtained
// via LINE OA follow event or linked through voucher-code message).
export async function pushVoucherToUser(userId: string, params: {
  name: string
  service: string
  code: string
  expires_at: string
  daysLeft?: number
}) {
  const label = SERVICE_LABELS[params.service] || params.service
  const expires = new Date(params.expires_at).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const urgency = typeof params.daysLeft === 'number' && params.daysLeft <= 3
    ? `\n\n⏰ เหลืออีก ${params.daysLeft} วันก่อนหมดอายุ`
    : ''
  const text = [
    `🎟 Voucher ${label}`,
    ``,
    `สวัสดีคุณ ${params.name}`,
    `🎫 รหัส: ${params.code}`,
    `📅 หมดอายุ: ${expires}`,
    `📍 W Medical Hospital สมุทรสาคร`,
    `📞 ติดต่อจองคิว: 034-XXX-XXX${urgency}`,
  ].join('\n')
  await pushLine(userId, text)
}

export async function notifyLineGroup(params: NotifyParams) {
  if (!LINE_NOTIFY_GROUP_ID) return

  const label = SERVICE_LABELS[params.service] || params.service
  const lines = [
    `🔔 Lead ใหม่จาก${params.source}`,
    `👤 ${params.name || '-'}`,
    `📞 ${params.phone || '-'}`,
    `📋 บริการ: ${label}`,
  ]
  if (params.note) {
    lines.push(`💬 "${params.note.slice(0, 100)}"`)
  }
  lines.push('', '👉 ดูทั้งหมด: https://www.roogondee.com/admin')

  await pushLine(LINE_NOTIFY_GROUP_ID, lines.join('\n'))
}

// First-time chatbot contact — fires the very first time a userId on a given
// platform messages us, regardless of whether keywords match a service. Keeps
// noise low (subsequent messages from the same user fall through to the
// keyword-only notifyLineGroup path) while ensuring no curious lead slips by.
interface FirstContactParams {
  platform: string
  userId: string
  service: string
  rawText: string
}

export async function notifyFirstChatbotContact(p: FirstContactParams) {
  if (!LINE_NOTIFY_GROUP_ID) return

  const label = SERVICE_LABELS[p.service] || p.service
  const lines = [
    `🆕 ลูกค้าใหม่ครั้งแรกจาก ${p.platform}`,
    `🆔 ${p.userId.slice(0, 16)}…`,
    `📋 ตรวจเจอ: ${label}`,
    `💬 "${p.rawText.slice(0, 120)}"`,
    '',
    '👉 ดูทั้งหมด: https://www.roogondee.com/admin',
  ]
  await pushLine(LINE_NOTIFY_GROUP_ID, lines.join('\n'))
}

// Booking cancellation — mirrors booking-notify shape but with cancel framing
// so the sales team can spot it in the group chat at a glance.
interface BookingCancelParams {
  name?: string
  phone?: string
  service: string
  date?: string
  time?: string
  reason?: string
  source?: string
}

export async function notifyBookingCancel(p: BookingCancelParams) {
  if (!LINE_NOTIFY_GROUP_ID) return

  const label = SERVICE_LABELS[p.service] || p.service
  const sep = '━━━━━━━━━━━━━━━'
  const when = [p.date, p.time].filter(Boolean).join(' ')
  const lines = [
    `❌ ยกเลิกคิว — ${label}`,
    sep,
    `👤 ${p.name || '-'}`,
    `📞 ${p.phone || '-'}`,
    when ? `🕐 ${when}` : null,
    p.reason ? `📝 เหตุผล: ${p.reason}` : null,
    sep,
    `🌐 ที่มา: ${p.source || 'booking-page'}`,
    `🔧 https://www.roogondee.com/admin`,
  ].filter((l): l is string => Boolean(l))

  await pushLine(LINE_NOTIFY_GROUP_ID, lines.join('\n'))
}

interface VoucherLeadNotifyParams {
  name?: string
  phone?: string
  line_id?: string
  email?: string
  service: string
  tier: 'urgent' | 'hot' | 'warm' | 'cold'
  score: number
  voucher_code: string
  voucher_expires_at?: string
  reasons?: string[]
  answer_summary?: string[]
}

// Lead handoff card to W Medical LINE group — contains everything
// the team needs to contact the customer without opening admin.
export async function notifyLeadToSale(p: VoucherLeadNotifyParams) {
  if (!LINE_NOTIFY_GROUP_ID) return

  const label = SERVICE_LABELS[p.service] || p.service
  const tierLabel = TIER_ICON[p.tier] || p.tier
  const expires = p.voucher_expires_at
    ? new Date(p.voucher_expires_at).toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null
  const daysLeft = p.voucher_expires_at
    ? Math.ceil((new Date(p.voucher_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null

  const sep = '━━━━━━━━━━━━━━━'
  const lines: Array<string | null> = [
    `${tierLabel} Lead ใหม่ — ${label}`,
    '',
    `👤 ${p.name || '-'}`,
    `📞 ${p.phone || '-'}`,
    p.line_id ? `💬 LINE: ${p.line_id}` : null,
    p.email ? `📧 ${p.email}` : null,
    sep,
    `🎟 Voucher: ${p.voucher_code}`,
    expires ? `⏰ หมดอายุ: ${expires}${daysLeft !== null ? ` (เหลือ ${daysLeft} วัน)` : ''}` : null,
    sep,
    `📊 Score ${p.score} · ${p.tier.toUpperCase()}`,
    p.reasons && p.reasons.length > 0 ? p.reasons.slice(0, 5).map(r => `  • ${r}`).join('\n') : null,
  ]

  if (p.answer_summary && p.answer_summary.length > 0) {
    lines.push('', '📝 ข้อมูล Quiz:')
    for (const s of p.answer_summary) lines.push(`  • ${s}`)
  }

  lines.push(
    '',
    '📍 W Medical Hospital',
    'https://maps.google.com/?q=W+Medical+Hospital+Samut+Sakhon',
    '🔧 https://www.roogondee.com/admin',
  )

  await pushLine(LINE_NOTIFY_GROUP_ID, lines.filter(l => l !== null).join('\n'))
}

// ─────────────────────────────────────────────────────────────────
// Mind pillar — crisis flow (self_harm_check ∈ {sometimes, often})
// Operationalizes docs/mind-crisis-sop.md. Two surfaces:
//   1. Sales team LINE Group — heavily-formatted alert with 1323
//      reminder, SOP link, and "first contact" prompt to drive
//      response within the 30-min SLA.
//   2. Lead's personal LINE (if line_id provided) — gentle auto-
//      reply that immediately surfaces 1323 so the lead has a
//      safety net even if our team is delayed.
//
// MUST NOT be relaxed downstream — this is the entire pillar's
// safety net.

/** LINE Group alert for mind+urgent leads — supersedes notifyLeadToSale */
export async function notifyMindCrisisToSale(p: VoucherLeadNotifyParams) {
  if (!LINE_NOTIFY_GROUP_ID) return

  const sep = '━━━━━━━━━━━━━━━'
  const lines: Array<string | null> = [
    '🚨🚨🚨 MIND — URGENT CRISIS 🚨🚨🚨',
    'self_harm flag triggered — first contact ภายใน 30 นาที',
    sep,
    `👤 ${p.name || '-'}`,
    `📞 ${p.phone || '-'}`,
    p.line_id ? `💬 LINE: ${p.line_id}` : null,
    p.email ? `📧 ${p.email}` : null,
    sep,
    `🎟 Voucher: ${p.voucher_code}`,
    `📊 Score ${p.score} · ${p.tier.toUpperCase()}`,
    p.reasons && p.reasons.length > 0 ? p.reasons.slice(0, 5).map(r => `  • ${r}`).join('\n') : null,
  ]

  if (p.answer_summary && p.answer_summary.length > 0) {
    lines.push('', '📝 Quiz answers:')
    for (const s of p.answer_summary) lines.push(`  • ${s}`)
  }

  lines.push(
    '',
    sep,
    '⚡ FIRST CONTACT REMINDER:',
    '  • อย่าตัดสิน / minimize / ให้คำแนะนำคลินิก',
    '  • ฟัง 1-2 นาที, validate, ถาม safety check',
    '  • Surface สายด่วน 1323 (กรมสุขภาพจิต ฟรี 24 ชม.)',
    '  • หากปฏิเสธ + ยังในอันตราย → ขอเบอร์ญาติ + แจ้ง supervisor',
    '  • Log ใน leads.note ทุก contact',
    '',
    '📖 SOP เต็ม: github.com/roogondee/roogoodee/blob/main/docs/mind-crisis-sop.md',
    '🔧 https://www.roogondee.com/admin',
  )

  await pushLine(LINE_NOTIFY_GROUP_ID, lines.filter(l => l !== null).join('\n'))
}

/** Auto-reply to lead's personal LINE for mind+urgent — surfaces 1323 immediately */
export async function pushMindCrisisReplyToUser(lineUserId: string, params: {
  name: string
  voucher_code: string
}) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return
  const text = [
    `สวัสดีค่ะคุณ ${params.name}`,
    ``,
    `ขอบคุณที่กล้าบอกเราเรื่องที่คุณกำลังเจออยู่ — เราเห็นข้อมูลของคุณแล้ว และทีมจะติดต่อกลับโดยเร็วที่สุดค่ะ`,
    ``,
    `🆘 หากตอนนี้ความรู้สึกหนักมาก หรือคิดทำร้ายตัวเอง`,
    `โปรดโทรสายด่วนสุขภาพจิต กรมสุขภาพจิต`,
    ``,
    `📞 1323`,
    `(โทรฟรี 24 ชั่วโมง เป็นความลับ)`,
    ``,
    `มีผู้เชี่ยวชาญพร้อมรับฟังคุณตอนนี้ค่ะ`,
    ``,
    `คุณไม่ได้อยู่คนเดียว 🌱`,
    ``,
    `— ทีม Roogondee`,
    `🎟 ${params.voucher_code}`,
  ].join('\n')
  await pushLine(lineUserId, text)
}
