import type { Service } from '@/types'

export type QuestionType = 'radio' | 'multi' | 'number' | 'bmi' | 'basic'

export interface QuestionOption {
  value: string
  label: string
  badge?: string
  exclusive?: boolean
}

export interface Question {
  id: string
  type: QuestionType
  title: string
  subtitle?: string
  options?: QuestionOption[]
  required?: boolean
  // "bmi" is a composite: collects weight_kg, height_cm, age, gender in one step
}

export interface QuizDefinition {
  service: Service
  landingHeadline: string
  subHeadline: string
  questions: Question[]
  // optional tone hints for UI
  darkMode?: boolean
  allowAnonymous?: boolean
}

// ── GLP-1 (spec §4.1) ───────────────────────────────────────────────
const GLP1_QUESTIONS: Question[] = [
  {
    id: 'bmi',
    type: 'bmi',
    title: 'ข้อมูลพื้นฐาน',
    subtitle: 'เพื่อประเมิน BMI และความเหมาะสม',
    required: true,
  },
  {
    id: 'goal',
    type: 'radio',
    title: 'เป้าหมายหลักคืออะไร?',
    required: true,
    options: [
      { value: 'health',     label: 'ลดน้ำหนักเพื่อสุขภาพ' },
      { value: 'beauty',     label: 'ลดเพื่อความสวยงาม' },
      { value: 'control_dm', label: 'คุมเบาหวาน' },
      { value: 'prevent_dm', label: 'ป้องกันเบาหวาน' },
    ],
  },
  {
    id: 'family_dm',
    type: 'multi',
    title: 'ครอบครัวมีใครเป็นเบาหวาน?',
    options: [
      { value: 'parent',      label: 'พ่อ/แม่' },
      { value: 'sibling',     label: 'พี่น้อง' },
      { value: 'grandparent', label: 'ปู่ย่าตายาย' },
      { value: 'none',        label: 'ไม่มี' },
    ],
  },
  {
    id: 'symptoms',
    type: 'multi',
    title: 'มีอาการเหล่านี้หรือไม่?',
    options: [
      { value: 'polyuria_thirst', label: 'ปัสสาวะบ่อย/กระหายน้ำ' },
      { value: 'weight_gain',     label: 'น้ำหนักขึ้นเร็ว' },
      { value: 'fatigue',         label: 'เหนื่อยง่าย' },
      { value: 'big_waist',       label: 'รอบเอวเกินมาตรฐาน' },
      { value: 'none',            label: 'ไม่มี' },
    ],
  },
  {
    id: 'last_glucose_test',
    type: 'radio',
    title: 'เคยตรวจน้ำตาลครั้งสุดท้ายเมื่อไหร่?',
    options: [
      { value: '<6m',   label: 'ภายใน 6 เดือน' },
      { value: '6-12m', label: '6-12 เดือน' },
      { value: '>1y',   label: 'มากกว่า 1 ปี' },
      { value: 'never', label: 'ไม่เคย' },
    ],
  },
  {
    id: 'weight_loss_history',
    type: 'multi',
    title: 'เคยลดน้ำหนักวิธีไหน?',
    options: [
      { value: 'diet',     label: 'คุมอาหาร' },
      { value: 'exercise', label: 'ออกกำลัง' },
      { value: 'clinic',   label: 'คลินิก' },
      { value: 'drug',     label: 'ยา' },
      { value: 'if',       label: 'IF (อดอาหารเป็นช่วง)' },
      { value: 'keto',     label: 'Keto (ลดคาร์บ)' },
      { value: 'none',     label: 'ไม่เคย' },
    ],
  },
  {
    id: 'budget',
    type: 'radio',
    title: 'งบประมาณต่อเดือน?',
    options: [
      { value: '<5k',     label: 'น้อยกว่า 5,000' },
      { value: '5-10k',   label: '5,000-10,000' },
      { value: '10-15k',  label: '10,000-15,000' },
      { value: '>15k',    label: 'มากกว่า 15,000' },
    ],
  },
  {
    id: 'start_when',
    type: 'radio',
    title: 'พร้อมเริ่มเมื่อไหร่?',
    required: true,
    options: [
      { value: 'now',    label: 'ทันที',         badge: 'Hot' },
      { value: '1m',     label: 'ภายในเดือน' },
      { value: '1-3m',   label: '1-3 เดือน' },
      { value: 'unsure', label: 'ยังไม่แน่ใจ' },
    ],
  },
]

// ── CKD (spec §4.2) ─────────────────────────────────────────────────
const CKD_QUESTIONS: Question[] = [
  {
    id: 'basic',
    type: 'basic',
    title: 'อายุและเพศ',
    required: true,
  },
  {
    id: 'for_whom',
    type: 'radio',
    title: 'ใครเป็นผู้สงสัยโรคไต?',
    required: true,
    options: [
      { value: 'self',    label: 'ตนเอง' },
      { value: 'parent',  label: 'พ่อ/แม่' },
      { value: 'spouse',  label: 'คู่สมรส' },
      { value: 'relative',label: 'ญาติ' },
    ],
  },
  {
    id: 'conditions',
    type: 'multi',
    title: 'มีโรคประจำตัวเหล่านี้หรือไม่?',
    required: true,
    options: [
      { value: 'dm',        label: 'เบาหวาน (DM)' },
      { value: 'ht',        label: 'ความดัน (HT)' },
      { value: 'gout',      label: 'เกาต์' },
      { value: 'highlipid', label: 'ไขมันสูง' },
      { value: 'obese',     label: 'อ้วน' },
      { value: 'none',      label: 'ไม่มี' },
    ],
  },
  {
    id: 'symptoms',
    type: 'multi',
    title: 'มีอาการเหล่านี้หรือไม่?',
    required: true,
    options: [
      { value: 'swell',       label: 'บวมขา/หน้า' },
      { value: 'foamy_urine', label: 'ปัสสาวะฟอง' },
      { value: 'nocturia',    label: 'ปัสสาวะกลางคืน' },
      { value: 'fatigue',     label: 'เหนื่อยง่าย' },
      { value: 'none',        label: 'ไม่มี' },
    ],
  },
  {
    id: 'kidney_test_history',
    type: 'radio',
    title: 'เคยตรวจค่าไตไหม?',
    required: true,
    options: [
      { value: 'normal',   label: 'ปกติ' },
      { value: 'abnormal', label: 'ผิดปกติ' },
      { value: 'never',    label: 'ไม่เคย' },
      { value: 'forgot',   label: 'จำไม่ได้' },
    ],
  },
  {
    id: 'location',
    type: 'radio',
    title: 'พื้นที่อาศัย',
    required: true,
    options: [
      { value: 'samutsakhon',            label: 'สมุทรสาคร' },
      { value: 'bkk_nakhon_samutprakan', label: 'กรุงเทพ/นครปฐม/สมุทรปราการ' },
      { value: 'other',                  label: 'จังหวัดอื่น' },
    ],
  },
]

// ── STD / PrEP (spec §4.3) ──────────────────────────────────────────
const STD_QUESTIONS: Question[] = [
  {
    id: 'basic',
    type: 'basic',
    title: 'ข้อมูลพื้นฐาน',
    subtitle: 'เพศสภาพ "ไม่สะดวกบอก" ได้',
    required: true,
  },
  {
    id: 'last_risk',
    type: 'radio',
    title: 'ครั้งล่าสุดที่มีความเสี่ยง?',
    required: true,
    options: [
      { value: '<72h',   label: 'ภายใน 72 ชม.', badge: '🚨 ด่วน' },
      { value: '1-4w',   label: '1-4 สัปดาห์' },
      { value: '1-3m',   label: '1-3 เดือน' },
      { value: '>3m',    label: 'มากกว่า 3 เดือน' },
      { value: 'none',   label: 'ไม่มี' },
    ],
  },
  {
    id: 'risk_types',
    type: 'multi',
    title: 'ประเภทความเสี่ยง (ถ้าสะดวกบอก)',
    options: [
      { value: 'unprotected',  label: 'มีเพศสัมพันธ์ไม่ป้องกัน' },
      { value: 'multi_partner',label: 'เปลี่ยนคู่บ่อย' },
      { value: 'shared_needle',label: 'เข็มร่วม' },
      { value: 'needlestick',  label: 'เข็มตำโดยอุบัติเหตุ (Needlestick)' },
      { value: 'no_say',       label: 'ไม่สะดวกบอก', exclusive: true },
    ],
  },
  {
    id: 'symptoms',
    type: 'multi',
    title: 'อาการปัจจุบัน?',
    options: [
      { value: 'none',     label: 'ไม่มี' },
      { value: 'sore',     label: 'แผลอวัยวะเพศ' },
      { value: 'rash',     label: 'ผื่น' },
      { value: 'node',     label: 'ต่อมน้ำเหลืองโต' },
      { value: 'fever',    label: 'ไข้เรื้อรัง' },
      { value: 'dysuria',  label: 'ปัสสาวะแสบ' },
    ],
  },
  {
    id: 'test_history',
    type: 'radio',
    title: 'เคยตรวจ HIV/STD ไหม?',
    options: [
      { value: 'never',  label: 'ไม่เคย' },
      { value: '<6m',    label: 'ภายใน 6 เดือน' },
      { value: '6-12m',  label: '6-12 เดือน' },
      { value: '>1y',    label: 'มากกว่า 1 ปี' },
    ],
  },
  {
    id: 'interest',
    type: 'radio',
    title: 'สนใจเรื่องใด?',
    required: true,
    options: [
      { value: 'screen',    label: 'ตรวจเพื่อสบายใจ' },
      { value: 'treat',     label: 'รักษา' },
      { value: 'prep',      label: 'PrEP (ยากันก่อนเสี่ยง HIV)' },
      { value: 'pep',       label: 'PEP ฉุกเฉิน (ภายใน 72 ชม. หลังเสี่ยง)', badge: '🚨 ด่วน' },
    ],
  },
  {
    id: 'contact_channel',
    type: 'radio',
    title: 'ช่องทางติดต่อ',
    required: true,
    options: [
      { value: 'line_only', label: 'LINE เท่านั้น' },
      { value: 'call_ok',   label: 'โทรได้' },
      { value: 'email',     label: 'อีเมล' },
    ],
  },
]

// ── Men's Health (Andropause + Sexual Wellness) ─────────────────────
// Tap-only screening — 6 step, no number input.
// Voucher = ปรึกษาแพทย์ฟรี + InBody + AI Report (compliance-safe framing).
const MENS_QUESTIONS: Question[] = [
  {
    id: 'age_range',
    type: 'radio',
    title: 'อายุประมาณเท่าไหร่?',
    required: true,
    options: [
      { value: 'under_40', label: 'ต่ำกว่า 40 ปี' },
      { value: '40_49',    label: '40-49 ปี' },
      { value: '50_59',    label: '50-59 ปี' },
      { value: '60_plus',  label: '60 ปีขึ้นไป' },
    ],
  },
  {
    id: 'comorbid',
    type: 'multi',
    title: 'มีโรคประจำตัวเหล่านี้ไหม?',
    subtitle: 'เลือกได้หลายข้อ — ใช้ประเมินความปลอดภัย',
    required: true,
    options: [
      { value: 'dm',           label: 'เบาหวาน' },
      { value: 'ht',           label: 'ความดันโลหิตสูง' },
      { value: 'dyslipidemia', label: 'ไขมันในเลือดสูง' },
      { value: 'heart',        label: 'โรคหัวใจ / เคยเจ็บแน่นหน้าอก' },
      { value: 'prostate',     label: 'มะเร็ง / ปัญหาต่อมลูกหมาก' },
      { value: 'none',         label: 'ไม่มี', exclusive: true },
    ],
  },
  {
    id: 'symptoms',
    type: 'multi',
    title: 'ในช่วง 6 เดือน มีอาการเหล่านี้ไหม?',
    subtitle: 'เลือกได้หลายข้อ',
    required: true,
    options: [
      { value: 'fatigue',  label: 'อ่อนเพลีย พลังงานลด' },
      { value: 'mood',     label: 'อารมณ์แปรปรวน หงุดหงิด เศร้า' },
      { value: 'muscle',   label: 'มวลกล้ามเนื้อลด / ไขมันท้องเพิ่ม' },
      { value: 'sleep',    label: 'นอนไม่หลับ / หลับไม่สนิท' },
      { value: 'sexual',   label: 'สมรรถภาพหรือความต้องการลดลง' },
      { value: 'none',     label: 'ไม่มี', exclusive: true },
    ],
  },
  {
    id: 'lifestyle',
    type: 'multi',
    title: 'ใช่กับคุณข้อไหนบ้าง?',
    subtitle: 'เลือกได้หลายข้อ',
    options: [
      { value: 'sleep_short', label: 'นอน < 6 ชม./คืน เป็นประจำ' },
      { value: 'no_exercise', label: 'ออกกำลังกาย < 1 ครั้ง/สัปดาห์' },
      { value: 'alcohol',     label: 'ดื่มแอลกอฮอล์บ่อย / สูบบุหรี่' },
      { value: 'stress',      label: 'ทำงานเครียดสูงต่อเนื่อง' },
      { value: 'weight_gain', label: 'น้ำหนักขึ้นเร็วในปีที่ผ่านมา' },
      { value: 'none',        label: 'ไม่มีข้อใด', exclusive: true },
    ],
  },
  {
    id: 'interest',
    type: 'radio',
    title: 'อยากให้แพทย์ช่วยเรื่องอะไรเป็นหลัก?',
    required: true,
    options: [
      { value: 'general',        label: 'ตรวจประเมินสุขภาพชายโดยรวม' },
      { value: 'lifestyle',      label: 'ปรับ lifestyle / boost พลังงาน' },
      { value: 'sexual_health',  label: 'ปรึกษาเรื่องสมรรถภาพ' },
      { value: 'hormone',        label: 'ตรวจฮอร์โมนเพื่อ baseline' },
      { value: 'unsure',         label: 'ยังไม่แน่ใจ — อยากปรึกษาก่อน' },
    ],
  },
  {
    id: 'start_when',
    type: 'radio',
    title: 'พร้อมเริ่มดูแลเมื่อไหร่?',
    required: true,
    options: [
      { value: 'now',    label: 'ทันที',         badge: 'Hot' },
      { value: '1m',     label: 'ภายใน 1 เดือน' },
      { value: '1-3m',   label: '1-3 เดือน' },
      { value: 'unsure', label: 'ยังไม่แน่ใจ' },
    ],
  },
]

// ── Women's Sexual & Reproductive Health ────────────────────────────
// Tap-only screening covering cervical cancer, menstrual issues,
// vaginal health, contraception, and menopause. Voucher = ปรึกษา
// สูตินรีแพทย์ฟรี + ตรวจคัดกรอง HPV/Pap smear ภายใต้ดุลยพินิจของแพทย์.
const WOMEN_QUESTIONS: Question[] = [
  {
    id: 'age_range',
    type: 'radio',
    title: 'อายุประมาณเท่าไหร่?',
    required: true,
    options: [
      { value: 'under_25', label: 'ต่ำกว่า 25 ปี' },
      { value: '25_34',    label: '25-34 ปี' },
      { value: '35_44',    label: '35-44 ปี' },
      { value: '45_54',    label: '45-54 ปี' },
      { value: '55_plus',  label: '55 ปีขึ้นไป' },
    ],
  },
  {
    id: 'screening_history',
    type: 'radio',
    title: 'ตรวจภายใน / Pap smear ครั้งล่าสุดเมื่อไหร่?',
    subtitle: 'การตรวจคัดกรองมะเร็งปากมดลูก',
    required: true,
    options: [
      { value: '<1y',     label: 'ภายใน 1 ปี' },
      { value: '1-3y',    label: '1-3 ปี' },
      { value: '>3y',     label: 'มากกว่า 3 ปี' },
      { value: 'never',   label: 'ไม่เคยตรวจ' },
    ],
  },
  {
    id: 'symptoms',
    type: 'multi',
    title: 'ในช่วง 3 เดือน มีอาการเหล่านี้ไหม?',
    subtitle: 'เลือกได้หลายข้อ — เป็นความลับ',
    required: true,
    options: [
      { value: 'abnormal_bleeding', label: 'เลือดออกผิดปกติ / เลือดออกหลังมีเพศสัมพันธ์', badge: '⚠️' },
      { value: 'discharge',         label: 'ตกขาวผิดปกติ (สี/กลิ่น/คัน)' },
      { value: 'pelvic_pain',       label: 'ปวดท้องน้อยเรื้อรัง' },
      { value: 'dysuria',           label: 'ปัสสาวะแสบ / ติดเชื้อบ่อย' },
      { value: 'painful_sex',       label: 'เจ็บเวลามีเพศสัมพันธ์' },
      { value: 'none',              label: 'ไม่มี', exclusive: true },
    ],
  },
  {
    id: 'menstrual',
    type: 'radio',
    title: 'ประจำเดือนของคุณเป็นแบบไหน?',
    required: true,
    options: [
      { value: 'regular',     label: 'มาสม่ำเสมอ ปกติ' },
      { value: 'irregular',   label: 'มาไม่สม่ำเสมอ' },
      { value: 'painful',     label: 'ปวดรุนแรง / มามาก' },
      { value: 'absent',      label: 'ขาดประจำเดือน (ไม่ได้ตั้งครรภ์)' },
      { value: 'menopause',   label: 'หมดประจำเดือนแล้ว / วัยทอง' },
      { value: 'na',          label: 'ไม่สะดวกบอก' },
    ],
  },
  {
    id: 'risk_factors',
    type: 'multi',
    title: 'ปัจจัยเสี่ยงเพิ่มเติม',
    subtitle: 'เลือกได้หลายข้อ',
    options: [
      { value: 'family_cancer',  label: 'ครอบครัวมีประวัติมะเร็งปากมดลูก / เต้านม / รังไข่' },
      { value: 'hpv_unvaccinated', label: 'ยังไม่ได้ฉีดวัคซีน HPV' },
      { value: 'multi_partner',  label: 'มีคู่นอนหลายคน' },
      { value: 'smoking',        label: 'สูบบุหรี่' },
      { value: 'none',           label: 'ไม่มี', exclusive: true },
    ],
  },
  {
    id: 'interest',
    type: 'radio',
    title: 'อยากให้แพทย์ช่วยเรื่องอะไรเป็นหลัก?',
    required: true,
    options: [
      { value: 'screening',      label: 'ตรวจคัดกรอง HPV / Pap smear' },
      { value: 'discharge',      label: 'ตกขาว / ติดเชื้อในช่องคลอด' },
      { value: 'menstrual',      label: 'ประจำเดือนผิดปกติ / PCOS' },
      { value: 'contraception',  label: 'ปรึกษาคุมกำเนิด / วางแผนครอบครัว' },
      { value: 'menopause',      label: 'อาการวัยทอง' },
      { value: 'sexual_wellness',label: 'sexual wellness / ความสัมพันธ์' },
      { value: 'unsure',         label: 'ยังไม่แน่ใจ — อยากปรึกษาก่อน' },
    ],
  },
  {
    id: 'start_when',
    type: 'radio',
    title: 'พร้อมพบแพทย์เมื่อไหร่?',
    required: true,
    options: [
      { value: 'now',    label: 'ทันที',         badge: 'Hot' },
      { value: '1m',     label: 'ภายใน 1 เดือน' },
      { value: '1-3m',   label: '1-3 เดือน' },
      { value: 'unsure', label: 'ยังไม่แน่ใจ' },
    ],
  },
]

// ── Mental Wellness & Relationships (Mind) ──────────────────────────
// Lightweight non-diagnostic screening — covers mood, anxiety, sleep,
// stress, and relationship/family concerns. Item `self_harm_check`
// answering "yes"/"sometimes" is a RED FLAG → urgent tier + display
// crisis hotline 1323 immediately. Voucher = ปรึกษานักจิตวิทยา/จิตแพทย์
// 30 นาที (telehealth). All clinical care under licensed professionals.
const MIND_QUESTIONS: Question[] = [
  {
    id: 'age_range',
    type: 'radio',
    title: 'อายุประมาณเท่าไหร่?',
    required: true,
    options: [
      { value: 'under_20', label: 'ต่ำกว่า 20 ปี' },
      { value: '20_29',    label: '20-29 ปี' },
      { value: '30_39',    label: '30-39 ปี' },
      { value: '40_49',    label: '40-49 ปี' },
      { value: '50_plus',  label: '50 ปีขึ้นไป' },
    ],
  },
  {
    id: 'main_concerns',
    type: 'multi',
    title: 'เรื่องไหนกวนใจคุณตอนนี้?',
    subtitle: 'เลือกได้หลายข้อ — เป็นความลับ',
    required: true,
    options: [
      { value: 'mood',         label: 'อารมณ์เศร้า / หดหู่ / สิ้นหวัง' },
      { value: 'anxiety',      label: 'วิตกกังวล / panic / คิดมาก' },
      { value: 'sleep',        label: 'นอนไม่หลับ / หลับยาก / ฝันร้าย' },
      { value: 'work_stress',  label: 'เครียดเรื่องงาน / burnout' },
      { value: 'relationship', label: 'ปัญหาคู่รัก / ความสัมพันธ์' },
      { value: 'family',       label: 'ปัญหาครอบครัว / พ่อแม่' },
      { value: 'breakup',      label: 'อกหัก / หย่าร้าง / สูญเสีย' },
      { value: 'self_esteem',  label: 'ไม่มั่นใจในตัวเอง / รู้สึกไม่มีค่า' },
      { value: 'unsure',       label: 'ยังบอกไม่ถูก — แค่อยากปรึกษา' },
    ],
  },
  {
    id: 'frequency',
    type: 'radio',
    title: 'ในช่วง 2 สัปดาห์ที่ผ่านมา อาการกวนใจคุณบ่อยแค่ไหน?',
    required: true,
    options: [
      { value: 'almost_daily',  label: 'แทบทุกวัน',         badge: 'Hot' },
      { value: 'most_days',     label: 'มากกว่าครึ่งของวัน' },
      { value: 'some_days',     label: 'บางวัน' },
      { value: 'rare',          label: 'นานๆ ครั้ง' },
    ],
  },
  {
    id: 'duration',
    type: 'radio',
    title: 'เป็นมานานแค่ไหนแล้ว?',
    required: true,
    options: [
      { value: '<2w',     label: 'น้อยกว่า 2 สัปดาห์' },
      { value: '2w-1m',   label: '2 สัปดาห์ - 1 เดือน' },
      { value: '1-3m',    label: '1-3 เดือน' },
      { value: '>3m',     label: 'มากกว่า 3 เดือน' },
      { value: 'on_off',  label: 'เป็นๆ หายๆ มาหลายปี' },
    ],
  },
  {
    id: 'self_harm_check',
    type: 'radio',
    title: 'ในช่วง 2 สัปดาห์ที่ผ่านมา มีความคิดอยากทำร้ายตัวเอง หรือไม่อยากอยู่บนโลกนี้บ้างไหม?',
    subtitle: 'คำถามนี้ช่วยให้เราดูแลคุณได้ปลอดภัยที่สุด — เป็นความลับ',
    required: true,
    options: [
      { value: 'no',         label: 'ไม่มี — ไม่เคยคิด' },
      { value: 'sometimes',  label: 'มีบางครั้ง',        badge: '⚠️' },
      { value: 'often',      label: 'มีบ่อยครั้ง / กำลังคิดอยู่ตอนนี้', badge: '🚨 ด่วน' },
    ],
  },
  {
    id: 'previous_help',
    type: 'radio',
    title: 'เคยปรึกษาผู้เชี่ยวชาญด้านสุขภาพจิตหรือไม่?',
    options: [
      { value: 'never',         label: 'ไม่เคย' },
      { value: 'friends_only',  label: 'เคยปรึกษาเพื่อน/ครอบครัวเท่านั้น' },
      { value: 'past',          label: 'เคยปรึกษาผู้เชี่ยวชาญ (จบไปแล้ว)' },
      { value: 'current',       label: 'กำลังรักษา/ปรึกษาอยู่' },
    ],
  },
  {
    id: 'start_when',
    type: 'radio',
    title: 'พร้อมเริ่มปรึกษาเมื่อไหร่?',
    required: true,
    options: [
      { value: 'now',    label: 'ทันที',         badge: 'Hot' },
      { value: '1w',     label: 'ภายใน 1 สัปดาห์' },
      { value: '1m',     label: 'ภายใน 1 เดือน' },
      { value: 'unsure', label: 'ยังไม่แน่ใจ' },
    ],
  },
]

export const QUIZZES: Record<Service, QuizDefinition> = {
  glp1: {
    service: 'glp1',
    landingHeadline: 'ตรวจเบาหวาน FBS + HbA1c ฟรี',
    subHeadline: 'มูลค่า 500 บาท ประเมินความเหมาะสมก่อนเริ่ม GLP-1 ที่ W Medical Hospital',
    questions: GLP1_QUESTIONS,
  },
  ckd: {
    service: 'ckd',
    landingHeadline: 'ตรวจโปรตีนในปัสสาวะฟรี',
    subHeadline: 'สัญญาณเริ่มต้นของโรคไต ตรวจง่ายรู้ผลเร็ว',
    questions: CKD_QUESTIONS,
  },
  std: {
    service: 'std',
    landingHeadline: 'ตรวจ HIV + Syphilis ฟรี',
    subHeadline: 'ส่วนตัว ไม่ตัดสิน ผลออกภายใน 1 ชม.',
    questions: STD_QUESTIONS,
    darkMode: true,
    allowAnonymous: true,
  },
  foreign: {
    service: 'foreign',
    landingHeadline: 'ตรวจสุขภาพแรงงานต่างด้าว',
    subHeadline: 'ติดต่อ sale เพื่อขอใบเสนอราคาหมู่คณะ',
    questions: [],
  },
  mens: {
    service: 'mens',
    landingHeadline: 'ปรึกษาแพทย์ฟรี + ตรวจประเมินสุขภาพชายวัย 40+',
    subHeadline: 'ภายใต้การดูแลของแพทย์ W Medical Hospital สมุทรสาคร — ปรึกษาเป็นความลับ ไม่ตัดสิน',
    questions: MENS_QUESTIONS,
  },
  women: {
    service: 'women',
    landingHeadline: 'ปรึกษาสูตินรีแพทย์ฟรี + ตรวจประเมินสุขภาพเพศหญิงเบื้องต้น',
    subHeadline: 'HPV / Pap smear / ตกขาว / ประจำเดือน / วัยทอง — voucher ครอบคลุมค่าธรรมเนียมแพทย์ในการประเมินเบื้องต้น รายการตรวจ/ยาเพิ่มเติมเป็นไปตามดุลยพินิจของแพทย์ W Medical Hospital สมุทรสาคร',
    questions: WOMEN_QUESTIONS,
  },
  mind: {
    service: 'mind',
    landingHeadline: 'ปรึกษานักจิตวิทยาฟรี 30 นาที — ส่วนตัว ไม่ตัดสิน',
    subHeadline: 'สุขภาพจิต ความเครียด ความสัมพันธ์ การสูญเสีย — voucher ครอบคลุมการปรึกษาเบื้องต้นกับผู้เชี่ยวชาญ (telehealth) ทุกข้อมูลเป็นความลับ',
    questions: MIND_QUESTIONS,
    allowAnonymous: true,
  },
}
