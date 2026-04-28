import type { Service } from '@/types'

// Lite quiz embedded in articles. 3 quick radio/multi questions per service.
// Goal: low-friction engagement, then convert to full quiz at /quiz/{service}.

export type ArticleQuizTier = 'high' | 'medium' | 'low'

export interface ArticleQuestion {
  id: string
  type: 'radio' | 'multi'
  title: string
  options: { value: string; label: string; weight?: number; exclusive?: boolean }[]
}

export interface ArticleQuizDefinition {
  service: Service
  intro: string
  questions: ArticleQuestion[]
  tierMessages: Record<ArticleQuizTier, { headline: string; body: string }>
  ctaLabel: string
  ctaHref: string
}

const GLP1: ArticleQuizDefinition = {
  service: 'glp1',
  intro: 'เช็กความเสี่ยงเบาหวาน + ความเหมาะสม GLP-1 ใน 30 วินาที',
  questions: [
    {
      id: 'weight_status',
      type: 'radio',
      title: 'รูปร่างน้ำหนักตอนนี้?',
      options: [
        { value: 'normal',  label: 'น้ำหนักปกติ',                weight: 0 },
        { value: 'over',    label: 'น้ำหนักเกินเล็กน้อย',           weight: 2 },
        { value: 'obese1',  label: 'อ้วน (BMI 27-30)',            weight: 3 },
        { value: 'obese2',  label: 'อ้วนมาก (BMI > 30)',          weight: 4 },
      ],
    },
    {
      id: 'risk_signals',
      type: 'multi',
      title: 'มีสัญญาณเหล่านี้ไหม?',
      options: [
        { value: 'family_dm',  label: 'ครอบครัวมีเบาหวาน',         weight: 2 },
        { value: 'symptoms',   label: 'หิวบ่อย/ปัสสาวะบ่อย/เหนื่อย',  weight: 2 },
        { value: 'failed_diet',label: 'ลดน้ำหนักเองไม่สำเร็จ',         weight: 2 },
        { value: 'none',       label: 'ไม่มี',                       weight: 0, exclusive: true },
      ],
    },
    {
      id: 'readiness',
      type: 'radio',
      title: 'พร้อมเริ่มดูแลน้ำหนักจริงจังเมื่อไหร่?',
      options: [
        { value: 'now',    label: 'ทันที',                weight: 3 },
        { value: '1m',     label: 'ภายใน 1 เดือน',         weight: 2 },
        { value: '3m',     label: '1-3 เดือน',              weight: 1 },
        { value: 'unsure', label: 'ยังไม่แน่ใจ',            weight: 0 },
      ],
    },
  ],
  tierMessages: {
    high: {
      headline: 'คุณอยู่ในกลุ่มที่ควรพบแพทย์เร็วๆ นี้',
      body: 'ปัจจัยเสี่ยงสูง — แนะนำให้ตรวจ FBS+HbA1c (ฟรี มูลค่า 500฿) เพื่อประเมินความเหมาะสมของ GLP-1 อย่างปลอดภัย',
    },
    medium: {
      headline: 'มีสัญญาณที่ควรเฝ้าระวัง',
      body: 'อยู่ในกลุ่มที่ควรเริ่มปรับพฤติกรรม + ตรวจน้ำตาลในเลือด ก่อนตัดสินใจเรื่อง GLP-1',
    },
    low: {
      headline: 'ความเสี่ยงต่ำ — เยี่ยมมาก',
      body: 'ดูแลน้ำหนักแบบ lifestyle ต่อไปได้เลย หากต้องการประเมินเชิงลึก ทำแบบเต็มได้ฟรี',
    },
  },
  ctaLabel: 'ทำแบบประเมินเต็ม รับ voucher ตรวจฟรี (3 นาที)',
  ctaHref: '/quiz/glp1',
}

const CKD: ArticleQuizDefinition = {
  service: 'ckd',
  intro: 'เช็กความเสี่ยงโรคไตเรื้อรัง (CKD) ใน 30 วินาที',
  questions: [
    {
      id: 'conditions',
      type: 'multi',
      title: 'มีโรคประจำตัวเหล่านี้ไหม?',
      options: [
        { value: 'dm',        label: 'เบาหวาน',          weight: 3 },
        { value: 'ht',        label: 'ความดันสูง',        weight: 3 },
        { value: 'highlipid', label: 'ไขมันสูง/อ้วน',     weight: 1 },
        { value: 'gout',      label: 'เกาต์',             weight: 1 },
        { value: 'none',      label: 'ไม่มี',              weight: 0, exclusive: true },
      ],
    },
    {
      id: 'symptoms',
      type: 'multi',
      title: 'มีอาการเหล่านี้บ้างไหม?',
      options: [
        { value: 'swell',       label: 'บวมขา/หน้า',           weight: 2 },
        { value: 'foamy_urine', label: 'ปัสสาวะมีฟอง',           weight: 3 },
        { value: 'nocturia',    label: 'ปัสสาวะกลางคืน 2+ ครั้ง', weight: 2 },
        { value: 'fatigue',     label: 'เหนื่อยง่าย',             weight: 1 },
        { value: 'none',        label: 'ไม่มี',                   weight: 0, exclusive: true },
      ],
    },
    {
      id: 'test_history',
      type: 'radio',
      title: 'เคยตรวจค่าไต (eGFR/Creatinine) ไหม?',
      options: [
        { value: 'normal',   label: 'เคยตรวจ — ปกติ',          weight: 0 },
        { value: 'abnormal', label: 'เคยตรวจ — ผิดปกติ',        weight: 4 },
        { value: 'never',    label: 'ไม่เคยตรวจ',                weight: 2 },
        { value: 'forgot',   label: 'จำไม่ได้',                  weight: 1 },
      ],
    },
  ],
  tierMessages: {
    high: {
      headline: 'แนะนำให้ตรวจค่าไตเร็วที่สุด',
      body: 'มีปัจจัยเสี่ยง CKD สูง — ตรวจโปรตีนในปัสสาวะ (ฟรี) ที่คลินิก รู้ผลทันที ป้องกันก่อนสาย',
    },
    medium: {
      headline: 'อยู่ในกลุ่มควรเฝ้าระวัง',
      body: 'แนะนำให้ตรวจคัดกรองโรคไต อย่างน้อยปีละครั้ง หากมีโรคประจำตัวควรถี่กว่านั้น',
    },
    low: {
      headline: 'ความเสี่ยงต่ำ',
      body: 'ดูแลสุขภาพทั่วไปต่อไปได้ ตรวจสุขภาพประจำปีก็เพียงพอ',
    },
  },
  ctaLabel: 'ทำแบบประเมินเต็ม รับตรวจปัสสาวะฟรี',
  ctaHref: '/quiz/ckd',
}

const STD: ArticleQuizDefinition = {
  service: 'std',
  intro: 'เช็กความเสี่ยง HIV/STD แบบส่วนตัว ไม่ตัดสิน',
  questions: [
    {
      id: 'last_risk',
      type: 'radio',
      title: 'ครั้งล่าสุดที่มีพฤติกรรมเสี่ยง?',
      options: [
        { value: '<72h',  label: 'ภายใน 72 ชม.',     weight: 10 },
        { value: '1-4w',  label: '1-4 สัปดาห์',       weight: 4 },
        { value: '1-3m',  label: '1-3 เดือน',          weight: 2 },
        { value: '>3m',   label: 'มากกว่า 3 เดือน',   weight: 1 },
        { value: 'none',  label: 'ไม่มี',               weight: 0 },
      ],
    },
    {
      id: 'symptoms',
      type: 'multi',
      title: 'อาการปัจจุบัน?',
      options: [
        { value: 'sore',    label: 'แผลอวัยวะเพศ',     weight: 3 },
        { value: 'rash',    label: 'ผื่น',                weight: 2 },
        { value: 'dysuria', label: 'ปัสสาวะแสบ',         weight: 2 },
        { value: 'fever',   label: 'ไข้เรื้อรัง/ต่อมโต',  weight: 2 },
        { value: 'none',    label: 'ไม่มี',                weight: 0, exclusive: true },
      ],
    },
    {
      id: 'test_history',
      type: 'radio',
      title: 'เคยตรวจ HIV/STD ครั้งล่าสุด?',
      options: [
        { value: 'never', label: 'ไม่เคย',           weight: 3 },
        { value: '<6m',   label: 'ภายใน 6 เดือน',   weight: 0 },
        { value: '6-12m', label: '6-12 เดือน',        weight: 1 },
        { value: '>1y',   label: 'มากกว่า 1 ปี',      weight: 2 },
      ],
    },
  ],
  tierMessages: {
    high: {
      headline: 'แนะนำให้ตรวจเร็วที่สุด — เป็นความลับ',
      body: 'หากเสี่ยงภายใน 72 ชม. ปรึกษา PEP ฉุกเฉินทันที (ป้องกัน HIV ได้) ตรวจ HIV+Syphilis ฟรี รู้ผลใน 1 ชม.',
    },
    medium: {
      headline: 'ควรตรวจคัดกรองเพื่อความสบายใจ',
      body: 'อยู่ในกลุ่มที่ควรตรวจประจำ — ตรวจฟรี ส่วนตัว ไม่ต้องบอกชื่อจริง',
    },
    low: {
      headline: 'ความเสี่ยงต่ำ — ดีมาก',
      body: 'ตรวจประจำปีก็เพียงพอ หากมีพฤติกรรมเสี่ยงในอนาคต PrEP ช่วยป้องกัน HIV ได้',
    },
  },
  ctaLabel: 'ทำแบบประเมินเต็ม รับตรวจ HIV+Syphilis ฟรี',
  ctaHref: '/quiz/std',
}

export const ARTICLE_QUIZZES: Partial<Record<Service, ArticleQuizDefinition>> = {
  glp1: GLP1,
  ckd: CKD,
  std: STD,
}

export function getArticleQuiz(service: Service): ArticleQuizDefinition | null {
  return ARTICLE_QUIZZES[service] ?? null
}
