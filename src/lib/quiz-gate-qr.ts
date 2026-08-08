import QRCode from 'qrcode'
import { liffQuizUrl } from '@/lib/liff-links'
import type { Service } from '@/types'

// Desktop visitors can't follow a liff.line.me link (LINE is a phone app), so
// the gate offers a QR instead. Rendered server-side at build time — keeps the
// qrcode lib out of the client bundle.
export async function quizGateQr(service: Service): Promise<string | undefined> {
  try {
    return await QRCode.toDataURL(
      liffQuizUrl({ service, utm_source: 'web', utm_medium: 'quiz_gate_qr' }),
      { margin: 1, width: 320, color: { dark: '#1B4332', light: '#FFFFFF' } },
    )
  } catch (err) {
    console.error('quizGateQr failed:', err)
    return undefined
  }
}
