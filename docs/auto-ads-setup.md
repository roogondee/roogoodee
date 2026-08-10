# Auto-Ads Setup

Endpoint: `POST /api/ads` — Claude (or any operator with the secret) can launch / pause / resume / budget-update / fetch insights for Meta Ads campaigns.

All actions are:
- **Audited** to `public.ad_actions` (Supabase)
- **Budget-capped** by env vars (per-campaign, account total, launches/day)
- **Launched PAUSED** — human must add ad set + creative + flip to ACTIVE in Ads Manager

## What you must provide

### Meta / Facebook (required)

| Env var | Where to get it |
|---|---|
| `META_ADS_ACCESS_TOKEN` | Business Settings → Users → System Users → create one → assign Ad Account → generate token with scopes `ads_management`, `ads_read`, `business_management`. Use a **System User token** (never expires) not a user token. |
| `META_AD_ACCOUNT_ID` | Ads Manager URL: `act_XXXXXXXXX` — must include the `act_` prefix |
| `META_PAGE_ID` | Already known: `1042552638945974` (or reuse `FB_PAGE_ID`) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Events Manager → Data Sources → Pixel ID. **CLAUDE.md says this is still missing** — required for conversion-optimized campaigns. |

### Control / safety (required)

| Env var | Purpose | Default |
|---|---|---|
| `ADS_CONTROL_SECRET` | Bearer token required on `/api/ads`. Generate: `openssl rand -hex 32` | — |
| `ADS_MAX_DAILY_BUDGET_THB` | Per-campaign daily cap | 500 |
| `ADS_MAX_DAILY_BUDGET_TOTAL_THB` | Sum of active daily budgets across account | 2000 |
| `ADS_MAX_LAUNCHES_PER_DAY` | New campaigns Claude can create per calendar day | 3 |

### TikTok (optional, not yet wired)

The endpoint returns `tiktok_not_implemented` for now. When ready provide:
- `TIKTOK_ADS_ACCESS_TOKEN` — Marketing API token (different from `TIKTOK_ACCESS_TOKEN` used for Events API)
- `TIKTOK_ADVERTISER_ID`

## Database

Apply the migration once:

```sql
-- supabase/migrations/create_ad_actions.sql
```

## Trying it (dry run)

```bash
curl -X POST https://roogondee.com/api/ads \
  -H "Authorization: Bearer $ADS_CONTROL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "meta",
    "action": "launch",
    "service": "glp1",
    "name": "RGD-GLP1-Test-2026-05",
    "objective": "OUTCOME_LEADS",
    "dailyBudgetThb": 200,
    "dryRun": true
  }'
```

## Real launch flow

1. Claude calls `/api/ads` with `dryRun: true` first → confirms guardrails pass
2. On approval, Claude calls again without `dryRun` → campaign created **PAUSED**
3. Operator opens Ads Manager → adds ad set (audience, placements) + creative → flips to ACTIVE
4. Daily/weekly: Claude pulls `insights` → recommends `pause` or `budget_update` based on CPL

## Why launched paused

Meta Ads cannot be safely launched fully-armed via API alone — ad sets need creative + targeting that the API's URL-encoding makes brittle. Two-step flow keeps human in the loop on creative / audience while letting Claude own the boring parts (budget tuning, pausing losers).
