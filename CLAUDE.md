# CLAUDE.md

Project memory for Roogondee (รู้ก่อนดี) — Next.js telehealth lead-gen site.

## Stack
- Next.js 14 App Router, React 18, TypeScript, Tailwind
- Supabase (Postgres + auth + storage)
- LINE Messaging API (`@roogondee` OA), Facebook Messenger Bot, FB Page autopost
- Anthropic SDK (Claude Haiku 4.5 for chat bot, Claude Sonnet for content gen)
- Hosted on Vercel; cron via GitHub Actions

## Services
7 verticals — see `src/types/index.ts`:
- **GLP-1** — voucher `RGD-GLP1-XXXXXX`, 14-day expiry, free FBS+HbA1c (500฿) at W Medical Hospital
- **STD/PrEP HIV** — voucher `RGD-STD-XXXXXX`, free HIV+Syphilis test, 1-hr result
- **CKD** — voucher `RGD-CKD-XXXXXX`, free urine protein test
- **Foreign worker** (B2B) — group health screening for HR in Samut Sakhon
- **Men's Health 40+** (`mens`) — voucher `RGD-MENS-XXXXXX`, ปรึกษาแพทย์ฟรี (andropause/sexual wellness, doctor-led compliance)
- **Women's Health** (`women`) — voucher `RGD-WMN-XXXXXX`, ปรึกษาสูตินรีแพทย์ฟรี + ตรวจประเมินเบื้องต้น (HPV/Pap/discharge/menstrual/menopause). Red flag = abnormal bleeding → urgent
- **Mind & Relationships** (`mind`) — voucher `RGD-MND-XXXXXX`, ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (telehealth, partner-agnostic copy). **Safety gate**: `self_harm_check` ∈ {sometimes,often} → urgent + insight surfaces crisis hotline **1323** (Department of Mental Health, free 24/7). MUST NOT be relaxed downstream.

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
- Auto-rendered in `src/app/blog/[slug]/page.tsx` after article content for any post with `service ∈ {glp1,ckd,std,women,mind}` (foreign/mens skipped — no lite quiz defined)
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
- `docs/mind-crisis-sop.md` — Crisis SOP for sales/CS team handling urgent `mind` leads (self-harm flag). Scripts (Thai), escalation tree, 1323 hotline, do/don't language, training requirements.
- `docs/mind-recruiting.md` — Recruiting plan for in-house psychologists/psychiatrists (not partner platforms). Job posting template, interview rubric, onboarding checklist, 60-day timeline, Phase 2 launch triggers.
- `docs/mind-ai-intake-spec.md` — Spec for Phase 3 — using Claude Sonnet to scale `mind` (pre-session intake, between-session check-ins, psychoeducation Q&A). Strict guardrails: AI never diagnoses, surfaces 1323 on crisis. Phase 3 only after Phase 2 in-house team is live.

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
- 2026-05-19 (PR #82): `mind` pillar shipped Phase 1 **waitlist mode** — `insightMind` non-urgent branches now promise callback in 1-2 weeks (not immediate 30-min session) while we recruit in-house licensed providers; flip `MIND_WAITLIST_MODE = false` in `src/lib/quiz/insight.ts` when in-house team is ready. Decision: going **in-house, not partner platforms** (Ooca/iSTRONG) — keeps 100% margin, brand consistency, and pattern-aligns with W Medical in-network model of pillars 1-6. `/mind` landing has an amber "Soft launch" banner above the hero — remove it when Phase 2 launches. Self-harm urgent branch is unchanged — still surfaces 1323 immediately. Follow-ups (separate from PR #82): `docs/mind-crisis-sop.md` (sales team SOP), `docs/mind-recruiting.md` (60-day recruiting plan), `docs/mind-ai-intake-spec.md` (Phase 3 AI assistance spec).
- 2026-05-19 (PR #80): pillars 6 + 7 shipped — **women** (สุขภาพเพศหญิง — voucher = ปรึกษาสูตินรีแพทย์ + ตรวจประเมินเบื้องต้น, W Medical) and **mind** (สุขภาพจิต & ความสัมพันธ์ — voucher = ปรึกษานักจิตวิทยา 30 นาที telehealth, partner-agnostic copy). `mind` has a SAFETY GATE on `self_harm_check`: "sometimes"/"often" → urgent + insight body surfaces hotline 1323 (กรมสุขภาพจิต, free 24/7). Crisis SOP for sales team is a separate follow-up. Mental wellness partner (Ooca / iSTRONG / W Medical / other) still TBD — copy uses neutral "ผู้เชี่ยวชาญ" wording so partner can swap without code change. Pre-existing bug fixed in same PR: `chatbot/service-detect.ts` was missing `mens` keywords; `VOUCHER_REGEX` now matches `GLP1|CKD|STD|FRN|MENS|WMN|MND`. MobileNav + FooterFull now include all 7 verticals. 8 non-th/en locales fall back via loose i18n typing — translation follow-up.
- 2026-05-08: foreign-worker tie-in pack saved at `docs/foreign-worker-tiein.md` — W Medical credentials (สบส. 001/2569, LA 7044P/2568, Iris/Facial training cert) + 9-point Work Permit checkup details + Thai copy block. Pull from this file for any next-round post/article tagged `service: 'foreign'`.
- 2026-05-06: FB Page Stories autopost shipped — daily 9am rotating glp1/std/ckd, Sarabun-rendered 9:16 covers + AI caption, no extra FB permissions needed
- 2026-04-29 (PR #33): article quiz auto-embeds on every blog post — drives readers from articles → full quiz with utm attribution by slug
- 2026-04-26: `toggleMulti` enforces exclusivity for `value='none'` and `option.exclusive: true` — fixes the "เลือกไม่มีพร้อมตัวอื่น" bug reported by Pornpat
- 2026-04-26: STD risk_types `'no_say'` marked exclusive
- 2026-04-26: needlestick label changed to "เข็มตำโดยอุบัติเหตุ (Needlestick)"
- 2026-04-25 (PR #17): rugondee-clone Vercel project deploys every push and fails — user needs to disconnect at vercel.com/roogondees-projects/rugondee-clone/settings/git
