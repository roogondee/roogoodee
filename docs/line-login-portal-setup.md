# LINE Login — Patient Portal Setup

How the patient results portal (`/portal`) authenticates customers with LINE,
and how to configure it. Distinct from the Messaging API channel (`@roogondee`
OA) used by the chatbot/autopost.

## Channels involved
- **Messaging API channel** "รู้ก่อนดี(รู้งี้)" — chatbot, push, autopost. Env:
  `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`.
- **LINE Login channel** "roogondee Login" — patient portal sign-in ONLY. Env:
  `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`.

Both live under the same LINE provider, which lets a follower's `userId` line up
across the two channels.

## One-time configuration

1. **LINE Developers console → channel "roogondee Login" → Basic settings**
   - copy **Channel ID** → Vercel env `LINE_LOGIN_CHANNEL_ID`
   - copy **Channel secret** → Vercel env `LINE_LOGIN_CHANNEL_SECRET`

2. **tab LINE Login → Callback URL** — add exactly:
   ```
   https://roogondee.com/api/portal/line/callback
   ```

3. **Publish the channel** (status must not stay "Developing", otherwise only
   testers added to the channel can sign in — real customers cannot).

4. **Vercel → project roogoodee → Settings → Environment Variables** (scope
   Production): add the two vars above, then **redeploy** — env vars only take
   effect on builds created *after* they are added.

If the env vars are absent the portal degrades gracefully: `/portal` shows a
"coming soon" notice and `/api/portal/line/start` redirects to
`/portal?error=unavailable` (see `lineLoginConfigured()` in
`src/lib/line-login.ts`).

## Customer flow
1. `/portal` → "เข้าสู่ระบบด้วย LINE" → LINE OAuth.
2. First time: after LINE verifies, the patient enters a **staff-issued claim
   code** (`/portal/claim`) which links their LINE `userId` to `patients.line_id`.
3. Thereafter: LINE login lands straight on `/portal/results`, showing only that
   patient's **confirmed** reports + year-over-year trends.

## Staff: issuing a claim code
Admin → `/admin/lab/{patient}` → "ออกรหัสให้คนไข้ดูผลออนไลน์" → 8-char single-use
code, valid 14 days (`patient_claim_codes`). Give it to the patient to enter once.

## Security notes
- Patient sessions (`patient_session` cookie) are entirely separate from the
  admin session and can never reach admin tooling.
- Every portal load re-verifies that the LINE id still matches the patient row,
  so unlinking in the DB logs the patient out immediately.
- Claim codes are single-use (conditional update guards against double-redeem).
