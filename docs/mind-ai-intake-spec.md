# Mind Pillar — AI Intake Assistant Spec

Spec สำหรับใช้ Claude Sonnet **ช่วย scale** บริการ `mind` — **ไม่ใช่แทน** นักจิตวิทยา/จิตแพทย์
Phase 3 enhancement (หลัง Phase 2 launch + in-house team พร้อม)

## TL;DR

AI ทำได้ 3 อย่าง: (1) intake ก่อน session, (2) check-in ระหว่าง session, (3) psychoeducation
AI **ห้าม**: วินิจฉัย, สั่งยา, ทำ therapy แทนคน, จัดการ crisis ด้วยตัวเอง

## Legal / Ethical Boundary

> พ.ร.บ. ผู้ประกอบวิชาชีพจิตวิทยาคลินิก พ.ศ. 2562 — การให้บริการทางจิตวิทยาคลินิก (วินิจฉัย/บำบัด) ต้องเป็นบุคคลที่มีใบอนุญาต — AI ไม่ใช่บุคคล = ทำแทนไม่ได้

ทุก output ของ AI ต้องระบุชัดเจน:
- "ฉันเป็น AI ผู้ช่วย ไม่ใช่นักจิตวิทยา"
- "ข้อมูลของฉันเพื่อการศึกษาและคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย"
- "การวินิจฉัย/รักษาทุกกรณี ต้องผ่านผู้เชี่ยวชาญที่มีใบอนุญาต"

## Three Use Cases

### Use Case 1: Pre-Session Intake (most valuable)

**ปัญหาที่แก้**: นักจิตวิทยา session 30-50 นาทีหายไปครึ่งกับการถามประวัติ — wasted clinical time

**Solution**: ก่อน session, lead chat กับ AI 10-15 นาที, AI สรุปเป็น **structured intake note** ส่งให้ provider อ่านก่อน session

**Flow**:
```
Lead กรอกแบบประเมิน (quiz mind, 7 ข้อ)
   ↓
ได้ voucher RGD-MND-XXXXXX + นัด session ใน 1-2 wk
   ↓
24 ชม. ก่อน session → ส่ง LINE: "อยากเตรียมตัวให้ session คุ้มที่สุดไหม?
                                 คุยกับ AI 10 นาที จะช่วยให้นักจิตวิทยาเข้าใจคุณเร็วขึ้น"
   ↓
Lead กดลิงก์ → /mind/intake/<voucher> (chat UI)
   ↓
AI ถาม semi-structured questions (15-20 turns):
   - Trigger event / context
   - Symptoms timeline + severity
   - Past mental health history
   - Current support system
   - Substance use (screening, non-judgmental)
   - Goals สำหรับ therapy
   - Format preference (CBT / talk / mindfulness / ไม่รู้)
   ↓
AI summarize → save to leads.intake_note + email/LINE ให้ provider
   ↓
Session: provider อ่าน intake note 5 นาทีก่อนเริ่ม, แทบไม่ต้องถามประวัติ
```

**System prompt design** (key principles):
```
You are an empathetic intake assistant for Roogondee, a Thai mental health platform.

ROLE:
- Help the user prepare for their upcoming therapy session by gathering context
- You are NOT a therapist. You DO NOT diagnose, treat, or give advice
- Your output is read by the licensed clinical psychologist who will see this user

TONE (in Thai by default, switch to English if user uses English):
- Warm, curious, non-judgmental
- Open questions over closed ones
- Mirror back to show understanding
- Never minimize ("it's not that bad")
- Never problem-solve ("have you tried X?")

GUARDRAILS (CRITICAL):
- If user mentions self-harm thoughts → IMMEDIATELY surface สายด่วน 1323
  and stop intake — escalate to human via LINE Group notification
- If user mentions substance crisis, abuse, recent violence → escalate
- Never claim a diagnosis ("you sound depressed", "this is anxiety")
- Never recommend medications
- If user asks for clinical advice, redirect: "เก็บคำถามนี้ไว้ถามคุณหมอ
  ในเซสชั่นนะคะ — เขาจะตอบให้คุณตามกรณีคุณ"

LENGTH:
- 15-25 turns total
- ถ้า user สั้น respond สั้น ถ้า user เปิดใจ ค่อย go deeper
- End with: "ขอบคุณที่แชร์ค่ะ ฉันจะส่งสรุปให้คุณหมอก่อน session
            พบกันวันที่ X เวลา Y นะคะ 🌱"

OUTPUT FORMAT (after chat ends, generate structured summary):
{
  "presenting_concern": "...",
  "duration_severity": "...",
  "key_triggers": ["..."],
  "history_relevant": "...",
  "support_system": "...",
  "substance_use_flag": true|false,
  "goals_stated": "...",
  "preferred_modality": "...",
  "risk_flags": ["self_harm" | "substance" | "violence" | "none"],
  "raw_quotes_useful_for_clinician": ["...", "..."]
}
```

### Use Case 2: Between-Session Check-Ins (Phase 4)

**ปัญหาที่แก้**: ระหว่าง session (2-4 wk gap), client ตกหลุมเดิม — ไม่มี continuity

**Solution**: AI ส่งข้อความใน LINE 2-3 ครั้ง/สัปดาห์ ทำ:
- Mood check-in 1 บรรทัด ("วันนี้ feeling 1-10 ค่ะ?")
- Reminder ของ technique ที่ provider แนะนำ (ไม่ใช่ AI คิดเอง — provider ใส่ใน "homework field")
- Journaling prompt (เก็บไว้ให้ provider อ่าน session ถัดไป)

**Important**: AI ไม่ทำ active therapy — แค่ scaffold ตามที่ provider designed

### Use Case 3: Psychoeducation Q&A (Phase 3)

**ปัญหาที่แก้**: คนสงสัยเรื่องสุขภาพจิตทั่วไป — ไม่จำเป็นต้องเสีย session 30 นาทีถามคำถามพื้นฐาน

**Solution**: ขยาย `/api/ask` (มีอยู่แล้ว) ให้รับ mental-health Q&A พร้อม guardrails

ตัวอย่างคำถามที่ AI ตอบได้:
- "CBT คืออะไร?"
- "นอนไม่หลับ technique อะไรลองได้บ้าง?"
- "ทำยังไงให้พ่อแม่เข้าใจว่าเราต้องการ therapy?"

ตัวอย่างที่ AI redirect ไป provider:
- "ผมน่าจะ depression ใช่ไหม?" → "เรื่องวินิจฉัยให้นักจิตวิทยาประเมินค่ะ ทำแบบประเมินที่ /quiz/mind ได้นะคะ"
- "ทานยา X อยู่ ผลข้างเคียงเป็นแบบนี้ปกติไหม?" → "ปรึกษาแพทย์ที่สั่งยาทันทีค่ะ — หรือโทร 1669 ถ้าฉุกเฉิน"

## Architecture

```
Client (LINE / web chat UI)
    ↓
/api/mind-chat (POST)
    ↓
src/lib/mind/intake-agent.ts (new)
    ├── Load conversation history from Supabase (mind_chat_sessions table)
    ├── Append user turn
    ├── Run safety classifier (cheap: regex + Haiku check)
    │   ├── Crisis keywords → respond with 1323 + escalate + log incident
    │   └── Substance/violence → flag + continue carefully
    ├── Call claude-sonnet-4-6 with system prompt + history
    ├── Save assistant turn
    ├── If conversation ≥ N turns → generate structured summary + close
    └── Return assistant response
```

**Model choice**:
- **claude-sonnet-4-6** for actual intake chat (empathy, nuance)
- **claude-haiku-4-5** for safety classifier (fast, cheap)
- **Prompt caching**: system prompt is fixed ~1.5k tokens → cache once, save 90% input cost

**Cost estimate** (per intake session, 20 turns):
- Sonnet input: ~5k tokens × $3/M = $0.015
- Sonnet output: ~3k tokens × $15/M = $0.045
- Haiku safety check × 20: ~10k tokens × $0.80/M = $0.008
- **Total: ~$0.07/intake** (≈ 2.5฿)

Profitable: each intake saves provider 10 min × 2,000฿/hr = 333฿ saved per session

## Safety Guardrails (CRITICAL — non-negotiable)

```typescript
// src/lib/mind/safety.ts
const CRISIS_PATTERNS = [
  /ทำร้ายตัวเอง|ฆ่าตัวตาย|ไม่อยากอยู่|อยากตาย/,
  /kill myself|suicide|self-harm|don't want to live/i,
  /กินยาเกิน|กรีดตัว|หลังคา|หน้าผา/,
]

const SUBSTANCE_CRISIS = [
  /ยาเสพ?ติด.*overdose|overdose|กินยาไป \d+/,
]

const VIOLENCE_PATTERNS = [
  /โดนทำร้าย|โดนตี|โดนข่มขืน|โดนทำร้ายร่างกาย/,
]

export function classifyMessage(text: string): SafetyFlag {
  if (CRISIS_PATTERNS.some(p => p.test(text))) return 'crisis_self'
  if (SUBSTANCE_CRISIS.some(p => p.test(text))) return 'crisis_substance'
  if (VIOLENCE_PATTERNS.some(p => p.test(text))) return 'violence'
  return 'safe'
}
```

When `safe !== true`:
1. AI response replaced with crisis message (hardcoded, not LLM-generated)
2. LINE Group notification fires: `🚨 MIND CRISIS chat session <id>`
3. Lead row updated: `lead.note += "[crisis flag at HH:mm]"`
4. AI session paused — human must intervene

**Crisis response template** (hardcoded, never LLM):
```
ขอบคุณที่บอกฉันค่ะ — เรื่องที่คุณกำลังเจอตอนนี้สำคัญมาก
และคุณควรได้คุยกับผู้เชี่ยวชาญทันที

📞 สายด่วนสุขภาพจิต กรมสุขภาพจิต **1323**
   - โทรฟรี 24 ชั่วโมง
   - เป็นความลับ
   - ผู้เชี่ยวชาญพร้อมรับฟัง

ทีมงาน Roogondee ได้รับ alert แล้ว และจะติดต่อกลับโดยเร็วที่สุดด้วยค่ะ
คุณไม่ได้อยู่คนเดียว 💚
```

## Privacy & Data

- **Storage**: Supabase `mind_chat_sessions` table — encrypted at rest (Supabase default)
- **Retention**: 90 วัน หลัง session conclude — auto-purge
- **Provider access**: read-only ของ intake summary + raw chat (audit logged)
- **User access**: API endpoint ลบข้อมูลของตัวเองได้ทันที (PDPA right to be forgotten)
- **No third-party**: Anthropic API ไม่ retain training data (Zero Data Retention agreement)

## Schema

```sql
create table public.mind_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  voucher_code text,  -- RGD-MND-XXXXXX
  started_at timestamptz default now(),
  ended_at timestamptz,
  message_count int default 0,
  summary jsonb,  -- structured intake note
  crisis_flags text[],  -- ['self_harm', 'substance', 'violence']
  provider_viewed_at timestamptz,
  purge_at timestamptz default (now() + interval '90 days')
);

create table public.mind_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references mind_chat_sessions(id) on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text not null,
  safety_flag text,
  created_at timestamptz default now()
);
```

## Rollout Plan

| Phase | Trigger | Scope |
|---|---|---|
| Phase 3a | After Phase 2 (in-house team live) + 30 days data | Pre-session intake only, opt-in, 10 beta users |
| Phase 3b | Beta success (provider feedback ≥ 4/5) | Open to all leads, default opt-in |
| Phase 4a | 3 mo post-3b | Between-session check-ins |
| Phase 4b | 6 mo | Psychoeducation Q&A |
| Phase 5 | TBD | Couples intake (more complex) |

## Success Metrics

- **Provider time saved per session**: target 10+ min
- **Intake completion rate**: target 60% of those nudged
- **Crisis flag false-positive rate**: target < 5%
- **Crisis flag false-negative rate**: target 0% (audit every miss)
- **User satisfaction with intake**: target NPS 40+
- **Provider satisfaction with intake notes**: target 4/5

## Open Questions (to resolve before build)

1. **Voice intake?** — บางคนพิมพ์ภาษาไทยช้า — มี value มากกว่าใน voice-first interface ไหม?
2. **Multilingual?** — `mind` ใช้ในไทยเป็นหลัก — เปิด en/zh/jp ต่อตอน Phase 4 ไหม?
3. **Provider customization?** — provider แต่ละคนอยากให้ AI ถามเพิ่ม/ลด สำหรับ specialty ของเขาได้ไหม?
4. **AI tone variants?** — younger demographic (vai 20-29) อาจต้องการ tone ที่ casual กว่า — A/B test?

---

**Last updated**: 2026-05-19
**Status**: Spec only, not in roadmap for next 60 days (Phase 1-2 first)
