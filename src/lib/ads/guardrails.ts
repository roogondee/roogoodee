// Budget guardrails for automated ad actions. Every launch / budget_update
// must pass through `assertBudgetAllowed` so a runaway prompt or buggy cron
// can't drain the ad account.
//
// All amounts in THB. Meta/TikTok APIs use minor units — convert at the edge.

export const AD_LIMITS = {
  // Per-campaign daily budget cap (THB)
  maxDailyBudgetPerCampaignThb: Number(process.env.ADS_MAX_DAILY_BUDGET_THB ?? 500),
  // Sum of all active daily budgets across the account (THB)
  maxDailyBudgetTotalThb: Number(process.env.ADS_MAX_DAILY_BUDGET_TOTAL_THB ?? 2000),
  // Max campaigns Claude can launch in one calendar day
  maxLaunchesPerDay: Number(process.env.ADS_MAX_LAUNCHES_PER_DAY ?? 3),
} as const

export interface BudgetCheckInput {
  dailyBudgetThb: number
  currentActiveTotalThb: number
  launchesToday: number
}

export function assertBudgetAllowed(input: BudgetCheckInput): void {
  if (input.dailyBudgetThb <= 0) {
    throw new Error('budget_invalid: dailyBudgetThb must be > 0')
  }
  if (input.dailyBudgetThb > AD_LIMITS.maxDailyBudgetPerCampaignThb) {
    throw new Error(
      `budget_exceeds_per_campaign_cap: ${input.dailyBudgetThb} > ${AD_LIMITS.maxDailyBudgetPerCampaignThb} THB. ` +
        `Raise ADS_MAX_DAILY_BUDGET_THB to override.`
    )
  }
  const newTotal = input.currentActiveTotalThb + input.dailyBudgetThb
  if (newTotal > AD_LIMITS.maxDailyBudgetTotalThb) {
    throw new Error(
      `budget_exceeds_account_cap: new total ${newTotal} > ${AD_LIMITS.maxDailyBudgetTotalThb} THB. ` +
        `Pause something or raise ADS_MAX_DAILY_BUDGET_TOTAL_THB.`
    )
  }
  if (input.launchesToday >= AD_LIMITS.maxLaunchesPerDay) {
    throw new Error(
      `launch_rate_limit: already launched ${input.launchesToday} campaigns today (cap ${AD_LIMITS.maxLaunchesPerDay}).`
    )
  }
}
