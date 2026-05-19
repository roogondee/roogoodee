import type { Service, LeadTier } from '@/types'

// Personalized health insight shown on the quiz success screen.
// Computed server-side from raw quiz answers + scoring tier.
// Tone: supportive, non-judgmental (spec §4.3 safe-space).
// Every insight must include `disclaimer` to cover medical advice compliance.

export interface HealthInsight {
  headline: string
  body: string
  recommendation: string
  disclaimer: string
  urgent?: boolean
}

type Answers = Record<string, unknown>

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter(x => typeof x === 'string') as string[]) : []
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}
function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

const DISCLAIMER = 'ผลประเมินนี้เป็นเพียงการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ กรุณาพบแพทย์เพื่อยืนยันผลและวางแผนดูแลที่เหมาะสม'

// ── GLP-1 ───────────────────────────────────────────────────────────
function insightGLP1(a: Answers, tier: LeadTier): HealthInsight {
  const wt = asNumber(a.weight_kg)
  const ht = asNumber(a.height_cm)
  const bmi = wt && ht ? wt / Math.pow(ht / 100, 2) : null
  const hasFamilyDm = asArray(a.family_dm).some(x => x !== 'none')
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')

  if (bmi && bmi >= 30 && hasFamilyDm && symptoms.length >= 2) {
    return {
      headline: `BMI ${bmi.toFixed(1)} · ความเสี่ยงเบาหวานสูง`,
      body: 'ค่า BMI เกิน 30 (class I obesity) ประกอบกับประวัติครอบครัว DM และอาการที่คุณรายงาน = กลุ่มเสี่ยงเบาหวาน type 2 ภายใน 5 ปีค่อนข้างสูง',
      recommendation: 'การตรวจ FBS + HbA1c ฟรีจะยืนยันว่าตอนนี้อยู่ในระยะ pre-diabetes หรือ diabetes แล้ว และแพทย์จะประเมินว่า GLP-1 เหมาะสมไหม',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }
  if (bmi && bmi >= 30) {
    return {
      headline: `BMI ${bmi.toFixed(1)} · กลุ่ม obesity class I`,
      body: 'ค่า BMI ในระดับนี้เพิ่มความเสี่ยงเบาหวาน 3-4 เท่า ความดันสูง 2-3 เท่า และโรคหัวใจเทียบกับน้ำหนักปกติ',
      recommendation: 'ตรวจ FBS + HbA1c ช่วยให้รู้สถานะจริงก่อนเริ่ม GLP-1 และประเมินได้ว่าลดน้ำหนักอย่างเดียวพอ หรือต้องคุมน้ำตาลควบคู่',
      disclaimer: DISCLAIMER,
    }
  }
  if (bmi && bmi >= 27) {
    return {
      headline: `BMI ${bmi.toFixed(1)} · น้ำหนักเกินเกณฑ์`,
      body: 'ระดับนี้ยังไม่ถึง obesity แต่อยู่ในช่วงที่ pre-diabetes พบได้บ่อย (~30% ของคนในช่วง BMI นี้)',
      recommendation: 'การตรวจ HbA1c ครั้งเดียวบอกได้ว่าน้ำตาลสะสม 3 เดือนเป็นยังไง ถ้าผลปกติ lifestyle ปกติก็พอ ถ้าเริ่มผิดปกติ = intervene ได้เร็ว',
      disclaimer: DISCLAIMER,
    }
  }
  return {
    headline: 'ประเมินสุขภาพเบื้องต้นเรียบร้อย',
    body: 'ค่า BMI และข้อมูลที่คุณให้อยู่ในเกณฑ์พอใช้ได้ แต่การตรวจคัดกรองเบาหวานปีละครั้งยังเป็นแนวทางที่แนะนำ',
    recommendation: 'ตรวจ FBS + HbA1c ฟรีที่ W Medical Hospital เพื่อเก็บเป็น baseline และปรึกษาแพทย์ว่าเป้าหมายของคุณเหมาะกับ GLP-1 หรือวิธีอื่น',
    disclaimer: DISCLAIMER,
  }
}

// ── CKD ─────────────────────────────────────────────────────────────
function insightCKD(a: Answers, tier: LeadTier): HealthInsight {
  const conditions = asArray(a.conditions)
  const hasDm = conditions.includes('dm')
  const hasHt = conditions.includes('ht')
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  const testHistory = asString(a.kidney_test_history)

  if (hasDm && hasHt) {
    return {
      headline: 'DM + HT = risk factor อันดับ 1 ของโรคไตในไทย',
      body: 'การมี DM และความดันพร้อมกัน = คนไทย 40-50% จะเกิด CKD stage 3+ ภายใน 10-15 ปีถ้าไม่ได้ตรวจติดตาม',
      recommendation: 'ตรวจโปรตีนในปัสสาวะคัดกรอง CKD ตั้งแต่ระยะ micro-albuminuria = เริ่มรักษาทันได้ ชะลอการเสื่อมของไตได้ถึง 10 ปี',
      disclaimer: DISCLAIMER,
      urgent: tier === 'hot',
    }
  }
  if (hasDm || hasHt) {
    return {
      headline: `${hasDm ? 'DM' : 'ความดัน'} = สาเหตุหลักของโรคไตเรื้อรัง`,
      body: `${hasDm ? 'เบาหวาน' : 'ความดันสูง'}เป็นสาเหตุอันดับต้น ๆ ของโรคไตเรื้อรังในไทย การตรวจโปรตีนในปัสสาวะช่วยจับสัญญาณเริ่มต้นได้ก่อนค่าครีเอตินินจะเปลี่ยน`,
      recommendation: 'ตรวจฟรีที่ W Medical + ปรึกษาแพทย์ว่าควรตรวจซ้ำทุกกี่เดือน และปรับยาปัจจุบันยังไงให้ช่วยถนอมไต',
      disclaimer: DISCLAIMER,
    }
  }
  if (symptoms.length >= 2) {
    return {
      headline: `อาการ ${symptoms.length} ข้อ = อาจเป็นสัญญาณเริ่มต้น`,
      body: 'อาการที่คุณรายงาน (บวม/ปัสสาวะฟอง/ปัสสาวะกลางคืน/เหนื่อย) เป็นกลุ่มอาการคลาสสิกของ CKD ระยะเริ่มต้น',
      recommendation: 'ตรวจโปรตีนในปัสสาวะ 1 ครั้ง รู้ผลใน 30 นาที ถ้าปกติก็อุ่นใจ ถ้าพบ protein = เข้าสู่ระบบติดตามก่อนที่ไตจะเสียหายเพิ่ม',
      disclaimer: DISCLAIMER,
    }
  }
  if (testHistory === 'never') {
    return {
      headline: 'ยังไม่เคยตรวจค่าไต',
      body: 'คนไทยวัย 40+ 1 ใน 3 มี early-stage CKD โดยไม่มีอาการ การตรวจครั้งแรกทำให้เก็บ baseline ได้',
      recommendation: 'ตรวจโปรตีนในปัสสาวะฟรี 1 ครั้ง + ปรึกษาแพทย์ว่าควรตรวจซ้ำเมื่อไหร่',
      disclaimer: DISCLAIMER,
    }
  }
  return {
    headline: 'การคัดกรองเชิงป้องกัน',
    body: 'คุณยังไม่มี risk factor สูงตอนนี้ แต่การตรวจคัดกรองต้นทุนต่ำช่วยยืนยันสถานะไตปัจจุบัน',
    recommendation: 'ใช้ voucher ตรวจ urine protein ฟรี เก็บไว้เป็น baseline',
    disclaimer: DISCLAIMER,
  }
}

// ── STD ─────────────────────────────────────────────────────────────
function insightSTD(a: Answers, tier: LeadTier): HealthInsight {
  const lastRisk = asString(a.last_risk)
  const interest = asString(a.interest)
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  const testHistory = asString(a.test_history)

  if (interest === 'pep' || lastRisk === '<72h') {
    return {
      headline: '🚨 PEP ได้ผลสูงสุดภายใน 72 ชั่วโมง',
      body: 'หลัง exposure เกิน 72 ชม. PEP ลดประสิทธิภาพมาก ทุกชั่วโมงที่รอ = โอกาสป้องกัน HIV ลดลง กรุณาติดต่อโรงพยาบาลทันที',
      recommendation: 'โทรหา W Medical ด่วน — ทีมให้คำแนะนำและเริ่ม PEP 28 วันได้ ตรวจเบื้องต้นรู้ผลใน 1 ชม.',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }
  if (interest === 'prep') {
    return {
      headline: 'PrEP ลด HIV risk ได้ 99% เมื่อทานสม่ำเสมอ',
      body: 'PrEP (Truvada/Descovy) คือยาป้องกัน HIV ก่อน exposure ที่ได้ผลสูงสุดในตลาด ใช้เป็น daily pill หรือ on-demand (2-1-1 regimen)',
      recommendation: 'ตรวจ baseline HIV + Syphilis ก่อนเริ่ม PrEP (ฟรี) แพทย์จะประเมินและสั่งยาในวันเดียว',
      disclaimer: DISCLAIMER,
    }
  }
  if (symptoms.length >= 1 && (testHistory === 'never' || testHistory === '>1y')) {
    return {
      headline: 'มีอาการ + ไม่ได้ตรวจนานเกิน = ควรตรวจเร็ว',
      body: 'HIV และ Syphilis ระยะแรกมักไม่มีอาการเด่น ถ้ามีอาการที่คุณรายงาน + ไม่เคย screen นาน = ความเสี่ยงสะสม',
      recommendation: 'ตรวจที่ W Medical ส่วนตัว ไม่ตัดสิน รู้ผลใน 1 ชม. ถ้าผลบวกมีทีมดูแลต่อทันที',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }
  if (interest === 'treat') {
    return {
      headline: 'รักษาเร็ว = เปลี่ยนผล outcome อย่างสิ้นเชิง',
      body: 'STD ส่วนใหญ่ (Syphilis, Gonorrhea, Chlamydia) รักษาหาย 100% ถ้าเริ่มเร็ว HIV ไม่หายขาดแต่ viral load = undetectable ได้ = ไม่แพร่ไม่ลุกลาม',
      recommendation: 'ตรวจฟรีเพื่อยืนยันชนิดแล้วเริ่มยาในวันเดียวกัน W Medical มีทีมที่ดูแลเรื่องนี้โดยเฉพาะ',
      disclaimer: DISCLAIMER,
    }
  }
  return {
    headline: 'ตรวจแล้วเคลียร์ใจ = สบายใจ',
    body: 'การตรวจคัดกรอง HIV + Syphilis เป็นเรื่องปกติและส่วนตัว ไม่ใช่เรื่องของการตัดสิน — ผล 1 ชม. ไปต่อได้เลย',
    recommendation: 'ใช้ voucher ตรวจที่ W Medical แบบ walk-in หรือจองก่อนได้',
    disclaimer: DISCLAIMER,
  }
}

// ── Men's Health (Andropause + Sexual Wellness) ─────────────────────
// Compliance-safe insight: no drug names, no claims of cure, doctor-led framing.
function insightMens(a: Answers, tier: LeadTier): HealthInsight {
  const comorbid = asArray(a.comorbid)
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  const ageRange = asString(a.age_range)
  const interest = asString(a.interest)

  const referRedFlag = comorbid.includes('heart') || comorbid.includes('prostate')
  if (referRedFlag) {
    return {
      headline: 'แนะนำพบแพทย์เฉพาะทางโดยตรง',
      body: 'จากประวัติที่กรอก คุณควรได้รับการประเมินจากแพทย์เฉพาะทางก่อน เพื่อให้การดูแลปลอดภัยและเหมาะสมที่สุด — เคสนี้ไม่อยู่ในเกณฑ์ voucher ปกติ',
      recommendation: 'ติดต่อ W Medical Hospital เพื่อนัดพบแพทย์เฉพาะทางโดยตรง — ทีมจะช่วยประสานงานให้',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }

  const metabolic = ['dm', 'ht', 'dyslipidemia'].filter(c => comorbid.includes(c))
  const hasSexualSymptom = symptoms.includes('sexual')
  const hasMultipleSymptoms = symptoms.length >= 3

  if (hasSexualSymptom && metabolic.length >= 1) {
    return {
      headline: 'อาการที่กรอกเชื่อมโยงกับสุขภาพหลอดเลือด',
      body: `คุณรายงานทั้งอาการสมรรถภาพ + ${metabolic.length} โรคในกลุ่ม metabolic — งานวิจัยพบว่าอาการสมรรถภาพมักเป็นสัญญาณเตือนล่วงหน้าของปัญหาหลอดเลือดและระบบหัวใจ`,
      recommendation: 'ปรึกษาแพทย์เพื่อตรวจประเมินสาเหตุร่วม (ฮอร์โมน หลอดเลือด เบาหวาน) ภายใต้การดูแลของแพทย์ W Medical Hospital',
      disclaimer: DISCLAIMER,
      urgent: tier === 'urgent' || tier === 'hot',
    }
  }

  if (hasMultipleSymptoms) {
    return {
      headline: `อาการ ${symptoms.length} ข้อ — อาจสัมพันธ์กับฮอร์โมน`,
      body: 'อาการที่คุณรายงาน (อ่อนเพลีย อารมณ์ มวลกล้ามเนื้อ การนอน) เป็นกลุ่มอาการที่พบได้บ่อยในผู้ชายวัย 40+ ที่ฮอร์โมน Testosterone ค่อยๆ ลดลงตามวัย — แต่อาจเกิดจากสาเหตุอื่นได้ด้วย',
      recommendation: 'ปรึกษาแพทย์เพื่อประเมินสาเหตุและแนวทางดูแลที่เหมาะสมกับกรณีของคุณ',
      disclaimer: DISCLAIMER,
    }
  }

  if (interest === 'sexual_health') {
    return {
      headline: 'ปรึกษาเรื่องสมรรถภาพอย่างเป็นความลับ',
      body: 'ปัญหาสมรรถภาพในผู้ชายวัย 40+ มีหลายสาเหตุ — ฮอร์โมน หลอดเลือด ความเครียด ผลข้างเคียงยา การวินิจฉัยที่ถูกต้องเริ่มจากการตรวจประเมินก่อน',
      recommendation: 'ปรึกษาแพทย์เฉพาะทาง ส่วนตัว ไม่ตัดสิน — แผนการดูแลขึ้นอยู่กับดุลยพินิจของแพทย์',
      disclaimer: DISCLAIMER,
    }
  }

  if (interest === 'hormone') {
    return {
      headline: 'ตรวจฮอร์โมน — เก็บ baseline ไว้ก่อน',
      body: 'การรู้ค่าฮอร์โมนปัจจุบันช่วยให้แพทย์ประเมินว่าอาการที่มีสัมพันธ์กับฮอร์โมนหรือสาเหตุอื่น และวางแผน lifestyle หรือการดูแลที่เหมาะสม',
      recommendation: 'ปรึกษาแพทย์เพื่อตัดสินใจร่วมกันว่าควรตรวจ panel ไหน — ค่าตรวจตามดุลยพินิจของแพทย์',
      disclaimer: DISCLAIMER,
    }
  }

  if (ageRange === '60_plus' || ageRange === '50_59') {
    return {
      headline: 'การเช็กสุขภาพเชิงป้องกันของชายวัย 50+',
      body: 'ผู้ชายวัย 50+ ควรตรวจสุขภาพประจำปีครอบคลุมทั้ง metabolic, prostate และฮอร์โมน — เพื่อจับสัญญาณเตือนเชิงป้องกันก่อนเกิดอาการหนัก',
      recommendation: 'ปรึกษาแพทย์ฟรีเพื่อวางแผนการตรวจที่เหมาะกับช่วงวัยของคุณ',
      disclaimer: DISCLAIMER,
    }
  }

  return {
    headline: 'ประเมินสุขภาพเบื้องต้นเรียบร้อย',
    body: 'ข้อมูลที่คุณกรอกอยู่ในเกณฑ์พอใช้ได้ — แต่ผู้ชายวัย 40+ ควรเช็กสุขภาพเชิงป้องกันอย่างน้อยปีละครั้ง',
    recommendation: 'ใช้ voucher ปรึกษาแพทย์ฟรี เก็บไว้เป็น baseline ของสุขภาพชาย',
    disclaimer: DISCLAIMER,
  }
}

// ── Women's Sexual & Reproductive Health ────────────────────────────
// Compliance-safe: no diagnosis, doctor-led framing, supportive tone.
function insightWomen(a: Answers, tier: LeadTier): HealthInsight {
  const symptoms = asArray(a.symptoms).filter(s => s !== 'none')
  const screening = asString(a.screening_history)
  const interest = asString(a.interest)
  const ageRange = asString(a.age_range)
  const risks = asArray(a.risk_factors).filter(r => r !== 'none')

  if (symptoms.includes('abnormal_bleeding')) {
    return {
      headline: '🚨 เลือดออกผิดปกติ — ควรพบแพทย์เร็วที่สุด',
      body: 'เลือดออกผิดปกติระหว่างรอบประจำเดือน หลังมีเพศสัมพันธ์ หรือหลังวัยทอง เป็นอาการที่ควรประเมินทันที — สาเหตุมีตั้งแต่ฮอร์โมน โพลิป จนถึงเรื่องที่ต้องตรวจให้แน่ใจ',
      recommendation: 'ติดต่อ W Medical เพื่อนัดพบสูตินรีแพทย์โดยเร็ว — voucher ครอบคลุมค่าธรรมเนียมแพทย์ในการประเมินเบื้องต้น',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }

  if (screening === 'never' || screening === '>3y') {
    const yearsLine = screening === 'never'
      ? 'การไม่เคยตรวจคัดกรอง = เสี่ยงสูงสุดในการพลาดการตรวจพบมะเร็งปากมดลูกระยะเริ่มต้น'
      : 'การเว้นช่วงตรวจ > 3 ปีในผู้หญิงวัยเจริญพันธุ์ = ช่วงที่อาจพลาดการตรวจพบการเปลี่ยนแปลงระยะแรก'
    return {
      headline: `${screening === 'never' ? 'ยังไม่เคย' : 'นานเกิน 3 ปีแล้ว'} ที่ตรวจคัดกรองมะเร็งปากมดลูก`,
      body: `มะเร็งปากมดลูกเป็นหนึ่งใน "มะเร็งที่ป้องกันได้" — HPV และ Pap smear ตรวจพบการเปลี่ยนแปลงก่อนเป็นมะเร็ง 5-10 ปี ${yearsLine}`,
      recommendation: 'voucher ครอบคลุมค่าธรรมเนียมแพทย์ในการประเมินและคำแนะนำการตรวจคัดกรองที่เหมาะกับวัยของคุณ — รายละเอียดการตรวจเป็นไปตามดุลยพินิจของแพทย์',
      disclaimer: DISCLAIMER,
      urgent: tier === 'urgent' || tier === 'hot',
    }
  }

  if (symptoms.includes('discharge') || symptoms.includes('dysuria') || symptoms.includes('painful_sex')) {
    return {
      headline: `อาการ ${symptoms.length} ข้อ — ควรตรวจให้แน่ใจ`,
      body: 'ตกขาวผิดปกติ ปัสสาวะแสบ หรือเจ็บเวลามีเพศสัมพันธ์ อาจมาจากการติดเชื้อ (แบคทีเรีย / ยีสต์ / STI) ฮอร์โมน หรือสาเหตุทางกายภาพ — การวินิจฉัยจากอาการเพียงอย่างเดียวมักไม่แม่นยำ',
      recommendation: 'ปรึกษาสูตินรีแพทย์เพื่อตรวจประเมินสาเหตุ — voucher ครอบคลุมค่าธรรมเนียมการปรึกษาเบื้องต้น',
      disclaimer: DISCLAIMER,
    }
  }

  if (interest === 'menopause' || ageRange === '45_54' || ageRange === '55_plus') {
    return {
      headline: 'วัยทอง — เปลี่ยนผ่านที่ดูแลได้',
      body: 'อาการวัยทอง (ร้อนวูบวาบ นอนไม่หลับ อารมณ์แปรปรวน ช่องคลอดแห้ง) เกิดจากการลดลงของฮอร์โมน Estrogen — มีหลายแนวทางดูแลตั้งแต่ lifestyle จนถึงฮอร์โมนทดแทน ขึ้นกับสุขภาพแต่ละคน',
      recommendation: 'ปรึกษาแพทย์เพื่อวางแผนการดูแลที่เหมาะกับคุณ — แผนรักษาทั้งหมดอยู่ภายใต้ดุลยพินิจของแพทย์',
      disclaimer: DISCLAIMER,
    }
  }

  if (interest === 'menstrual' || a.menstrual === 'irregular' || a.menstrual === 'painful') {
    return {
      headline: 'ประจำเดือนผิดปกติ — อาจสะท้อนปัญหาฮอร์โมน',
      body: 'ประจำเดือนไม่สม่ำเสมอ มามาก หรือปวดรุนแรง อาจสัมพันธ์กับ PCOS, ไทรอยด์, เยื่อบุโพรงมดลูกเจริญผิดที่ หรือสาเหตุอื่น — การประเมินจากแพทย์จะช่วยจับสาเหตุที่แท้จริง',
      recommendation: 'ปรึกษาสูตินรีแพทย์เพื่อตรวจประเมินและวางแผนดูแล',
      disclaimer: DISCLAIMER,
    }
  }

  if (interest === 'contraception') {
    return {
      headline: 'วางแผนคุมกำเนิด — มีหลายทางเลือก',
      body: 'การคุมกำเนิดมีหลายแบบ (ยาเม็ด ห่วงอนามัย ยาฝัง ยาฉีด) แต่ละแบบมีข้อดี-ผลข้างเคียง-ระยะเวลาต่างกัน การเลือกที่เหมาะสุดต้องพิจารณาสุขภาพ ไลฟ์สไตล์ และแผนครอบครัวของคุณ',
      recommendation: 'ปรึกษาแพทย์เพื่อเลือกวิธีที่เหมาะกับคุณ — voucher ครอบคลุมค่าธรรมเนียมการปรึกษา',
      disclaimer: DISCLAIMER,
    }
  }

  if (risks.includes('family_cancer') || risks.includes('hpv_unvaccinated')) {
    return {
      headline: 'ปัจจัยเสี่ยง — ควรคัดกรองสม่ำเสมอ',
      body: `${risks.includes('family_cancer') ? 'ประวัติครอบครัวมะเร็ง' : 'ยังไม่ได้ฉีดวัคซีน HPV'} เพิ่มความสำคัญของการตรวจคัดกรองตามวัย — การตรวจพบเร็ว = โอกาสรักษาหายสูง`,
      recommendation: 'ปรึกษาแพทย์เพื่อวางแผนการตรวจคัดกรองและพิจารณาวัคซีน HPV ที่เหมาะกับวัยของคุณ',
      disclaimer: DISCLAIMER,
    }
  }

  return {
    headline: 'ประเมินสุขภาพเพศหญิงเบื้องต้นเรียบร้อย',
    body: 'ข้อมูลที่คุณกรอกอยู่ในเกณฑ์พอใช้ได้ — แต่ผู้หญิงควรพบสูตินรีแพทย์อย่างน้อยทุก 1-3 ปี ขึ้นกับวัยและประวัติ',
    recommendation: 'ใช้ voucher ปรึกษาแพทย์ฟรี เก็บไว้เป็น baseline สุขภาพเพศหญิงของคุณ',
    disclaimer: DISCLAIMER,
  }
}

// ── Mental Wellness & Relationships (Mind) ──────────────────────────
// Safety-first: self-harm flag → crisis-hotline insight regardless of
// other inputs. Hotline 1323 is the Thai Department of Mental Health
// crisis line (24/7, free, Thai language). Never remove the hotline
// from the urgent branch — it's the safety net for the entire pillar.
function insightMind(a: Answers, _tier: LeadTier): HealthInsight {
  const selfHarm = asString(a.self_harm_check)
  const concerns = asArray(a.main_concerns)
  const frequency = asString(a.frequency)
  const duration = asString(a.duration)

  if (selfHarm === 'often' || selfHarm === 'sometimes') {
    return {
      headline: '🚨 ขอบคุณที่บอกเรา — คุณไม่ได้อยู่คนเดียว',
      body: 'ความคิดเหล่านี้บอกว่าคุณกำลังเจ็บปวดมาก — และเป็นสัญญาณว่าควรได้คุยกับผู้เชี่ยวชาญโดยเร็วที่สุด ✦ สายด่วนสุขภาพจิต กรมสุขภาพจิต **1323** (โทรฟรี 24 ชม. เป็นความลับ) พร้อมรับฟังคุณตอนนี้',
      recommendation: 'กรุณาโทร **1323** ทันทีหากความคิดนี้รบกวนคุณมาก — และทีมเราจะติดต่อคุณภายในวันเพื่อนัดหมายผู้เชี่ยวชาญ (ปรึกษาฟรี ส่วนตัว)',
      disclaimer: DISCLAIMER,
      urgent: true,
    }
  }

  if (concerns.includes('breakup')) {
    return {
      headline: 'การสูญเสีย — เป็นเรื่องที่ใจหนัก',
      body: 'อกหัก หย่าร้าง หรือสูญเสียคนรัก เป็นความเจ็บปวดที่ไม่ควรเผชิญคนเดียว ความรู้สึกตอนนี้ปกติแต่ไม่ได้หมายความว่าต้องผ่านไปได้ด้วยตัวเอง — การมีพื้นที่ปลอดภัยให้พูดออกมาช่วยได้มาก',
      recommendation: 'ปรึกษานักจิตวิทยา 30 นาทีฟรี (telehealth) — รับฟังโดยไม่ตัดสิน หาแนวทางที่เหมาะกับคุณ',
      disclaimer: DISCLAIMER,
    }
  }

  if (concerns.includes('relationship') || concerns.includes('family')) {
    return {
      headline: 'ปัญหาความสัมพันธ์ — ปรึกษาได้ตามแบบของคุณ',
      body: 'ความสัมพันธ์ที่ไม่ลงตัว ไม่ว่าจะกับคู่รัก ครอบครัว หรือคนใกล้ตัว สามารถสะสมจนกระทบสุขภาพจิตและกายได้ — การมีคนกลางที่เป็นผู้เชี่ยวชาญช่วยให้มองสถานการณ์ใหม่ได้ชัดขึ้น',
      recommendation: 'ปรึกษานักจิตวิทยาคนเดียว หรือชวนคนสำคัญของคุณมาด้วยก็ได้ — voucher ใช้ได้กับ session แรก',
      disclaimer: DISCLAIMER,
    }
  }

  const moodAnxiety = concerns.includes('mood') || concerns.includes('anxiety')
  const isChronicAndFrequent = (duration === '>3m' || duration === 'on_off')
                             && (frequency === 'almost_daily' || frequency === 'most_days')

  if (moodAnxiety && isChronicAndFrequent) {
    return {
      headline: 'อาการเรื้อรังและถี่ — ควรให้ผู้เชี่ยวชาญช่วยประเมิน',
      body: 'อาการเศร้า/วิตกกังวลที่กินเวลานาน > 3 เดือน และเกิดบ่อย เป็นรูปแบบที่ไม่ค่อยหายเอง การได้คุยกับผู้เชี่ยวชาญช่วยจับสาเหตุและวางแผนดูแลที่เหมาะกับคุณโดยเฉพาะ',
      recommendation: 'ปรึกษานักจิตวิทยา/จิตแพทย์ 30 นาทีฟรี — แผนการดูแลและการสั่งยา (หากจำเป็น) อยู่ภายใต้ดุลยพินิจของผู้เชี่ยวชาญ',
      disclaimer: DISCLAIMER,
      urgent: false,
    }
  }

  if (concerns.includes('sleep')) {
    return {
      headline: 'นอนไม่หลับ — บ่อยมาคู่กับเรื่องอื่นในใจ',
      body: 'การนอนไม่ดีต่อเนื่องส่งผลต่ออารมณ์ พลังงาน สมาธิ และระบบฮอร์โมน บางครั้งปัญหาการนอนเป็นปลายทางของความเครียดที่ยังหาทางออกไม่เจอ',
      recommendation: 'ปรึกษาผู้เชี่ยวชาญเพื่อแยกสาเหตุ (พฤติกรรม / อารมณ์ / ฮอร์โมน) — voucher ครอบคลุม session แรก',
      disclaimer: DISCLAIMER,
    }
  }

  if (concerns.includes('work_stress')) {
    return {
      headline: 'Burnout — ไม่ใช่แค่ "เหนื่อย"',
      body: 'ความเครียดจากงานสะสมต่อเนื่องจน energy หมด สนใจอะไรไม่ได้ และรู้สึกแยกตัวจากเป้าหมาย เป็นภาวะที่ WHO ยอมรับว่าเป็นปัญหาสุขภาพ ไม่ใช่ลักษณะนิสัย',
      recommendation: 'ปรึกษานักจิตวิทยาเพื่อวางแผน recovery — บ่อยครั้งแก้ที่ระบบงาน + วิธีคิด ดีกว่าฝืนต่อ',
      disclaimer: DISCLAIMER,
    }
  }

  if (concerns.includes('self_esteem')) {
    return {
      headline: 'ความรู้สึกไม่มีค่า — ไม่ใช่ความจริง',
      body: 'ความรู้สึกแบบนี้มักมีที่มาจากประสบการณ์เก่า ความสัมพันธ์ หรือ pattern ความคิดที่สั่งสมมานาน การได้ทำงานกับนักจิตวิทยาช่วยถอดที่มา และสร้าง view ใหม่ที่เป็นกลางกว่า',
      recommendation: 'session แรก 30 นาทีฟรี — ไม่มีคำตอบเร็ว แต่ทิศทางมีได้',
      disclaimer: DISCLAIMER,
    }
  }

  return {
    headline: 'ขอบคุณที่ดูแลใจตัวเอง',
    body: 'การคิดเรื่องสุขภาพจิตเป็นจุดเริ่มต้นที่ดี — ไม่ต้องรอให้รุนแรงก่อนค่อยปรึกษา การได้คุยกับผู้เชี่ยวชาญแม้ในวันที่ "ก็โอเค" ช่วยป้องกันปัญหาในอนาคต',
    recommendation: 'ใช้ voucher ปรึกษา 30 นาทีฟรี — ไม่จำเป็นต้องมีปัญหาใหญ่ก่อนถึงจะเริ่ม',
    disclaimer: DISCLAIMER,
  }
}

export function generateInsight(service: Service, answers: Answers, tier: LeadTier): HealthInsight | null {
  switch (service) {
    case 'glp1':    return insightGLP1(answers, tier)
    case 'ckd':     return insightCKD(answers, tier)
    case 'std':     return insightSTD(answers, tier)
    case 'mens':    return insightMens(answers, tier)
    case 'women':   return insightWomen(answers, tier)
    case 'mind':    return insightMind(answers, tier)
    case 'foreign': return null
  }
}
