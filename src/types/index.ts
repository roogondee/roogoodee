export type Service = 'std' | 'glp1' | 'ckd' | 'foreign'

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

export interface Lead {
  id?: string
  service: Service
  first_name: string
  last_name?: string
  phone: string
  age?: string
  gender?: string
  note?: string
  source?: string
  status?: 'new' | 'contacted' | 'converted'
  created_at?: string
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
  }
} as const
