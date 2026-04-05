import { Resend } from 'resend'

const NOTIFY_TO = process.env.NOTIFY_EMAIL || 'team@roogondee.com'

const SERVICE_LABELS: Record<string, string> = {
  std: 'STD & PrEP HIV',
  glp1: 'GLP-1 ลดน้ำหนัก',
  ckd: 'CKD โรคไต',
  foreign: 'แรงงานต่างด้าว',
  general: 'ทั่วไป',
}

export async function sendLeadNotification(lead: {
  name: string
  phone: string
  service: string
  source?: string
  note?: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const serviceLabel = SERVICE_LABELS[lead.service] || lead.service
  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  try {
    await resend.emails.send({
      from: 'รู้ก่อนดี <noreply@roogondee.com>',
      to: [NOTIFY_TO],
      subject: `🌿 Lead ใหม่: ${lead.name} — ${serviceLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #f8faf8; padding: 24px; border-radius: 12px;">
          <h2 style="color: #2D4A3E; margin-top: 0;">🌿 Lead ใหม่เข้ามาแล้ว!</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; width: 100px;">ชื่อ</td><td style="padding: 8px 0; font-weight: bold; color: #222;">${lead.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">เบอร์</td><td style="padding: 8px 0;"><a href="tel:${lead.phone}" style="color: #2D4A3E; font-weight: bold; font-size: 18px;">${lead.phone}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #666;">บริการ</td><td style="padding: 8px 0;">${serviceLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">ช่องทาง</td><td style="padding: 8px 0;">${lead.source || 'website'}</td></tr>
            ${lead.note ? `<tr><td style="padding: 8px 0; color: #666; vertical-align: top;">หมายเหตุ</td><td style="padding: 8px 0; font-size: 13px; color: #555;">${lead.note}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; color: #666;">เวลา</td><td style="padding: 8px 0; font-size: 13px; color: #888;">${now}</td></tr>
          </table>
          <div style="margin-top: 20px; text-align: center;">
            <a href="https://roogondee.com/admin" style="background: #2D4A3E; color: white; padding: 10px 24px; border-radius: 20px; text-decoration: none; font-size: 14px;">ดู Admin Dashboard</a>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}
