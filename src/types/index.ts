export type Service = 'std' | 'glp1' | 'ckd' | 'foreign' | 'mens'

export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  service: Service
  category: string
  focus_kw: string
  meta_desc: string
  image_url: string
  video_url?: string
  status: 'draft' | 'published'
  created_at: string
  published_at: string
}

export type LeadTier = 'urgent' | 'hot' | 'warm' | 'cold'
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'booked'
  | 'visited'
  | 'customer'
  | 'lost'

export interface Lead {
  id?: string
  service: Service
  first_name: string
  last_name?: string
  phone: string
  line_id?: string
  email?: string
  age?: string
  gender?: string
  note?: string
  source?: string
  status?: LeadStatus
  quiz_answers?: Record<string, unknown>
  lead_score?: number
  lead_tier?: LeadTier
  // AI-judged signal — separate from quiz-derived lead_tier (see
  // scripts/score_leads.py). 1=noise, 100=ready-to-buy.
  ai_score?: number
  ai_score_reason?: string
  ai_score_action?: string
  ai_scored_at?: string
  consent_pdpa?: boolean
  consent_at?: string
  crm_deal_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  created_at?: string
}

export interface Voucher {
  id: string
  code: string
  lead_id: string
  service: Service
  issued_at: string
  expires_at: string
  redeemed_at?: string | null
  redeemed_by?: string | null
}

export interface QuizSubmission {
  service: Service
  answers: Record<string, unknown>
  first_name: string
  last_name?: string
  phone: string
  line_id?: string
  email?: string
  age?: string
  gender?: string
  consent_pdpa: boolean
  consent_at: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export interface ContentPlan {
  id: string
  scheduled_date: string
  service: Service
  title: string
  focus_kw: string
  meta_desc: string
  slug: string
  seed: string
  status: 'ready' | 'posted'
  post_id?: string
  created_at: string
}

export const SERVICES = {
  std: {
    name: 'ตรวจ STD & PrEP HIV',
    emoji: '🔴',
    color: '#FFE5EB',
    target: 'ผู้หญิงวัยทำงาน 18-35 ปี',
    tone: 'Safe space ไม่ตัดสิน',
    cta: 'ปรึกษาลับ ปลอดภัย'
  },
  glp1: {
    name: 'GLP-1 ลดน้ำหนัก',
    emoji: '💉',
    color: '#DCFCE7',
    target: 'ผู้หญิง 25-45 ปี',
    tone: 'Lifestyle Medical',
    cta: 'ปรึกษา GLP-1 ฟรี'
  },
  ckd: {
    name: 'CKD Clinic โรคไตเรื้อรัง',
    emoji: '🫘',
    color: '#DBEAFE',
    target: 'ผู้ป่วย/ผู้ดูแล อายุ 40-65 ปี',
    tone: 'Medical trust',
    cta: 'ปรึกษา CKD Clinic ฟรี'
  },
  foreign: {
    name: 'ตรวจสุขภาพแรงงานต่างด้าว',
    emoji: '🧪',
    color: '#FEF3C7',
    target: 'HR/นายจ้าง สมุทรสาคร',
    tone: 'B2B เน้นราคา ความสะดวก',
    cta: 'สอบถามราคาหมู่คณะ'
  },
  mens: {
    name: 'สุขภาพชายวัย 40+',
    emoji: '🧔',
    color: '#E0E7FF',
    target: 'ผู้ชายอายุ 40-65 ปี ที่กังวลเรื่องพลังงาน อารมณ์ ฮอร์โมน',
    tone: 'ให้ความรู้ ไม่ตัดสิน ภายใต้การดูแลของแพทย์',
    cta: 'ปรึกษาแพทย์ฟรี'
  }
} as const
