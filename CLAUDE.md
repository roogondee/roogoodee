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

## FB Page Reels (daily AI video autopost — prototype)
- `scripts/fb_reel.py` + `.github/workflows/fb_reel.yml` — cron 04:00 UTC = 11:00 BKK (หลัง Story 2 ชม.)
- Rotates `glp1 → std → ckd` by day-of-year (skip foreign + mens — Reels เน้น consumer)
- Reel type cycles `lifestyle → clinic_visit → before_after_mood → voucher_promo` (4-day)
- Script gen: Claude Haiku 4.5 → JSON `{visual_prompt(EN), headline(TH), caption(TH), cta(TH)}`
- Video: **Seedance 1.5 Pro** ผ่าน kie.ai (`bytedance/seedance-1.5-pro`) — 9:16, 8s, 1080p, native audio
  - createTask → poll `/recordInfo` until `state=success` → ดาวน์โหลด mp4
  - cost ~$0.01/sec → 8s = ~$0.08/clip = **~$2.40/เดือน** (1 reel/วัน)
- Posts via Graph API v19 resumable upload (3 phase): `start` → `upload` (file_url จาก Supabase storage) → wait 30s → `finish&video_state=PUBLISHED`
- Tracked in `fb_reels` table (migration: `create_fb_reels.sql`) — unique `(posted_date, service)` index → safe re-run
- Required new secret: **`KIE_API_KEY`** (kie.ai) — เพิ่มจาก 5 secrets เดิมของ Story
- Manual dispatch: `service` override + `duration` (4/8/12) + `resolution` + `dry_run` (skip ทั้ง Seedance+FB) + `local_only` (gen แต่ไม่โพสต์ — artifact upload เป็น mp4 preview)
- ⚠️ Thai lip-sync ของ Seedance ไม่ได้อยู่ในลิสต์ภาษาหลัก → prompt ใช้ ambient music + no dialogue, ข้อความไทยอยู่ใน FB caption

## Recent decisions
- 2026-05-09: FB Page Reels autopost prototype — Seedance 1.5 Pro ผ่าน kie.ai ($0.08/clip, ~$2.40/เดือน), cron 11:00 BKK, 9:16/8s/1080p พร้อม native audio. ต้องเพิ่ม `KIE_API_KEY` secret + apply `create_fb_reels.sql` migration ก่อน enable cron.
- 2026-05-08: foreign-worker tie-in pack saved at `docs/foreign-worker-tiein.md` — W Medical credentials (สบส. 001/2569, LA 7044P/2568, Iris/Facial training cert) + 9-point Work Permit checkup details + Thai copy block. Pull from this file for any next-round post/article tagged `service: 'foreign'`.
- 2026-05-06: FB Page Stories autopost shipped — daily 9am rotating glp1/std/ckd, Sarabun-rendered 9:16 covers + AI caption, no extra FB permissions needed
- 2026-04-29 (PR #33): article quiz auto-embeds on every blog post — drives readers from articles → full quiz with utm attribution by slug
- 2026-04-26: `toggleMulti` enforces exclusivity for `value='none'` and `option.exclusive: true` — fixes the "เลือกไม่มีพร้อมตัวอื่น" bug reported by Pornpat
- 2026-04-26: STD risk_types `'no_say'` marked exclusive
- 2026-04-26: needlestick label changed to "เข็มตำโดยอุบัติเหตุ (Needlestick)"
- 2026-04-25 (PR #17): rugondee-clone Vercel project deploys every push and fails — user needs to disconnect at vercel.com/roogondees-projects/rugondee-clone/settings/git
