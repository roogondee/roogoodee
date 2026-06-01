import { anthropicSonnet, CONTENT_MODEL } from '@/lib/anthropic/content-gen'
import { getReferenceRange } from './reference'
import { computeHealthScore } from './score'
import { deriveUpsell } from './upsell'
import type { LabAnalyte, LabExtractionResult, LabInterpretation } from './types'

type ImageMedia = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

interface PatientCtx {
  gender?: 'male' | 'female' | 'other' | null
  dob?: string | null
}

function stripFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยอ่านและแปลผลใบรายงานผลตรวจแลป (lab report) สำหรับบุคลากรภายในของคลินิก/โรงพยาบาล (ไม่ใช่สำหรับผู้ป่วยโดยตรง)

อ่านรูป/ไฟล์ที่แนบ แล้วดึงข้อมูล "ทุกค่า analyte ที่ปรากฏจริงบนใบ" ห้ามแต่งค่าที่ไม่มี ถ้าค่าใดอ่านไม่ออกให้ใส่ flag เป็น "unknown" และไม่ต้องใส่ numeric_value (ห้ามเดา)

ส่งคืนเป็น JSON เท่านั้น ไม่มีคำอธิบาย ไม่มี markdown fence ตาม schema นี้:
{
  "report_date": "YYYY-MM-DD หรือ null ถ้าไม่พบ",
  "lab_name": "ชื่อแล็บ/โรงพยาบาลที่ออกผล หรือ null",
  "analytes": [
    {
      "test_name": "ชื่อตามที่พิมพ์บนใบ (คงภาษาไทย/อังกฤษเดิม)",
      "canonical": "slug อังกฤษเมื่อมั่นใจ เช่น hba1c, fbs, ldl, hdl, triglyceride, cholesterol, creatinine, egfr, alt, ast, urine_protein, hemoglobin, hematocrit",
      "loinc": "รหัส LOINC เมื่อมั่นใจ เช่น 4548-4 (HbA1c) มิฉะนั้นเว้นว่าง",
      "value": "ค่าเป็น string เช่น \"120\", \"<5\", \"positive\"",
      "numeric_value": 120,
      "unit": "หน่วย (UCUM) เช่น mg/dL, %, U/L",
      "reference_range": "ช่วงอ้างอิงตามที่พิมพ์บนใบ เช่น \"70-99\"",
      "ref_low": 70,
      "ref_high": 99,
      "flag": "หนึ่งใน N,H,L,HH,LL,A,unknown",
      "category": "กลุ่ม เช่น glucose, lipid, kidney, liver, cbc, urine"
    }
  ],
  "interpretation": {
    "headline": "พาดหัวสั้นภาษาไทย",
    "summary": "สรุปภาพรวมภาษาไทย น้ำเสียงให้กำลังใจ ไม่ตัดสิน",
    "findings": ["ข้อสังเกตของค่าที่ผิดปกติ เป็น bullet ภาษาไทย"],
    "recommendation": "คำแนะนำขั้นต่อไปภาษาไทย",
    "disclaimer": "ผลนี้เป็นการช่วยอ่านเบื้องต้น ควรพบแพทย์เพื่อการวินิจฉัยที่ถูกต้อง",
    "urgent": false,
    "health_score": 0,
    "risk_level": "green"
  },
  "interpretation_en": { "ข้อมูลเดียวกับ interpretation แต่เป็นภาษาอังกฤษ" },
  "upsell": [
    { "kind": "clinical_followup", "title": "ชื่อแพ็กเกจตรวจเพิ่ม", "recommended_tests": ["รายการตรวจ"], "reason": "เหตุผลภาษาไทย", "location": "W Medical Hospital สมุทรสาคร" },
    { "kind": "pillar", "service": "หนึ่งใน glp1,ckd,std,mens,women,mind", "reason": "เหตุผลภาษาไทย" }
  ]
}

กฎการกำหนด flag:
- เทียบ numeric_value กับ ref_low/ref_high: ต่ำกว่า=L, สูงกว่า=H, อยู่ในช่วง=N
- ใช้ HH/LL เฉพาะค่าวิกฤต (panic) เท่านั้น เช่น glucose>250, K>6, creatinine>3, Hb<7
- urgent=true เมื่อมีค่า HH หรือ LL

กฎ upsell — ให้แนะนำทั้งสองแบบเมื่อเหมาะสม:
- clinical_followup: การตรวจมาตรฐานเพิ่มเติมตามค่าที่ผิดปกติ (เช่น LDL สูง → ตรวจ lipid profile เต็ม + FBS/HbA1c)
- pillar: บริการของ Roogondee ที่เกี่ยวข้อง (FBS/HbA1c สูง→glp1, creatinine/eGFR/urine protein ผิดปกติ→ckd, ไขมัน/ฮอร์โมนชาย→mens, ฮอร์โมน/มะเร็งปากมดลูก→women, ความเสี่ยงติดเชื้อ→std)`

// Recompute basic flag from numeric value + reference bounds, but preserve the
// model's critical (HH/LL) and qualitative (A) calls.
function recomputeFlag(a: LabAnalyte): LabAnalyte['flag'] {
  if (a.flag === 'HH' || a.flag === 'LL' || a.flag === 'A' || a.flag === 'unknown') return a.flag
  if (a.numeric_value == null) return a.flag
  if (a.ref_high != null && a.numeric_value > a.ref_high) return 'H'
  if (a.ref_low != null && a.numeric_value < a.ref_low) return 'L'
  if (a.ref_low != null || a.ref_high != null) return 'N'
  return a.flag
}

function normalize(result: LabExtractionResult, patient: PatientCtx): LabExtractionResult {
  const analytes = (result.analytes || []).map((a) => {
    // Fill missing reference range from the sex/age fallback table.
    if (a.ref_low == null && a.ref_high == null) {
      const ref = getReferenceRange(a.canonical, patient)
      if (ref) {
        a = { ...a, ref_low: ref.low, ref_high: ref.high, unit: a.unit || ref.unit }
      }
    }
    return { ...a, flag: recomputeFlag(a) }
  })

  const { score, risk_level, urgent } = computeHealthScore(analytes)
  const applyScore = (i?: LabInterpretation): LabInterpretation | undefined =>
    i ? { ...i, health_score: score, risk_level, urgent } : i

  const upsell = result.upsell && result.upsell.length > 0 ? result.upsell : deriveUpsell(analytes)

  return {
    ...result,
    analytes,
    interpretation: applyScore(result.interpretation)!,
    interpretation_en: applyScore(result.interpretation_en),
    upsell,
  }
}

export async function extractLabReport(opts: {
  fileBytes: Buffer
  contentType: string
  patient?: PatientCtx
}): Promise<LabExtractionResult> {
  const b64 = opts.fileBytes.toString('base64')
  const isPdf = opts.contentType === 'application/pdf'
  const client = anthropicSonnet()

  const fileBlock = isPdf
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: b64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: (opts.contentType as ImageMedia) || 'image/jpeg', data: b64 } }

  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const msg = await client.messages.create({
        model: CONTENT_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text: 'อ่านใบรายงานผลแลปนี้ แล้วส่งคืน JSON ตาม schema เท่านั้น' },
          ],
        }],
      })
      const block = msg.content[0]
      if (block.type !== 'text') throw new Error('no text response')
      const parsed = JSON.parse(stripFence(block.text)) as LabExtractionResult
      if (!Array.isArray(parsed.analytes)) throw new Error('analytes not an array')
      if (!parsed.interpretation) throw new Error('missing interpretation')
      return normalize(parsed, opts.patient ?? {})
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`extractLabReport failed after 3 attempts: ${lastErr}`)
}
