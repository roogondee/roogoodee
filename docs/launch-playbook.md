# Launch Playbook — ระบบแจก Lab Test ฟรี

Adapt this before using. Every number (budget, quota, SLA) is a starting
assumption — verify with W Medical and current cost data.

---

## Phase 0 — Pre-launch setup (Day −7 to Day 0)

### Code + env (ฝั่ง dev)

- [ ] Merge PR #12
- [ ] Apply migrations in order:
      `create_lab_test_system` → `add_voucher_reminder` →
      `add_pdpa_compliance` → `add_line_user_id` → `add_admin_users_acl`
- [ ] Set Vercel env vars:
  - `SUPABASE_*` (already set)
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY`
  - `LINE_CHANNEL_SECRET` + `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_NOTIFY_GROUP_ID`
  - `ENCRYPTION_KEY` (64-char hex — **backup securely, losing it = unreadable STD data**)
  - `SESSION_SECRET` (any long random string)
  - `CRON_SECRET` (optional, if using external scheduler)
  - `ADMIN_SECRET` (legacy bootstrap — remove after first user created)

### LINE OA setup (ฝั่ง ops)

- [ ] สร้าง Official Account ที่ https://manager.line.biz
- [ ] Messaging API → issue Channel secret + access token
- [ ] Webhook URL: `https://roogondee.com/api/line-webhook` + toggle ON
- [ ] ปิด "Auto-reply" + "Greeting message" (webhook handles)
- [ ] Add bot ใน W Medical sales group → Vercel logs หา `GROUP_ID:` → set as `LINE_NOTIFY_GROUP_ID`
- [ ] (Optional) Rich menu with quiz links + OA contact

### Admin bootstrap

- [ ] Login ด้วย `ADMIN_SECRET` → ไป `/admin/users`
- [ ] สร้าง manager user จริง (your email + strong password)
- [ ] Logout → login ใหม่ด้วย email/password
- [ ] Remove `ADMIN_SECRET` from Vercel (legacy path now closed)
- [ ] เพิ่มคน W Medical (role=sale หรือ manager) ตามโครงสร้างที่ตกลงกันไว้

### Verification checks

- [ ] `npm run build` passes locally and on Vercel
- [ ] `/admin/analytics` loads (shows zero data — that's fine)
- [ ] `/admin/redeem` loads + form shows
- [ ] `/quiz/glp1`, `/quiz/ckd`, `/quiz/std` load and don't 500
- [ ] Submit one test quiz per service with fake data → check:
  - LINE card arrives in W Medical group
  - Voucher code appears in `/admin` leads table
  - Voucher redemption at `/admin/redeem` updates lead status to `visited`

---

## Phase 1 — Internal soft launch (Day 1 to Day 3)

Goal: find bugs with zero ad spend. Do NOT turn on ads yet.

- [ ] Ask 10-15 team members/friends to submit a real quiz end-to-end
- [ ] Verify each service flow:
  - Quiz UI usable on mobile (iOS + Android)
  - Voucher email arrives within 30 seconds
  - LINE handoff card readable + contains all required info
  - Bounce scenarios: expired voucher, already-used voucher, unknown code
- [ ] W Medical team confirms:
  - Can read LINE handoff quickly
  - Can contact customer using info in LINE alone (no admin login needed)
  - Redemption flow at hospital works
- [ ] Check all 3 services scoring:
  - Submit with high-risk answers → tier=hot, reasons correct
  - Submit with no-risk answers → tier=cold
  - STD with `<72h` → tier=urgent, notification fires with 🚨

**Red flags that must be fixed before Phase 2:**
- LINE webhook not delivering to sale group (LINE_NOTIFY_GROUP_ID wrong)
- Voucher codes colliding or emails not sending
- Quiz completion < 50% on mobile (UX issue)
- reCAPTCHA v3 blocking legitimate users (score threshold too tight)

---

## Phase 2 — Paid launch, Day 4 to Day 7

Budget: **฿500-1,500/day** (low, for learning). Don't exceed this window's
50 vouchers/service quota; we need data before scaling.

- [ ] Enable ads on one service first (suggest GLP-1 — largest addressable market)
  - Facebook: 1 campaign, 2-3 ad sets (audience: TH women 25-45, BMI topic interest)
  - Creative: include "ฟรี 500฿" + "ทำ quiz 2 นาที" + trust signal (W Medical)
  - Use UTM: `utm_source=fb&utm_medium=cpc&utm_campaign=glp1_launch`
- [ ] Watch `/admin/analytics` every morning:
  - CPL target < ฿150
  - Quiz completion target > 60%
  - Bounce rate on quiz Q1 < 30%
- [ ] Daily Slack/LINE standup with W Medical:
  - How many leads contacted?
  - How many came in?
  - Any lead quality complaints?
- [ ] If CPL > ฿300 after day 5 → pause and iterate creative before scaling

---

## Phase 3 — Scale, Day 8 onward

Only if Phase 2 hit the KPIs.

- [ ] Turn on CKD + STD campaigns
- [ ] Raise daily budget to ฿2,000-5,000 if CPL stays < ฿150
- [ ] A/B test on quiz: shorter vs longer copy, different headlines
- [ ] Retargeting setup: users who started quiz but abandoned at step 3+
- [ ] Email drip for unredeemed-voucher leads (nothing built yet — manual export from `/admin` + send via Mailchimp)

### Weekly review ritual

- Monday morning: `/admin/analytics` screenshot → team review
- Review funnel:
  - Lead → Contacted %: target > 90% within 24 hr. If low, W Medical workflow issue.
  - Voucher Redemption %: target > 30%. If low, check expiry reminder cron + LINE link rate.
  - Visit → Customer %: target > 40%. If low, hospital upsell opportunity (out of our scope, but flag).
- Pause any UTM source where CPA > ฿2,000

---

## Rollback criteria

Pause all ads if:
- Overall conversion (lead → customer) < 2% after 2 weeks (expected 5-8%)
- W Medical capacity constraint: hospital can't handle lead volume
- Any PDPA complaint filed (review data handling, then resume)
- Quiz API error rate > 1% (check logs, fix before reopening ads)

---

## When to revisit this doc

- End of Phase 2 (Day 7) — update numbers based on real data
- Any major funnel change (new service, new creative direction)
- After 1 month launch — assess which assumptions held
