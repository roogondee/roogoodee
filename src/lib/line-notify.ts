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

interface NotifyParams {
  name?: string
  phone?: string
  service: string
  source: string
  note?: string
}

export async function notifyLineGroup(params: NotifyParams) {
  if (!LINE_NOTIFY_GROUP_ID || !LINE_CHANNEL_ACCESS_TOKEN) return

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

  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_NOTIFY_GROUP_ID,
        messages: [{ type: 'text', text: lines.join('\n') }],
      }),
    })
  } catch (err) {
    console.error('LINE group notify error:', err)
  }
}
