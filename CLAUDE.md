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
- **Meta Pixel** via `NEXT_PUBLIC_META_PIXEL_ID` — fires `PageView`, `Lead`, `CompleteRegistration`
- **TikTok Pixel** via `NEXT_PUBLIC_TIKTOK_PIXEL_ID` — fires `page()`, `InitiateCheckout` (quiz start), `SubmitForm` + `CompleteRegistration` (quiz success)
- **TikTok Events API** (server-side) via `TIKTOK_ACCESS_TOKEN` in `src/lib/tiktok-events.ts`, called from `src/app/api/quiz/route.ts` after voucher issued. `event_id = voucher.code` so client and server dedup. Captures `ttclid` (URL → 30d cookie) and `_ttp` cookie, hashes email/phone (E.164) with SHA-256.
- Custom events: `quiz_start`, `quiz_complete`, `voucher_sent`, `quiz_progress`
- reCAPTCHA v3 on quiz submit (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`)

## Facebook integration (status as of 2026-04-26)
- **App:** "RooGonDee AutoPost" — App ID `1840096433337980`
- **Page ID:** `1042552638945974`
- **Permissions granted:** `pages_manage_posts`, `pages_read_engagement` (for autopost)
- **Permissions PENDING App Review:** `pages_messaging`, `pages_messaging_subscriptions`, `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments` (for bot + IG)
- **Webhook:** `/api/fb-webhook` (`src/app/api/fb-webhook/route.ts`) — Claude Haiku 4.5, multilingual, HMAC signature verified via `FB_APP_SECRET`. Single endpoint handles `object: 'page'` (Messenger DM + feed comments) AND `object: 'instagram'` (IG Direct + IG comments).
- **Pixel ID:** ❌ not yet provided — required for ad optimization
- Page Access Token: stored in Vercel env only — never commit; user accidentally pasted in chat 2026-04-26 → should rotate

## Social bot (Messenger + IG DM + comment auto-reply + ad referral)
- `src/lib/social-bot.ts` — shared logic: `SYSTEM_PROMPT` (sales-oriented, MUST close every reply with quiz/contact CTA), `detectService`, `askClaude`, Graph helpers `sendDM` / `replyToComment` / `sendPrivateReplyFromComment` / `publicCommentHandoff`, plus Click-to-Messenger helpers `serviceFromRef` / `referralOpener` and rate-limit fallback `rateLimitReply`
- `src/app/api/fb-webhook/route.ts` — single endpoint, five event types:
  1. **FB Messenger DM** (`object: 'page'`, `entry.messaging[]`) → AI sales reply via `sendDM('fb', …)`
  2. **FB Page comment** (`object: 'page'`, `entry.changes[].field === 'feed'`, `item: 'comment'`, `verb: 'add'`) → short canned `publicCommentHandoff` public reply + AI `sendPrivateReplyFromComment` to pull commenter into Messenger
  3. **IG Direct DM** (`object: 'instagram'`, `entry.messaging[]`) → AI sales reply via `sendDM('ig', …)`
  4. **IG comment** (`object: 'instagram'`, `entry.changes[].field === 'comments'`) → public reply (`POST /{ig-comment-id}/replies`) + private DM
  5. **Click-to-Messenger ad referral** (`event.referral` / `event.postback.referral` / `event.message.referral` with `ref` payload) → service-specific `referralOpener` opener DM, lead saved with `source='facebook-ad-click'`/`'instagram-ad-click'` + `referral_ref` + `ad_id` + `utm_*='click-to-message'`
- Skips own page/IG comments via `FB_PAGE_ID` / `IG_BUSINESS_ID` env (loop guard) and `is_echo` messages
- **Rate limit**: 15 messages/hour/sender — exceeded senders get `rateLimitReply` canned response (still pushes quiz link) instead of an Anthropic call. Caps spend during ad-launch traffic spikes. Tracked in `bot_message_log` table.
- Dedup via `processed_webhook_events` (atomic insert); keys: `fb-msg-{mid}`, `fb-comment-{comment_id}`, `ig-msg-{mid}`, `ig-comment-{id}`, `fb-ref-{sender}-{ref}-{ad}`, `ig-ref-{sender}-{ref}-{ad}`
- All inbound (DM + comment + ad click) saved as leads with sources: `facebook-bot`, `facebook-comment`, `facebook-ad-click`, `instagram-bot`, `instagram-comment`, `instagram-ad-click`. Service-keyword matches also notify W Medical LINE group.
- IG Direct uses same Graph endpoint `/me/messages` as Messenger; token defaults to `FB_PAGE_ACCESS_TOKEN` (linked-IG case) but `IG_PAGE_ACCESS_TOKEN` env override is supported
- Required env: `FB_PAGE_ACCESS_TOKEN`, `FB_VERIFY_TOKEN`, `FB_APP_SECRET`, `FB_PAGE_ID`, `IG_BUSINESS_ID` (optional, only needed for self-comment loop guard)

## FB Lead Ads webhook (Meta "Lead generation" campaign type)
- `src/app/api/fb-leadgen/route.ts` — separate endpoint so `leadgen` subscription toggles independently of messaging. Handles `object: 'page'` + `changes.field === 'leadgen'`. Steps:
  1. Atomic claim on `event_id = fb-leadgen-{leadgen_id}` (dedup Meta retries)
  2. `GET /v19.0/{leadgen_id}?fields=field_data,form_id,ad_id,adset_id,campaign_id` with `FB_PAGE_ACCESS_TOKEN`
  3. Map `field_data` → phone/name/email/line_id (normalize `+66…` → `0…`)
  4. Resolve service via `FB_LEADGEN_FORM_MAP` env (format: `form_id_1:glp1,form_id_2:std`); default `glp1`
  5. Insert lead with `source='facebook-leadgen'` + `ad_id`/`adset_id`/`campaign_id` + `consent_pdpa=true` (Lead Ads form forces consent), round-robin assign
  6. Issue voucher (`issueVoucher`), notify W Medical LINE group with full voucher card via `notifyLeadToSale`
  7. If phone is invalid/missing, still saves lead but sends LINE alert "manual follow-up needed"
- Required env: `FB_PAGE_ACCESS_TOKEN` (must include `leads_retrieval` scope), `FB_LEADGEN_FORM_MAP`
- FB App Dashboard → Webhooks → Page object → subscribe field `leadgen`. App Review permission: `leads_retrieval`

## Ad attribution columns on leads
- Migration `add_ad_attribution_to_leads.sql` adds: `fbclid`, `fbp` (Meta), `utm_term`, `utm_content`, `ad_id`, `adset_id`, `campaign_id`, `referral_ref`
- `QuizRunner.tsx` captures `fbclid` from URL → 90-day cookie + reads `_fbp` cookie set by Meta Pixel + `utm_term`/`utm_content` from URL → forwarded to `/api/quiz`
- `/api/quiz/route.ts` saves all of the above on lead row → admin can break ROAS down by `campaign_id`/`ad_id` and (PR #59) FB Conversion API can dedup against client `Lead` event using `fbclid`/`_fbp`

## Branches
- Active dev branch: `claude/new-session-CoTUt` → PR #22
- Default base: `main`
- Squash merges (one commit per PR with `(#NN)` suffix) per repo convention

## Key files
- `docs/fb-ads-brief.md` — FB Lead Ads brief for marketing team
- `docs/launch-playbook.md` — pre-existing launch SOP
- `docs/partner-agreement.md` — pre-existing partner doc
- `docs/foreign-worker-tiein.md` — W Medical certifications (ใบอนุญาตสถานพยาบาล (สมุทรสาคร) 001/2569, LA 7044P/2568, Iris Scan cert) + ready-to-paste Thai copy block + 9-point Work Permit checkup details. **Tie-in source for any future `service: 'foreign'` post/article/caption.**

## FB Page Stories (daily autopost)
- `scripts/fb_story.py` + `.github/workflows/fb_story.yml` — cron 02:00 UTC = 09:00 BKK
- Rotates `glp1 → std → ckd` by day-of-year (skip `foreign` B2B; `mens` opt-in via `STORY_INCLUDE_MENS=1`)
- Story type cycles `fact → question → tip → voucher → myth` (5-day cycle)
- Caption gen: Claude Haiku 4.5 → JSON `{headline, subline, caption, cta}`; mens compliance gate reuses `compliance.check_caption_compliance`
- Image: 1080x1920 composed with Pillow + Sarabun (SIL OFL, downloaded at runtime, cached in `scripts/fonts/`); FLUX background optional, gradient fallback if `TOGETHER_API_KEY` absent
- Posts via Graph API v19: `POST /{page-id}/photos?published=false` → `POST /{page-id}/photo_stories?photo_id=…` (uses existing `pages_manage_posts`)
- Tracked in `fb_stories` table with unique `(posted_date, service)` index → safe to re-run cron
- Manual: `workflow_dispatch` accepts `service` override + `dry_run` (skip Graph API, save preview to `/tmp`)

## Recent decisions
- 2026-05-08: foreign-worker tie-in pack saved at `docs/foreign-worker-tiein.md` — W Medical credentials (สบส. 001/2569, LA 7044P/2568, Iris/Facial training cert) + 9-point Work Permit checkup details + Thai copy block. Pull from this file for any next-round post/article tagged `service: 'foreign'`.
- 2026-05-06: FB Page Stories autopost shipped — daily 9am rotating glp1/std/ckd, Sarabun-rendered 9:16 covers + AI caption, no extra FB permissions needed
- 2026-04-29 (PR #33): article quiz auto-embeds on every blog post — drives readers from articles → full quiz with utm attribution by slug
- 2026-04-26: `toggleMulti` enforces exclusivity for `value='none'` and `option.exclusive: true` — fixes the "เลือกไม่มีพร้อมตัวอื่น" bug reported by Pornpat
- 2026-04-26: STD risk_types `'no_say'` marked exclusive
- 2026-04-26: needlestick label changed to "เข็มตำโดยอุบัติเหตุ (Needlestick)"
- 2026-04-25 (PR #17): rugondee-clone Vercel project deploys every push and fails — user needs to disconnect at vercel.com/roogondees-projects/rugondee-clone/settings/git
