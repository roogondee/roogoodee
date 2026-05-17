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

## Messaging bots (FB / LINE / IG)
All three platforms share `src/lib/chatbot/`:
- `anthropic.ts` — singleton Anthropic client, `CHATBOT_MODEL = 'claude-haiku-4-5-20251001'`
- `system-prompt.ts` — Thai multilingual system prompt (auto-detects user language)
- `service-detect.ts` — `detectService()` keywords + `extractVoucherCode()` for `RGD-(GLP1|CKD|STD|FRN)-[A-Z0-9]{6}`
- `reply.ts` — `generateReply(userText)` calls Haiku with shared prompt
- `lead.ts` — `captureBotLead({platform, userId, service, rawText})` inserts to `leads` + fires `notifyLineGroup` for service hits

Webhook handlers stay platform-specific (signature, event shape, send-reply API) and delegate the rest to the shared module.

### Facebook Messenger (status as of 2026-04-26)
- **App:** "RooGonDee AutoPost" — App ID `1840096433337980`
- **Page ID:** `1042552638945974`
- **Permissions granted:** `pages_manage_posts`, `pages_read_engagement` (for autopost)
- **Permissions PENDING App Review:** `pages_messaging`, `pages_messaging_subscriptions` (for bot) — verify status at developers.facebook.com/apps/1840096433337980/app-review/
- **Webhook:** `/api/fb-webhook` (`src/app/api/fb-webhook/route.ts`) — HMAC via `FB_APP_SECRET`, source = `facebook-bot`
- **Pixel ID:** ❌ not yet provided — required for ad optimization
- Page Access Token: stored in Vercel env only — never commit; user accidentally pasted in chat 2026-04-26 → should rotate

### Instagram DM
- **IG Business** linked to FB Page `1042552638945974` — reuses Meta App `1840096433337980`
- **Webhook:** `/api/ig-webhook` (`src/app/api/ig-webhook/route.ts`) — HMAC via `FB_APP_SECRET`, source = `instagram-bot`
- **Webhook field:** `instagram` → subscribe to `messages`, `messaging_postbacks`; callback URL = `https://roogondee.com/api/ig-webhook`
- **Permissions to submit for App Review:** `instagram_basic`, `instagram_manage_messages`
- **Env vars:** `IG_PAGE_ACCESS_TOKEN` (or reuses `FB_PAGE_ACCESS_TOKEN`), `IG_VERIFY_TOKEN` (or reuses `FB_VERIFY_TOKEN`)
- Dedup via `processed_webhook_events.event_id = mid`; skips `is_echo` messages
- IG user ID stored in `leads.instagram_user_id` for future push (migration `add_instagram_to_leads.sql`)

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

## IG autopost (Feed + Stories)
- Same workflows as FB — IG step runs after FB step in `scripts/fb_story.py` and `scripts/fb_caption.py`. One cron, atomic dedup.
- **Auth = Meta Business Portfolio System User token** (NOT FB Page token). System User tokens don't expire and live in the Business Portfolio, not on a personal FB account. Generate at business.facebook.com → System Users → Generate Token with permissions `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`; assign the IG asset + the linked FB Page to the System User first.
- Env vars: `IG_BUSINESS_ACCOUNT_ID` (IG-User ID; fetch via `GET /{FB_PAGE_ID}?fields=instagram_business_account&access_token=…`), `IG_SYSTEM_USER_TOKEN`. Toggle via `IG_AUTOPOST=0` to disable.
- IG Story (`fb_story.py`): reuses the same 1080x1920 image already uploaded to Supabase Storage + same caption. Two-step Graph API: `POST /{ig-user-id}/media?media_type=STORIES&image_url=…&caption=…` → `POST /{ig-user-id}/media_publish?creation_id=…`. Logged to `fb_stories.ig_media_id` / `ig_status` / `ig_error`.
- IG Feed (`fb_caption.py`): reuses `posts.image_url` (must be HTTPS public; 4:5 to 1.91:1 aspect). FB caption is rewritten via `build_ig_caption()` — strips the clickable URL (IG feed captions don't render links) and appends "🔗 ลิงก์อยู่ใน bio | roogondee.com". Logged to `posts.ig_post_id` / `ig_posted_at` / `ig_caption`.
- IG failures don't fail the workflow — FB has already succeeded by then; warning is logged to Discord/Slack/LINE and `ig_status='failed'` is recorded.
- Schema: `supabase/migrations/add_ig_to_autopost.sql` adds `ig_*` columns to both `fb_stories` and `posts`.

## Recent decisions
- 2026-05-17: IG autopost (Feed + Stories) shipped — extends fb_story.yml + fb_caption.yml, uses Meta Business Portfolio System User token (`IG_SYSTEM_USER_TOKEN`), mirrors FB content (story = same image, feed = same article with link-in-bio rewrite)
- 2026-05-08: foreign-worker tie-in pack saved at `docs/foreign-worker-tiein.md` — W Medical credentials (สบส. 001/2569, LA 7044P/2568, Iris/Facial training cert) + 9-point Work Permit checkup details + Thai copy block. Pull from this file for any next-round post/article tagged `service: 'foreign'`.
- 2026-05-06: FB Page Stories autopost shipped — daily 9am rotating glp1/std/ckd, Sarabun-rendered 9:16 covers + AI caption, no extra FB permissions needed
- 2026-04-29 (PR #33): article quiz auto-embeds on every blog post — drives readers from articles → full quiz with utm attribution by slug
- 2026-04-26: `toggleMulti` enforces exclusivity for `value='none'` and `option.exclusive: true` — fixes the "เลือกไม่มีพร้อมตัวอื่น" bug reported by Pornpat
- 2026-04-26: STD risk_types `'no_say'` marked exclusive
- 2026-04-26: needlestick label changed to "เข็มตำโดยอุบัติเหตุ (Needlestick)"
- 2026-04-25 (PR #17): rugondee-clone Vercel project deploys every push and fails — user needs to disconnect at vercel.com/roogondees-projects/rugondee-clone/settings/git
