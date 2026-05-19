import { supabaseAdmin } from '@/lib/supabase'
import { notifyLineGroup } from '@/lib/line-notify'
import type { DetectedService } from './service-detect'

export type BotPlatform = 'facebook-bot' | 'line-bot' | 'instagram-bot'

const PLATFORM_LABELS: Record<BotPlatform, { firstName: string; notifySource: string }> = {
  'facebook-bot':  { firstName: 'FB Messenger', notifySource: 'Facebook Messenger' },
  'line-bot':      { firstName: 'LINE Bot',     notifySource: 'LINE Bot' },
  'instagram-bot': { firstName: 'IG Direct',    notifySource: 'Instagram DM' },
}

export async function captureBotLead(params: {
  platform: BotPlatform
  userId: string
  service: DetectedService
  rawText: string
}): Promise<void> {
  const { platform, userId, service, rawText } = params
  const { firstName, notifySource } = PLATFORM_LABELS[platform]

  // Await so writes & LINE push complete before the webhook lambda freezes.
  const { error } = await supabaseAdmin.from('leads').insert([{
    first_name: firstName,
    phone: userId,
    service,
    note: rawText.slice(0, 500),
    source: platform,
    status: 'new',
  }])
  if (error) console.error('captureBotLead insert failed:', error)

  if (service !== 'general') {
    try {
      await notifyLineGroup({
        service,
        source: notifySource,
        note: rawText,
      })
    } catch (err) {
      console.error('captureBotLead notifyLineGroup failed:', err)
    }
  }
}
