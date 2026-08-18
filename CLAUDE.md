# CLAUDE.md

Project memory for Roogondee (รู้ก่อนดี) — Next.js telehealth lead-gen site.

## Stack
- Next.js 14 App Router, React 18, TypeScript, Tailwind
- Supabase (Postgres + auth + storage)
- LINE Messaging API (`@roogondee` OA), Facebook Messenger Bot, FB Page autopost
- Anthropic SDK (Claude Haiku 4.5 for chat bot, Claude Sonnet for content gen)
- Hosted on Vercel; cron via GitHub Actions

## Services
8 verticals — see `src/types/index.ts`:
- **GLP-1** — voucher `RGD-GLP1-XXXXXX`, 14-day expiry, free FBS+HbA1c (500฿) at W Medical Hospital
- **STD/PrEP HIV** — voucher `RGD-STD-XXXXXX`, free HIV+Syphilis test, 1-hr result
- **CKD** — voucher `RGD-CKD-XXXXXX`, free urine protein test
- **Foreign worker** (B2B) — group health screening for HR in Samut Sakhon
- **Men's Health 40+** (`mens`) — voucher `RGD-MENS-XXXXXX`, ปรึกษาแพทย์ฟรี (andropause/sexual wellness, doctor-led compliance)
- **Women's Health** (`women`) — voucher `RGD-WMN-XXXXXX`, ปรึกษาสูตินรีแพทย์ฟรี + ตรวจประเมินเบื้องต้น (HPV/Pap/discharge/menstrual/menopause). Red flag = abnormal bleeding → urgent
- **Mind & Relationships** (`mind`) — voucher `RGD-MND-XXXXXX`, ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (telehealth, partner-agnostic copy). **Safety gate**: `self_harm_check` ∈ {sometimes,often} → urgent + insight surfaces crisis hotline **1323** (Department of Mental Health, free 24/7). MUST NOT be relaxed downstream.
- **DNA Paternity** (`dna`) — voucher `RGD-DNA-XXXXXX`, **ปรึกษาฟรี ไม่ใช่ตรวจฟรี** (tests cost ~6,000-15,000฿; team advises legal vs peace-of-mind type, documents, price, then books at partner facility). Not a medical pillar — no `urgent` tier (reserved for medical/safety). **Consent red lines (MUST NOT be relaxed)**: (1) `consent_status='no_consent'` → cold tier, consult-about-consent only, never a test booking — no secret-sample testing ever (PDPA sensitive data, labs refuse, inadmissible); (2) prenatal (NIPP) → doctor consult only, never direct booking; (3) never guarantee legal outcomes; accuracy claims belong to the lab. Excluded from FB Story rotation + article quiz (sensitive topic).

## Advice AI (Google Ads landing)
- `/advice` — separate landing page for **general-illness search traffic** (Google Ads keywords like "ปวดท้องข้างขวา", "ไข้ไม่ลด") — a different audience from the 8 named-service pillars above, who already know which service they want. Inline `AdviceChat` component (`src/components/ui/AdviceChat.tsx`), not the floating `ChatWidget` (which is hidden on `/advice`).
- `POST /api/advice` (`src/app/api/advice/route.ts`) — same session/agent-loop shape as `/api/chat` but its own system prompt (`src/lib/advice/prompt.ts`) and tool set (`src/lib/advice/tools.ts`: `search_blog_posts`, `get_service_info`, `recommend_service` — routes into all 8 pillars including women/mind/dna, which the chat widget doesn't cover — and `create_lead`, source `advice-chat`).
- **Two-model handoff (2026-08-16)**: a single Haiku reply after one message read as shallow, so the conversation now runs in phases, tracked per session via `chat_sessions.advice_phase` (`'intake' | 'assessment_done'`, migration `add_advice_phase_to_chat_sessions.sql`): (1) **intake** — Haiku (`CHATBOT_MODEL`) asks a real history-taking sequence (chief complaint → duration → severity → associated symptoms → relevant history), one question per turn, at least 2 questions before concluding unless the first message is already detailed or triage is `urgent`/`emergency`; ends by calling the `submit_intake` tool (`src/lib/advice/tools.ts` `INTAKE_TOOLS`, not in the phase-2/3 tool set — nothing left to hand off to once it fires). (2) **assessment** — the moment `submit_intake` fires, `route.ts`'s tool loop switches model+prompt mid-loop (no second HTTP round-trip) to Sonnet (`CONTENT_MODEL` from `src/lib/anthropic/content-gen.ts`, imported as `SONNET_MODEL`) for one structured, detailed reply: possible causes (explicitly labeled "ไม่ใช่การวินิจฉัย", never a diagnosis), a numbered step-by-step self-care plan, and a case-specific "if not better in N days, see a doctor" threshold with red flags — then the same LINE/contact ROUTING close as before. (3) **follow-up** — later messages in an `assessment_done` session use a lighter Haiku prompt (no re-intake) so "ขอบคุณค่ะ" doesn't get pulled back into history-taking questions. **Hard rules are unchanged by this split and MUST NOT be relaxed further**: still no diagnosis, no prescribing, no specific personalized dosing (OTC class + "follow the label" only, same as before) — the user explicitly chose "no diagnosis, no prescribing" when this was proposed; depth comes from the intake sequence and the assessment's structure, not from crossing that line.
- **Safety gate — `src/lib/advice/triage.ts`, MUST NOT be relaxed**: deterministic (regex, not LLM) red-flag classifier runs on every message *before* the model is called. Emergency (chest pain, stroke signs, can't breathe, major bleeding, poisoning, etc.) → hardcoded 1669 reply, model never invoked. Reuses `src/lib/mind/safety.ts`'s `classifyMessage`/`crisisResponse` verbatim so a self-harm disclosure gets the same 1323 response through this entry point as through `mind`. Triage level is sticky per session (`chat_sessions.triage_level`) via `escalate()`.
- Ad-click attribution: `leads.gclid` (new column, `add_gclid_to_leads.sql`) + existing `utm_*` — captured client-side from the landing URL, persisted via `persistClickId`, sent with every `/api/advice` call, written on `create_lead`. Needed for Google Ads offline conversion import — see `docs/advice-google-ads.md`.
- Public + unauthenticated endpoint → has its own best-effort in-memory rate limiter (`src/lib/advice/rate-limit.ts`, 20 req/5min/IP, per-instance only — see file comment for the tradeoff).
- **Follow-up flow (2026-08-16)**: `/advice` is linked from `NavBar`, `MobileNav`, `FooterFull`, and a homepage banner (`HomeClient.tsx`) so on-site visitors who feel unwell — not just paid-search clicks — can find it. Internal links carry no `utm_*`/`gclid`, so `leads.gclid`/`utm_source` still distinguishes paid-search leads from on-site discovery for reporting. After giving advice, the AI's close (`src/lib/advice/prompt.ts` ROUTING section) is two-part: (1) invite the visitor to add LINE @roogondee and message us — or call 081-902-3540 — if new questions come up or symptoms don't improve after a couple of days, making clear the team arranges a doctor visit at the partner hospital when self-care isn't enough; (2) offer once (not repeated) to leave a name + phone via `create_lead` so the team can call to check on progress in a few days, not just for an immediate callback. `AdviceChat.tsx` renders a matching LINE/call follow-up rail under the chat once the AI has replied at least once, hidden while the `recommend_service` CTA card is showing.
- **Lead capture strategy (2026-08-17)**: downstream nurture already exists (`nurture-runner` cron + `lead_nurture_log` with a 5-day cooldown, `voucher-reminders`, `daily-followup-digest`, `notifyLeadToSale` into the sales LINE group), so the bottleneck was the *ask* inside the chat, not the follow-up. The offer for a general-illness visitor is a **free symptom follow-up call** — chosen because it costs nothing to give, unlike the pillars' free tests, and general illness has no voucher of its own. Mechanics, all in `prompt.ts` ROUTING: (1) the ask is **hooked to the day-N threshold the assessment just produced** ("ควรพบแพทย์ถ้าไข้ไม่ลงภายในวันพุธ — ให้พยาบาลโทรเช็กวันพุธเลยไหมคะ") rather than being a separate generic "ฝากเบอร์ไว้", and must name the visitor's own symptom + day count; (2) it's a yes/no question first, contact details only after they agree; (3) declined → accept and move on, but one more ask (different angle, LINE) is allowed if they then ask 2+ further questions; (4) `urgent` triage swaps the offer to "ให้ทีมช่วยประสานนัดหมอให้เลยไหมคะ" since there's no N-day window. `create_lead`'s `note` carries the day-N and what to ask so the nurse opens with the right question. **Never gate the advice behind contact details** — bad for someone who is sick, and bad for Google Ads landing-page experience. Funnel is measurable via `advice_start` → `advice_assessment` (fires on handoff, from the `phase` field in the `/api/advice` response) → `advice_lead`, so drop-off during history-taking is distinguishable from drop-off at the ask.
- Not wired into any of the 8 pillar landing pages yet — deliberate, so `/advice`'s performance against paid search can be measured before touching funnels that already convert via LIFF quiz.

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
- GA4 measurement ID `G-THP6CDXR0L` (linked to Google Ads) — hardcoded primary in `src/app/layout.tsx`, gtag.js server-rendered (so Google tag checkers detect it). `NEXT_PUBLIC_GA_ID` adds a SECOND property alongside it, never replaces (Vercel prod has `G-TS4XWH5NJD` set). Google Consent Mode: defaults denied (cookieless pings) until PDPA banner accepted; `Pixels.tsx` fires `gtag('consent','update')`. Meta/TikTok pixels stay fully consent-gated in `Pixels.tsx`
- **Google Ads conversions** — `ADS_CONVERSIONS` in `src/lib/analytics/track.ts` maps internal events (`advice_lead`, `advice_followup_call_click`, `advice_followup_line_click`) to the native Ads event `ads_conversion_Contact_Us_1`; `track()` fires it automatically so no call site changes. **Never paste Google's snippet into `<head>`** as its setup screen says — there it fires on every page load and every pageview becomes a conversion. `advice_1669_call_click` is deliberately unmapped (emergency call, not a lead). Needs `NEXT_PUBLIC_GOOGLE_ADS_ID` (`AW-…`) on Vercel for the tag to carry an Ads destination. A native Ads conversion action works without GA4 having seen the event first — unlike the GA4 key-event import, so it does not depend on `advice_lead` having fired before launch.
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
- `docs/liff-quiz-setup.md` — Setup guide for `/liff/quiz` (LINE Login channel, LIFF app, rich menu URLs, env vars, test checklist)
- `docs/mind-ai-intake-spec.md` — Spec for Phase 3 — using Claude Sonnet to scale `mind` (pre-session intake, between-session check-ins, psychoeducation Q&A). Strict guardrails: AI never diagnoses, surfaces 1323 on crisis. Phase 3 only after Phase 2 in-house team is live.
- `docs/advice-google-ads.md` — Google Ads brief for the `/advice` general-illness landing: keyword theme + negatives, gclid tracking template, conversion actions to configure, offline conversion import query, healthcare ad-policy notes, sales team SOP for `source='advice-chat'` leads.

## FB Page Stories (daily autopost)
- `scripts/fb_story.py` + `.github/workflows/fb_story.yml` — cron 02:00 UTC = 09:00 BKK
- Rotates `glp1 → std → ckd` by day-of-year (skip `foreign` B2B; `mens` opt-in via `STORY_INCLUDE_MENS=1`)
- Story type cycles `fact → question → tip → voucher → myth` (5-day cycle)
- Caption gen: Claude Haiku 4.5 → JSON `{headline, subline, caption, cta}`; mens compliance gate reuses `compliance.check_caption_compliance`
- Image: 1080x1920 composed with Pillow + Sarabun (SIL OFL, downloaded at runtime, cached in `scripts/fonts/`); FLUX background optional, gradient fallback if `TOGETHER_API_KEY` absent
- Posts via Graph API v19: `POST /{page-id}/photos?published=false` → `POST /{page-id}/photo_stories?photo_id=…` (uses existing `pages_manage_posts`)
- Tracked in `fb_stories` table with unique `(posted_date, service)` index → safe to re-run cron
- Manual: `workflow_dispatch` accepts `service` override + `dry_run` (skip Graph API, save preview to `/tmp`)

## FB Graph auth
- `scripts/fb_graph.py` — helper กลางของ Python scripts ที่ยิง Graph API (`fb_story.py`, `fb_caption.py`)
- `preflight_page_token()` ถูกเรียก **ก่อน** gen caption/รูป → token พังแล้ว job จบทันที ไม่เสีย Claude/FLUX quota
- แยกประเภท error: auth (190) vs permission (200/10/3) vs rate limit (4/17/32/613) — codes มาก่อน `type` เสมอ เพราะ Graph ส่ง `OAuthException` มาทั้งสามแบบ
- alert ที่ยิงเข้า Discord/LINE เป็นข้อความไทยพร้อมขั้นตอนแก้ ไม่ใช่ raw JSON ที่ถูกตัดกลางคำ
- token fingerprint (`EAAG…len=N sha256:xxxxxxxx`) ใช้เทียบว่า GitHub secret กับ Vercel เป็นตัวเดียวกัน โดยไม่เปิดเผย token
- `.github/workflows/fb_token_check.yml` — cron ทุกวันจันทร์ 08:00 BKK เตือนล่วงหน้า 7 วันก่อน token หมดอายุ (ต้องมี `FB_APP_ID` + `FB_APP_SECRET`)
- Runbook: `docs/fb-token-runbook.md` — แนะนำ **System User token (ไม่หมดอายุ)** แทน token ที่แตกจาก user token อายุ 60 วัน

## Recent decisions
- 2026-08-16: **Advice AI** shipped — `/advice` landing page for Google Ads general-illness search traffic (separate from the 8 named-service pillars, which target people who already know what they want). New `/api/advice` + `AdviceChat` component, own system prompt/tools (`src/lib/advice/*`), full detail in "Advice AI (Google Ads landing)" above. **Red-flag triage is a hard requirement, same class as the `mind` self-harm gate and `dna` consent red lines — MUST NOT be relaxed**: `src/lib/advice/triage.ts` runs deterministically before every model call; emergency/crisis messages get a hardcoded 1669/1323/1300 reply, never LLM-generated. Not linked from any pillar page yet — measuring `/advice` against paid search first. Needs `add_gclid_to_leads.sql` + `add_triage_level_to_chat_sessions.sql` migrations applied before launch, and `NEXT_PUBLIC_LIFF_QUIZ_ID` set so `recommend_service` CTAs resolve to LIFF instead of the plain add-friend link.
- 2026-08-08: FB cron (story + caption) พังจาก **error 190** ("must be an administrator, editor, or moderator") — token ที่ใช้อยู่ตายแล้ว ไม่ใช่บั๊กในโค้ด **ต้องออก Page token ใหม่ตาม `docs/fb-token-runbook.md` แล้วอัปเดตทั้ง GitHub Secrets และ Vercel** จนกว่าจะทำ cron จะยังแดงอยู่ (แต่ตอนนี้ล้มเร็วขึ้นและบอกวิธีแก้แล้ว) โค้ดที่เพิ่มคือ preflight + error classification ดู "FB Graph auth" ด้านบน
- 2026-08-07: **Web quiz retired — LINE-first funnel**. `/quiz/{service}` no longer runs the quiz; it renders `QuizGate` (server component, ad-landing copy in static HTML + client island `QuizGateActions` for utm passthrough/pixels) whose only CTA opens the LIFF quiz. Because the LIFF app's bot-link is Aggressive, LINE itself forces add-friend before the quiz renders — that is what enforces "add LINE first, then quiz". Routes kept alive so existing ads/blog/composer links still land somewhere useful; desktop visitors get a build-time QR (`quizGateQr`). All LIFF URLs come from `src/lib/liff-links.ts` (`NEXT_PUBLIC_LIFF_QUIZ_ID`, falls back to the plain OA link when unset). LINE broadcasts skip the gate and deep-link straight to LIFF. `QuizRunner` is now rendered only by `LiffQuiz`; `/api/quiz` stays live for the in-LIFF callback form. Article quiz (blog teaser) kept — no lead capture, CTA labels now say "ใน LINE".
- 2026-08-07: **LIFF quiz** shipped at `/liff/quiz?service=X` — full quiz inside LINE, zero-form. `/api/quiz/claim-line` verifies LIFF `id_token` server-side (`LINE_LOGIN_CHANNEL_ID` env, never trusts client userId) → lead created already linked (`source: quiz-liff`, `line_user_id` set, CRM contact resolved, display name as first_name) → voucher **pushed into the user's chat** via `pushVoucherToUser`. Dedup = 1 voucher/service/LINE-userId. Quota-full LIFF claims saved as `waitlist` leads (contactable, no re-notify on re-tap; voucher issuance later flips status to `new`). Mind urgent tier pushes 1323 crisis message directly to the user's chat. Anonymous web claims unchanged. Setup: `docs/liff-quiz-setup.md`; needs `NEXT_PUBLIC_LIFF_ID` + `LINE_LOGIN_CHANNEL_ID` in Vercel before rich menu rollout.
- 2026-07-31: pillar 8 **dna** (ตรวจ DNA พิสูจน์บิดา-บุตร) shipped — lead-gen only ("เรานัดหมายให้ ไม่ได้ตรวจเอง"), voucher = free consult + discount path, consent red lines locked in quiz/scoring/insight/landing copy (see Services above). Prerequisite before ads spend: confirm W Medical sample-collection workflow + ISO/IEC 17025 lab partner + price list. 8 non-th/en locales carry Thai copy (translation follow-up, same as PR #80).
- 2026-07-01 (PR #120): LINE bot got a **kill switch + daily schedule** in `src/app/api/line-webhook/route.ts`. `LINE_BOT_ENABLED=false` = fully silent. `LINE_BOT_ACTIVE_HOURS="22:00-08:00"` (evaluated in `LINE_BOT_TZ`, default `Asia/Bangkok`, wraps past midnight) = bot auto-replies overnight only, silent during the day so staff answer manually. Outside the window / when disabled the webhook still acks 200 (no AI reply, no voucher link, no follow welcome) so LINE keeps the webhook registered. Unset active-hours = 24/7 (unchanged); malformed value fails open. Requested by OA owner — daytime auto-chat felt off-brand while lead volume is still low.
- 2026-05-19 (PR #82): `mind` pillar shipped Phase 1 **waitlist mode** — `insightMind` non-urgent branches now promise callback in 1-2 weeks (not immediate 30-min session) while we recruit in-house licensed providers; flip `MIND_WAITLIST_MODE = false` in `src/lib/quiz/insight.ts` when in-house team is ready. Decision: going **in-house, not partner platforms** (Ooca/iSTRONG) — keeps 100% margin, brand consistency, and pattern-aligns with W Medical in-network model of pillars 1-6. `/mind` landing has an amber "Soft launch" banner above the hero — remove it when Phase 2 launches. Self-harm urgent branch is unchanged — still surfaces 1323 immediately. Follow-ups (separate from PR #82): `docs/mind-crisis-sop.md` (sales team SOP), `docs/mind-recruiting.md` (60-day recruiting plan), `docs/mind-ai-intake-spec.md` (Phase 3 AI assistance spec).
- 2026-05-19 (PR #80): pillars 6 + 7 shipped — **women** (สุขภาพเพศหญิง — voucher = ปรึกษาสูตินรีแพทย์ + ตรวจประเมินเบื้องต้น, W Medical) and **mind** (สุขภาพจิต & ความสัมพันธ์ — voucher = ปรึกษานักจิตวิทยา 30 นาที telehealth, partner-agnostic copy). `mind` has a SAFETY GATE on `self_harm_check`: "sometimes"/"often" → urgent + insight body surfaces hotline 1323 (กรมสุขภาพจิต, free 24/7). Crisis SOP for sales team is a separate follow-up. Mental wellness partner (Ooca / iSTRONG / W Medical / other) still TBD — copy uses neutral "ผู้เชี่ยวชาญ" wording so partner can swap without code change. Pre-existing bug fixed in same PR: `chatbot/service-detect.ts` was missing `mens` keywords; `VOUCHER_REGEX` now matches `GLP1|CKD|STD|FRN|MENS|WMN|MND`. MobileNav + FooterFull now include all 7 verticals. 8 non-th/en locales fall back via loose i18n typing — translation follow-up.
- 2026-05-08: foreign-worker tie-in pack saved at `docs/foreign-worker-tiein.md` — W Medical credentials (สบส. 001/2569, LA 7044P/2568, Iris/Facial training cert) + 9-point Work Permit checkup details + Thai copy block. Pull from this file for any next-round post/article tagged `service: 'foreign'`.
- 2026-05-06: FB Page Stories autopost shipped — daily 9am rotating glp1/std/ckd, Sarabun-rendered 9:16 covers + AI caption, no extra FB permissions needed
- 2026-04-29 (PR #33): article quiz auto-embeds on every blog post — drives readers from articles → full quiz with utm attribution by slug
- 2026-04-26: `toggleMulti` enforces exclusivity for `value='none'` and `option.exclusive: true` — fixes the "เลือกไม่มีพร้อมตัวอื่น" bug reported by Pornpat
- 2026-04-26: STD risk_types `'no_say'` marked exclusive
- 2026-04-26: needlestick label changed to "เข็มตำโดยอุบัติเหตุ (Needlestick)"
- 2026-04-25 (PR #17): rugondee-clone Vercel project deploys every push and fails — user needs to disconnect at vercel.com/roogondees-projects/rugondee-clone/settings/git
