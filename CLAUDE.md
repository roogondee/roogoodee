# CLAUDE.md

Project memory for Roogondee (รู้ก่อนดี) — Next.js telehealth lead-gen site.

## Stack
- Next.js 14 App Router, React 18, TypeScript, Tailwind
- Supabase (Postgres + auth + storage)
- LINE Messaging API (`@roogondee` OA), Facebook Messenger Bot, FB Page autopost
- Anthropic SDK (Claude Haiku 4.5 for chat bot, Claude Sonnet for content gen)
- Hosted on Vercel; cron via GitHub Actions

## Services
4 verticals — see `src/types/index.ts`:
- **GLP-1** — voucher `RGD-GLP1-XXXXXX`, 14-day expiry, free FBS+HbA1c (500฿) at W Medical Hospital
- **STD/PrEP HIV** — voucher `RGD-STD-XXXXXX`, free HIV+Syphilis test, 1-hr result
- **CKD** — voucher `RGD-CKD-XXXXXX`, free urine protein test
- **Foreign worker** (B2B) — group health screening for HR in Samut Sakhon

## Quiz funnel
- `src/lib/quiz/questions.ts` — question definitions per service
- `src/components/quiz/QuizRunner.tsx` — runner; multi-select uses `toggleMulti(q, value)`
- `src/lib/quiz/scoring.ts` + `insight.ts` + `summary.ts` — score → tier (urgent/hot/warm/cold)
- `src/lib/quiz/voucher.ts` — voucher code generation
- Multi-select options with `exclusive: true` (or value `'none'`) clear other selections when picked

## Article quiz (lite, embedded in blog posts)
- `src/lib/quiz/article-quiz.ts` — 3-question lite definitions per service (glp1/ckd/std)
- `src/lib/quiz/article-scoring.ts` — ratio scoring → tier `'high' | 'medium' | 'low'` (separate from `LeadTier`)
- `src/components/quiz/ArticleQuiz.tsx` — embed component, no DB writes, just engagement
- Auto-rendered in `src/app/blog/[slug]/page.tsx` after article content for any post with `service ∈ {glp1,ckd,std}` (foreign skipped)
- CTA links to full `/quiz/{service}` with `utm_source=article&utm_medium=article_quiz&utm_campaign={slug}` for funnel attribution
- Tracks `article_quiz_view` / `article_quiz_progress` / `article_quiz_complete` to GA4 + Meta Pixel

## Brand & UI
- Site name: "รู้ก่อนดี(รู้งี้)" / Roogondee / RuGonDee
- Mint green (`#52B788`) primary, forest green (`#1B4332`) base
- Default Thai copy; site supports 10 languages via `src/lib/i18n/`
- No emojis in code or commit messages unless user explicitly asks

## Tracking
- GA4 via `NEXT_PUBLIC_GA_ID` (in `src/app/layout.tsx`)
- **Meta Pixel** via `NEXT_PUBLIC_META_PIXEL_ID` — fires `PageView`, `Lead`, `CompleteRegistration`. Quiz `Lead`/`CompleteRegistration` pass `eventID = voucher.code` for CAPI dedup.
- **Meta Conversions API** (server-side) via `META_CAPI_ACCESS_TOKEN` in `src/lib/meta-capi.ts`, called from `src/app/api/quiz/route.ts` after voucher issued. `event_id = voucher.code` so client `fbq` and server dedup. Captures `_fbc`/`_fbp` cookies, hashes email/phone/name (phone E.164 no `+`, e.g. `66812345678`) with SHA-256. `sanitizeCustomData` strips drug names (Ozempic/Wegovy/Saxenda/Mounjaro/Rybelsus/semaglutide/tirzepatide/liraglutide) + clinical fields (BMI/weight/HbA1c/FBS/etc.) per Meta Health & Wellness policy. Mens vertical routes to `META_CAPI_ACCESS_TOKEN_MENS` + `NEXT_PUBLIC_META_PIXEL_ID_MENS` when set; otherwise mens fires NOTHING (matches Pixels.tsx + tiktok-events.ts isolation). Optional `META_TEST_EVENT_CODE` for staging-only Test Events tab verification.
- **Generic CAPI relay** at `/api/track/conversion` (`src/app/api/track/conversion/route.ts`) + browser wrapper `src/lib/meta-pixel.ts#trackMetaEvent` for ad-hoc events outside the quiz flow. Browser wrapper gates on `hasConsent()` from `@/lib/analytics/consent`.
- **TikTok Pixel** via `NEXT_PUBLIC_TIKTOK_PIXEL_ID` — fires `page()`, `InitiateCheckout` (quiz start), `SubmitForm` + `CompleteRegistration` (quiz success)
- **TikTok Events API** (server-side) via `TIKTOK_ACCESS_TOKEN` in `src/lib/tiktok-events.ts`, called from `src/app/api/quiz/route.ts` after voucher issued. `event_id = voucher.code` so client and server dedup. Captures `ttclid` (URL → 30d cookie) and `_ttp` cookie, hashes email/phone (E.164) with SHA-256.
- Custom events: `quiz_start`, `quiz_complete`, `voucher_sent`, `quiz_progress`
- reCAPTCHA v3 on quiz submit (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`)

## Facebook integration (status as of 2026-04-26)
- **App:** "RooGonDee AutoPost" — App ID `1840096433337980`
- **Page ID:** `1042552638945974`
- **Permissions granted:** `pages_manage_posts`, `pages_read_engagement` (for autopost)
- **Permissions PENDING App Review:** `pages_messaging`, `pages_messaging_subscriptions` (for bot)
- **Webhook:** `/api/fb-webhook` (`src/app/api/fb-webhook/route.ts`) — Claude Haiku 4.5, multilingual, HMAC signature verified via `FB_APP_SECRET`
- **Pixel ID:** ❌ not yet provided — required for ad optimization
- Page Access Token: stored in Vercel env only — never commit; user accidentally pasted in chat 2026-04-26 → should rotate

## Branches
- Active dev branch: `claude/new-session-CoTUt` → PR #22
- Default base: `main`
- Squash merges (one commit per PR with `(#NN)` suffix) per repo convention

## Key files
- `docs/fb-ads-brief.md` — FB Lead Ads brief for marketing team
- `docs/launch-playbook.md` — pre-existing launch SOP
- `docs/partner-agreement.md` — pre-existing partner doc

## Recent decisions
- 2026-04-30: Meta CAPI added (`src/lib/meta-capi.ts`) — server-side `Lead` event from `/api/quiz` with `event_id = voucher.code` for browser/server dedup. Browser wrapper `src/lib/meta-pixel.ts` + relay `/api/track/conversion` for ad-hoc events. Drug names + clinical fields stripped before send (Health & Wellness compliance). Mens vertical isolated via `META_CAPI_ACCESS_TOKEN_MENS`.
- 2026-04-29 (PR #33): article quiz auto-embeds on every blog post — drives readers from articles → full quiz with utm attribution by slug
- 2026-04-26: `toggleMulti` enforces exclusivity for `value='none'` and `option.exclusive: true` — fixes the "เลือกไม่มีพร้อมตัวอื่น" bug reported by Pornpat
- 2026-04-26: STD risk_types `'no_say'` marked exclusive
- 2026-04-26: needlestick label changed to "เข็มตำโดยอุบัติเหตุ (Needlestick)"
- 2026-04-25 (PR #17): rugondee-clone Vercel project deploys every push and fails — user needs to disconnect at vercel.com/roogondees-projects/rugondee-clone/settings/git
