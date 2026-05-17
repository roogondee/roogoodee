import { NextRequest, NextResponse } from 'next/server'
import {
  createCampaign,
  pauseCampaign,
  resumeCampaign,
  updateCampaignBudget,
  listActiveCampaigns,
  totalActiveDailyBudgetThb,
  getCampaignInsights,
  type MetaObjective,
} from '@/lib/ads/meta'
import { assertBudgetAllowed } from '@/lib/ads/guardrails'
import { logAdAction, countLaunchesToday } from '@/lib/ads/audit'

// POST /api/ads
// Auth: Bearer ADS_CONTROL_SECRET (separate from CRON_SECRET so cron tasks
// can't accidentally launch ads).
//
// Body:
//   { platform: 'meta', action: 'launch' | 'pause' | 'resume' | 'budget_update' | 'insights' | 'list',
//     service?, name?, objective?, dailyBudgetThb?, campaignId?, datePreset?, dryRun? }

export const runtime = 'nodejs'

interface AdsRequest {
  platform: 'meta' | 'tiktok'
  action: 'launch' | 'pause' | 'resume' | 'budget_update' | 'insights' | 'list'
  service?: 'glp1' | 'std' | 'ckd' | 'foreign' | 'mens'
  name?: string
  objective?: MetaObjective
  dailyBudgetThb?: number
  campaignId?: string
  datePreset?: string
  dryRun?: boolean
  initiatedBy?: string
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.ADS_CONTROL_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AdsRequest
  try {
    body = (await req.json()) as AdsRequest
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (body.platform !== 'meta') {
    return NextResponse.json(
      { error: 'tiktok_not_implemented: only platform=meta is wired up so far' },
      { status: 400 }
    )
  }

  const dryRun = body.dryRun ?? false
  const initiatedBy = body.initiatedBy ?? 'claude'

  try {
    switch (body.action) {
      case 'list': {
        const campaigns = await listActiveCampaigns()
        await logAdAction({
          platform: 'meta',
          action: 'list',
          initiated_by: initiatedBy,
          response: { count: campaigns.length },
        })
        return NextResponse.json({ ok: true, campaigns })
      }

      case 'launch': {
        if (!body.name || !body.objective || !body.dailyBudgetThb || !body.service) {
          return NextResponse.json(
            { error: 'missing_fields: name, objective, dailyBudgetThb, service all required' },
            { status: 400 }
          )
        }
        const [activeTotal, launchesToday] = await Promise.all([
          totalActiveDailyBudgetThb(),
          countLaunchesToday('meta'),
        ])
        assertBudgetAllowed({
          dailyBudgetThb: body.dailyBudgetThb,
          currentActiveTotalThb: activeTotal,
          launchesToday,
        })

        if (dryRun) {
          await logAdAction({
            platform: 'meta',
            action: 'launch',
            service: body.service,
            daily_budget_thb: body.dailyBudgetThb,
            dry_run: true,
            initiated_by: initiatedBy,
            request: body,
            response: { activeTotal, launchesToday, would_launch: true },
          })
          return NextResponse.json({ ok: true, dryRun: true, activeTotal, launchesToday })
        }

        const result = await createCampaign({
          name: body.name,
          objective: body.objective,
          dailyBudgetThb: body.dailyBudgetThb,
          service: body.service,
          status: 'PAUSED', // always launch paused; humans must flip to ACTIVE
        })
        await logAdAction({
          platform: 'meta',
          action: 'launch',
          service: body.service,
          campaign_id: result.id,
          daily_budget_thb: body.dailyBudgetThb,
          initiated_by: initiatedBy,
          request: body,
          response: result,
        })
        return NextResponse.json({
          ok: true,
          campaignId: result.id,
          status: 'PAUSED',
          note: 'Campaign created in PAUSED state. Add ad set + creative, then activate manually.',
        })
      }

      case 'pause': {
        if (!body.campaignId) {
          return NextResponse.json({ error: 'missing_fields: campaignId' }, { status: 400 })
        }
        const r = await pauseCampaign(body.campaignId)
        await logAdAction({
          platform: 'meta',
          action: 'pause',
          campaign_id: body.campaignId,
          initiated_by: initiatedBy,
          request: body,
          response: r,
        })
        return NextResponse.json({ ok: true, ...r })
      }

      case 'resume': {
        if (!body.campaignId) {
          return NextResponse.json({ error: 'missing_fields: campaignId' }, { status: 400 })
        }
        const r = await resumeCampaign(body.campaignId)
        await logAdAction({
          platform: 'meta',
          action: 'resume',
          campaign_id: body.campaignId,
          initiated_by: initiatedBy,
          request: body,
          response: r,
        })
        return NextResponse.json({ ok: true, ...r })
      }

      case 'budget_update': {
        if (!body.campaignId || !body.dailyBudgetThb) {
          return NextResponse.json(
            { error: 'missing_fields: campaignId, dailyBudgetThb' },
            { status: 400 }
          )
        }
        const activeTotal = await totalActiveDailyBudgetThb()
        assertBudgetAllowed({
          dailyBudgetThb: body.dailyBudgetThb,
          currentActiveTotalThb: activeTotal,
          launchesToday: 0,
        })
        const r = await updateCampaignBudget(body.campaignId, body.dailyBudgetThb)
        await logAdAction({
          platform: 'meta',
          action: 'budget_update',
          campaign_id: body.campaignId,
          daily_budget_thb: body.dailyBudgetThb,
          initiated_by: initiatedBy,
          request: body,
          response: r,
        })
        return NextResponse.json({ ok: true, ...r })
      }

      case 'insights': {
        if (!body.campaignId) {
          return NextResponse.json({ error: 'missing_fields: campaignId' }, { status: 400 })
        }
        const insights = await getCampaignInsights(body.campaignId, body.datePreset || 'last_7d')
        await logAdAction({
          platform: 'meta',
          action: 'insights',
          campaign_id: body.campaignId,
          initiated_by: initiatedBy,
          request: body,
          response: insights,
        })
        return NextResponse.json({ ok: true, insights })
      }

      default:
        return NextResponse.json({ error: `unknown_action: ${body.action}` }, { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await logAdAction({
      platform: body.platform,
      action: body.action,
      service: body.service,
      campaign_id: body.campaignId,
      daily_budget_thb: body.dailyBudgetThb,
      dry_run: dryRun,
      initiated_by: initiatedBy,
      request: body,
      ok: false,
      error: msg,
    })
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
