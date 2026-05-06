---
description: Launch / pause / tune Meta Ads campaign for a Roogondee service via /api/ads
---

You are helping the operator manage Meta Ads automation. The endpoint is `POST /api/ads`, secured with `ADS_CONTROL_SECRET`. See `docs/auto-ads-setup.md`.

User input: $ARGUMENTS

Steps:

1. Parse intent from $ARGUMENTS. Recognise:
   - `launch <service> <budget>` → create new campaign (always launches PAUSED)
   - `pause <campaignId>` / `resume <campaignId>`
   - `budget <campaignId> <thb>` → update daily budget
   - `insights <campaignId> [date_preset]` → fetch performance
   - `list` → list active campaigns
2. Confirm parameters with the user — show the exact JSON payload you will send and the budget impact (current account total + new total).
3. **Always do a `dryRun: true` call first** for `launch` and `budget_update`. Show the response.
4. After explicit "go" from the user, call without `dryRun`.
5. After any action, summarize the result. For launches, remind the user the campaign is PAUSED and they must add ad set + creative in Ads Manager.

Use `curl` via Bash with `$ADS_CONTROL_SECRET` and the deployed base URL (default `https://roogondee.com`, override with `$ADS_BASE_URL`).

Refuse if:
- The user has not provided enough info (e.g. budget without service)
- A budget exceeds `ADS_MAX_DAILY_BUDGET_THB` — explain the cap and ask whether to raise the env var
- Meta Pixel ID is still missing and the user wants conversion-optimized objective — warn that lead optimization will be poor without it.
