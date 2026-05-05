const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_NOTIFY_GROUP_ID = process.env.LINE_NOTIFY_GROUP_ID || ''

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD & PrEP',
  glp1: 'GLP-1 ลดน้ำหนัก',
  ckd: 'CKD โรคไต',
  foreign: 'แรงงานต่างด้าว',
  annual: 'ตรวจสุขภาพประจำปี',
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
  if (!LINE_CHANNEL_ACCESS_TOKEN) return
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
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
