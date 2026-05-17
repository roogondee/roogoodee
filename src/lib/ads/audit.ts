import { supabaseAdmin } from '@/lib/supabase'

export type AdPlatform = 'meta' | 'tiktok'
export type AdAction =
  | 'launch'
  | 'pause'
  | 'resume'
  | 'budget_update'
  | 'insights'
  | 'list'

export interface LogAdActionInput {
  platform: AdPlatform
  action: AdAction
  service?: string
  campaign_id?: string
  adset_id?: string
  ad_id?: string
  daily_budget_thb?: number
  dry_run?: boolean
  initiated_by?: string
  request?: unknown
  response?: unknown
  ok?: boolean
  error?: string
}

export async function logAdAction(input: LogAdActionInput): Promise<void> {
  await supabaseAdmin.from('ad_actions').insert({
    platform: input.platform,
    action: input.action,
    service: input.service,
    campaign_id: input.campaign_id,
    adset_id: input.adset_id,
    ad_id: input.ad_id,
    daily_budget_thb: input.daily_budget_thb,
    dry_run: input.dry_run ?? false,
    initiated_by: input.initiated_by ?? 'claude',
    request: input.request ?? null,
    response: input.response ?? null,
    ok: input.ok ?? true,
    error: input.error,
  })
}

export async function countLaunchesToday(platform: AdPlatform): Promise<number> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const { count } = await supabaseAdmin
    .from('ad_actions')
    .select('id', { count: 'exact', head: true })
    .eq('platform', platform)
    .eq('action', 'launch')
    .eq('ok', true)
    .eq('dry_run', false)
    .gte('created_at', since.toISOString())
  return count ?? 0
}
