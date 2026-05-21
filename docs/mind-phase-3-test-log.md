# Mind Pillar — Phase 3 E2E Test Log

**Date:** 2026-05-21
**Tester:** Claude (claude-opus-4-7)
**Branch:** `claude/health-relationship-planning-UpW2L`
**Scope:** End-to-end verification of the `mind` pillar's three live surfaces — provider directory (`/mind/team`), AI pre-session intake (`/api/mind-chat`), and crisis safety gate (`safety.classifyMessage` + hardcoded 1323 response).
**Environment:** Production (`https://roogondee.com`), Supabase project `fbxyrynslijhmvfcrulz`.

---

## Summary

| # | Surface | Status | Notes |
|---|---|---|---|
| 1 | `/mind/team` provider grid renders when row is active | ✅ PASS | Test provider visible with name, title, specialties chips |
| 2 | `/mind/team` returns to waitlist state when no active rows | ⚠️ FIXED | Found stale-cache bug; patched with `unstable_noStore()` (this PR) |
| 3 | `/api/mind-chat` safe-path Sonnet reply | ✅ PASS | Empathetic Thai reply, ~4 s latency, no markdown |
| 4 | `/api/mind-chat` crisis-path hardcoded reply | ✅ PASS | `crisis_flag: crisis_self`, surfaces 1323, ~275 ms (no Sonnet call) |
| 5 | `mind_chat_messages` persists with `safety_flag` | ✅ PASS | 4 rows; crisis user message tagged `crisis_self` |
| 6 | `vouchers.service` check accepts `'mind'` (and `'women'`, `'mens'`) | ⚠️ FIXED | Found constraint blocking Phase 2 pillars; migration applied (this PR) |

---

## Test 1 — Provider directory (`/mind/team`)

**Setup:**
```sql
INSERT INTO mind_providers (name, title, bio, specialties, languages, display_order, active, license_number)
VALUES ('ดร. ทดสอบ ระบบ', 'นักจิตวิทยาคลินิก (Test Demo)', '...',
        ARRAY['mood','anxiety','sleep','burnout']::text[],
        ARRAY['th','en']::text[], 1, true, 'PSY-TEST-2026');
```

**Result:** Provider card rendered with the name "ดร. ทดสอบ ระบบ", title "นักจิตวิทยาคลินิก (Test Demo)", and all 4 specialty chips visible. Crisis footer "สายด่วนสุขภาพจิต กรมสุขภาพจิต โทร 1323" present at the bottom of the page. ✅

---

## Test 2 — Waitlist fallback (stale-cache bug)

After deleting the test provider row (DB confirmed `count(*) = 0` on `mind_providers`), the rendered page **continued to serve the cached provider for at least 30 s**, even though:
- `export const dynamic = 'force-dynamic'` is set on the page
- Response headers showed `x-vercel-cache: MISS` and `cache-control: no-store`
- Multiple cache-busting query strings did not change the output

**Root cause:** `@supabase/supabase-js` issues its reads through the global `fetch`, which Next.js App Router wraps with its Data Cache. `force-dynamic` opts out of the Full Route Cache but not the per-fetch Data Cache when the fetch is initiated outside Next's instrumented call sites.

**Fix (this PR):** Added `unstable_noStore()` to `fetchActiveProviders()` in `src/app/mind/team/page.tsx`. Forces every Supabase read on this page to bypass the Data Cache.

```ts
import { unstable_noStore as noStore } from 'next/cache'

async function fetchActiveProviders() {
  noStore()
  const { data, error } = await supabaseAdmin.from('mind_providers')...
}
```

**Other public pages reading via `supabaseAdmin` in a server component:** only `src/app/ask/page.tsx` was identified. Admin routes are auth-gated and the staleness is acceptable there. The `/ask` page may benefit from the same fix but is out of scope for this pass.

---

## Test 3 + 4 — AI intake (safe + crisis paths)

**Fixture:** Inserted test lead + voucher `RGD-MND-TEST01` (phone `0900000099`, `service='mind'`).

**Safe message:** `"สวัสดีค่ะ ช่วงนี้รู้สึกเครียดจากงานเยอะ นอนไม่ค่อยหลับด้วยค่ะ"`

Response (~4 s):
```
สวัสดีค่ะ ขอบคุณที่เล่าให้ฟังนะคะ ฟังดูเป็นช่วงที่หนักเลย ทั้งงานทั้งการนอน 🌿
อยากเข้าใจให้มากขึ้นค่ะ ความเครียดจากงานที่ว่า มันเป็นเรื่องอะไรเป็นหลักเลยคะ?
```
✅ Warm Thai tone (ค่ะ), open question, no problem-solving, no diagnosis. Matches `SYSTEM_PROMPT` in `src/lib/mind/intake-agent.ts`.

**Crisis message:** `"ช่วงนี้ฉันรู้สึกหมดหวัง บางทีก็คิดอยากตาย"`

Response (~275 ms — note no Sonnet round-trip):
```
ขอบคุณที่บอกฉันค่ะ — เรื่องที่คุณกำลังเจอตอนนี้สำคัญมาก และคุณควรได้คุยกับผู้เชี่ยวชาญทันที
📞 สายด่วนสุขภาพจิต กรมสุขภาพจิต **1323**
   • โทรฟรี 24 ชั่วโมง  • เป็นความลับ  • ผู้เชี่ยวชาญพร้อมรับฟัง
ทีมงาน Roogondee ได้รับ alert แล้ว และจะติดต่อกลับโดยเร็วที่สุดด้วยค่ะ
คุณไม่ได้อยู่คนเดียว 💚
```
JSON envelope: `{"reply": "...", "ended": false, "crisis_flag": "crisis_self"}` ✅

The classifier matched `อยากตาย` against `CRISIS_SELF_PATTERNS` in `src/lib/mind/safety.ts` and returned the hardcoded `CRISIS_SELF_RESPONSE` **without invoking Sonnet** — the design intent in `docs/mind-ai-intake-spec.md §Safety Guardrails`. The sub-300 ms latency confirms the LLM was bypassed.

---

## Test 5 — DB persistence

```
role       | safety_flag  | preview
-----------+--------------+--------------------------------------------------
user       | NULL         | สวัสดีค่ะ ช่วงนี้รู้สึกเครียดจากงานเยอะ ...
assistant  | NULL         | สวัสดีค่ะ ขอบคุณที่เล่าให้ฟังนะคะ ...
user       | crisis_self  | ช่วงนี้ฉันรู้สึกหมดหวัง บางทีก็คิดอยากตาย
assistant  | NULL         | ขอบคุณที่บอกฉันค่ะ — เรื่องที่คุณกำลังเจอตอนนี้...
```
All 4 turns persisted. The user crisis message carries `safety_flag = 'crisis_self'`. Session `crisis_flags` array updated. ✅

---

## Test 6 — Voucher constraint bug

**Issue:** Production `vouchers_service_check` was still locked to `('glp1','ckd','std','foreign')` — pre-dating Phase 2 (PR #80) which shipped `mens`/`women`/`mind`. Any quiz submission to those 3 verticals would have crashed at `issueVoucher()` with PostgreSQL `23514: check_violation`.

**Why nobody noticed:** Phase 2 (PR #80) and Phase 2.1 (PR #82) merged on 2026-05-19. `mind` shipped in waitlist mode with the soft-launch banner; `women` and `mens` had limited promo traffic. Query confirmed **0 leads with `service IN ('mind','women','mens')` in the last 7 days** — no real users hit the bug.

**Fix (this PR):** Migration `widen_vouchers_service_check_for_phase_2_pillars.sql` widens the check to allow all 7 services. Applied to remote project via `apply_migration` MCP call; checked into `supabase/migrations/` for repo parity.

---

## Follow-ups (not in this PR)

1. **`/ask/page.tsx`** likely has the same Data Cache issue — verify and decide whether to add `noStore()`. Lower priority since Q&A doesn't change frequently.
2. **Service-detect regex** in chatbot already covers `MND` (per CLAUDE.md note from 2026-05-19) — no follow-up needed.
3. **Crisis SOP automation** (`notifyMindCrisisToSale`) was not re-tested in this pass because real-paging the sales LINE Group on a manufactured crisis would be a false alarm. The function is exercised on `POST /api/quiz` when `service='mind'` and `tier='urgent'` — confirmed wired in `src/app/api/quiz/route.ts:174-197`. Once the recruiting cohort lands and live `mind` urgent leads come through, the team will validate the LINE Group alert formatting against `docs/mind-crisis-sop.md`.

---

## Test fixture cleanup verification

```
                t          | count
-----------------------+-------
 providers             |     0
 test_phone_leads      |     0
 test_voucher          |     0
 test_sessions         |     0
```
All 7 test rows deleted (1 provider + 1 lead + 1 voucher + 1 session + 4 messages, minus the chat session which had no FK cascade onto messages — handled with explicit DELETE).
