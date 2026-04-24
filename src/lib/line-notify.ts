const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_NOTIFY_GROUP_ID = process.env.LINE_NOTIFY_GROUP_ID || ''

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD & PrEP',
  glp1: 'GLP-1 ลดน้ำหนัก',
  ckd: 'CKD โรคไต',
  foreign: 'แรงงานต่างด้าว',
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
  service: string
  tier: 'urgent' | 'hot' | 'warm' | 'cold'
  score: number
  voucher_code: string
  reasons?: string[]
}

// Sales-team group notification when a quiz lead produces a voucher.
export async function notifyLeadToSale(p: VoucherLeadNotifyParams) {
  if (!LINE_NOTIFY_GROUP_ID) return

  const label = SERVICE_LABELS[p.service] || p.service
  const tierLabel = TIER_ICON[p.tier] || p.tier
  const lines = [
    `${tierLabel} Lead (${p.service.toUpperCase()})`,
    `👤 ${p.name || '-'}`,
    `📞 ${p.phone || '-'}`,
    p.line_id ? `💬 LINE: ${p.line_id}` : null,
    `📋 ${label}`,
    `🎟 ${p.voucher_code}`,
    `📊 คะแนน ${p.score}`,
    p.reasons && p.reasons.length > 0 ? `• ${p.reasons.slice(0, 3).join(' • ')}` : null,
    '',
    '👉 https://www.roogondee.com/admin',
  ].filter(Boolean) as string[]

  await pushLine(LINE_NOTIFY_GROUP_ID, lines.join('\n'))
}
