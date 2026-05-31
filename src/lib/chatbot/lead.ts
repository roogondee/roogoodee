import { supabaseAdmin } from '@/lib/supabase'
import { notifyFirstChatbotContact, notifyLineGroup } from '@/lib/line-notify'
import { resolveContact } from '@/lib/crm/contacts'
import type { ContactKeys } from '@/lib/crm/types'
import type { DetectedService } from './service-detect'

export type BotPlatform = 'facebook-bot' | 'line-bot' | 'instagram-bot'

const PLATFORM_LABELS: Record<BotPlatform, { firstName: string; notifySource: string; idColumn: keyof ContactKeys }> = {
  'facebook-bot':  { firstName: 'FB Messenger', notifySource: 'Facebook Messenger', idColumn: 'facebook_user_id' },
  'line-bot':      { firstName: 'LINE Bot',     notifySource: 'LINE Bot',           idColumn: 'line_user_id' },
  'instagram-bot': { firstName: 'IG Direct',    notifySource: 'Instagram DM',       idColumn: 'instagram_user_id' },
}

export async function captureBotLead(params: {
  platform: BotPlatform
  userId: string
  service: DetectedService
  rawText: string
}): Promise<void> {
  const { platform, userId, service, rawText } = params
  const { firstName, notifySource, idColumn } = PLATFORM_LABELS[platform]

  // Unify this messaging identity into a single cross-pillar CRM contact so
  // the userId is persisted for later push (not just dumped in leads.phone).
  const contact = await resolveContact({ [idColumn]: userId } as ContactKeys)

  // First-contact check before insert — `leads.phone` carries the platform
  // userId for bot rows, so "no prior row from this userId on this platform"
  // means we've never heard from them before.
  const { data: prior } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('phone', userId)
    .eq('source', platform)
    .limit(1)
  const isFirstContact = !prior || prior.length === 0

  // Await so writes & LINE push complete before the webhook lambda freezes.
  const { error } = await supabaseAdmin.from('leads').insert([{
    first_name: firstName,
    phone: userId,
    service,
    note: rawText.slice(0, 500),
    source: platform,
    status: 'new',
    contact_id: contact?.id ?? null,
    [idColumn]: userId,
  }])
  if (error) console.error('captureBotLead insert failed:', error)

  // Two alert paths, mutually exclusive to avoid double-pinging the group:
  //   1. First-time contact → always ping (even for general chit-chat) so we
  //      never miss a curious lead.
  //   2. Repeat contact with a detected service → ping with the existing
  //      service-tagged format. Repeat general messages stay silent.
  if (isFirstContact) {
    try {
      await notifyFirstChatbotContact({
        platform: notifySource,
        userId,
        service,
        rawText,
      })
    } catch (err) {
      console.error('captureBotLead notifyFirstChatbotContact failed:', err)
    }
  } else if (service !== 'general') {
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
