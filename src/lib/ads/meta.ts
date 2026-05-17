// Meta (Facebook/Instagram) Marketing API client — minimal surface needed for
// automated launch / pause / budget / insights. Uses Graph API v19.0.
//
// Auth: System User access token (not Page token). Set META_ADS_ACCESS_TOKEN
// + META_AD_ACCOUNT_ID (e.g. "act_123456789") in env.

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

const TOKEN = process.env.META_ADS_ACCESS_TOKEN || ''
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID || ''
const PAGE_ID = process.env.META_PAGE_ID || process.env.FB_PAGE_ID || ''
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || ''

function ensureCreds() {
  if (!TOKEN) throw new Error('config_missing: META_ADS_ACCESS_TOKEN not set')
  if (!AD_ACCOUNT) throw new Error('config_missing: META_AD_ACCOUNT_ID not set')
  if (!AD_ACCOUNT.startsWith('act_')) {
    throw new Error('config_invalid: META_AD_ACCOUNT_ID must start with "act_"')
  }
}

async function graph<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown> } = {}
): Promise<T> {
  ensureCreds()
  const url = new URL(`${GRAPH_BASE}${path}`)
  const method = init.method ?? 'GET'

  let body: string | undefined
  if (method === 'GET') {
    url.searchParams.set('access_token', TOKEN)
    for (const [k, v] of Object.entries(init.body ?? {})) {
      url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
  } else {
    const params = new URLSearchParams()
    params.set('access_token', TOKEN)
    for (const [k, v] of Object.entries(init.body ?? {})) {
      params.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
    body = params.toString()
  }

  const res = await fetch(url.toString(), {
    method,
    body,
    headers: method === 'GET' ? {} : { 'content-type': 'application/x-www-form-urlencoded' },
  })
  const json = (await res.json()) as { error?: { message: string; type: string; code: number } } & T
  if (!res.ok || json.error) {
    throw new Error(`meta_api_error: ${json.error?.message || res.statusText}`)
  }
  return json
}

export type MetaObjective =
  | 'OUTCOME_LEADS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_AWARENESS'

export interface LaunchCampaignInput {
  name: string
  objective: MetaObjective
  dailyBudgetThb: number
  service: string // for naming convention
  status?: 'PAUSED' | 'ACTIVE'
}

export async function createCampaign(input: LaunchCampaignInput): Promise<{ id: string }> {
  return graph<{ id: string }>(`/${AD_ACCOUNT}/campaigns`, {
    method: 'POST',
    body: {
      name: input.name,
      objective: input.objective,
      status: input.status ?? 'PAUSED',
      special_ad_categories: '[]',
      buying_type: 'AUCTION',
      daily_budget: String(Math.round(input.dailyBudgetThb * 100)), // satang
    },
  })
}

export async function pauseCampaign(campaignId: string): Promise<{ success: boolean }> {
  return graph<{ success: boolean }>(`/${campaignId}`, {
    method: 'POST',
    body: { status: 'PAUSED' },
  })
}

export async function resumeCampaign(campaignId: string): Promise<{ success: boolean }> {
  return graph<{ success: boolean }>(`/${campaignId}`, {
    method: 'POST',
    body: { status: 'ACTIVE' },
  })
}

export async function updateCampaignBudget(
  campaignId: string,
  dailyBudgetThb: number
): Promise<{ success: boolean }> {
  return graph<{ success: boolean }>(`/${campaignId}`, {
    method: 'POST',
    body: { daily_budget: String(Math.round(dailyBudgetThb * 100)) },
  })
}

export interface CampaignSummary {
  id: string
  name: string
  status: string
  daily_budget?: string
  effective_status?: string
}

export async function listActiveCampaigns(): Promise<CampaignSummary[]> {
  const json = await graph<{ data: CampaignSummary[] }>(`/${AD_ACCOUNT}/campaigns`, {
    body: {
      fields: 'id,name,status,daily_budget,effective_status',
      effective_status: '["ACTIVE","PAUSED"]',
      limit: '100',
    },
  })
  return json.data ?? []
}

export async function totalActiveDailyBudgetThb(): Promise<number> {
  const campaigns = await listActiveCampaigns()
  let totalSatang = 0
  for (const c of campaigns) {
    if (c.effective_status === 'ACTIVE' && c.daily_budget) {
      totalSatang += Number(c.daily_budget) || 0
    }
  }
  return totalSatang / 100
}

export interface CampaignInsights {
  campaign_id: string
  impressions?: string
  clicks?: string
  spend?: string
  ctr?: string
  cpc?: string
  actions?: Array<{ action_type: string; value: string }>
}

export async function getCampaignInsights(
  campaignId: string,
  datePreset = 'last_7d'
): Promise<CampaignInsights | null> {
  const json = await graph<{ data: CampaignInsights[] }>(`/${campaignId}/insights`, {
    body: {
      date_preset: datePreset,
      fields: 'impressions,clicks,spend,ctr,cpc,actions',
    },
  })
  return json.data?.[0] ?? null
}

export const META_CONFIG = { AD_ACCOUNT, PAGE_ID, PIXEL_ID } as const
