'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import NavBar from '@/components/ui/NavBar'
import FooterFull from '@/components/ui/FooterFull'
import RefCodeNote from '@/components/ui/RefCodeNote'
import { useRefCode } from '@/components/ui/useRefCode'
import { track } from '@/lib/analytics/track'
import { SERVICE_IMAGES } from '@/config/service-images'

// /clinic — for people searching "คลินิกใกล้ฉัน / โรงพยาบาลใกล้ฉัน". They
// want three things, in this order: a number to call, the way there, and
// whether what they need is done here. Everything else is below the fold.
//
// Copy rules: no opening hours beyond "เปิดทุกวัน" (owner-provided, as on
// /dmglp), no prices, no claims about insurance or government schemes, no
// emergency-room claim — anything urgent is sent to 1669 instead.

const PHONE = '034-110-988'
const PHONE_TEL = 'tel:034110988'
const PHONE_MOBILE = '081-902-3540'
const PHONE_MOBILE_TEL = 'tel:0819023540'
const ADDRESS = '99/26 หมู่ 5 ต.บางน้ำจืด อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000'
const GEO = '13.6286116,100.3551941'
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${GEO}`
const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${GEO}`

const SERVICES: { title: string; desc: string; href: string; cta: string }[] = [
  { title: 'พบแพทย์ ตรวจอาการเจ็บป่วย', desc: 'ไข้ ไอ ปวดท้อง หรืออาการที่อยากให้แพทย์ดู — โทรหรือทัก LINE ให้ทีมช่วยนัด หรือเล่าอาการให้ผู้ช่วย AI ประเมินเบื้องต้นก่อนก็ได้', href: '/advice', cta: 'ปรึกษาอาการก่อน' },
  { title: 'ใบรับรองแพทย์', desc: '5 โรค · ใบขับขี่ · 2 ภาษา · สณ.11 · ใบลาป่วย — ตรวจจริงทุกใบ ตรวจสอบได้ด้วย QR', href: '/medical-certificate', cta: 'ดูรายละเอียด' },
  { title: 'ตรวจสุขภาพแรงงานต่างด้าว', desc: 'Work Permit / MOU ตามประกาศกระทรวงสาธารณสุข ตรวจเป็นกลุ่มสำหรับโรงงานได้', href: '/foreign', cta: 'ดูรายละเอียด' },
  { title: 'เบาหวาน & ควบคุมน้ำหนัก', desc: 'โปรแกรมดูแลโดยแพทย์ ตรวจแล็บ ติดตามผลต่อเนื่อง', href: '/dmglp', cta: 'ดูโปรแกรม' },
  { title: 'ตรวจคัดกรองโรคไต', desc: 'ตรวจปัสสาวะและค่าการทำงานของไต สำหรับผู้มีเบาหวาน ความดัน หรือประวัติครอบครัว', href: '/ckd', cta: 'ดูรายละเอียด' },
  { title: 'สุขภาพทางเพศ / PrEP', desc: 'ตรวจ HIV ซิฟิลิส ปรึกษายา PrEP/PEP เป็นความลับ', href: '/std', cta: 'ดูรายละเอียด' },
  { title: 'สุขภาพผู้หญิง', desc: 'ปรึกษาสูตินรีแพทย์ เรื่องตกขาว ประจำเดือน HPV / Pap smear วัยทอง', href: '/women', cta: 'ดูรายละเอียด' },
  { title: 'สุขภาพผู้ชายวัย 40+', desc: 'ปรึกษาแพทย์เรื่องฮอร์โมนและสมรรถภาพ เป็นส่วนตัว', href: '/mens', cta: 'ดูรายละเอียด' },
]

const STEPS = [
  { n: '1', title: 'โทรหรือทัก LINE', desc: 'บอกอาการหรือบริการที่ต้องการ ทีมงานเช็กคิวแพทย์ให้' },
  { n: '2', title: 'รู้เวลาและค่าใช้จ่ายก่อนมา', desc: 'ทีมงานแจ้งวันเวลาที่สะดวกและค่าใช้จ่ายของบริการนั้นให้ทราบก่อนเสมอ' },
  { n: '3', title: 'มาที่โรงพยาบาล', desc: 'กดนำทางด้วย Google Maps แล้วแจ้งรหัสอ้างอิงของคุณกับเจ้าหน้าที่' },
]

const FAQS = [
  { q: 'ต้องนัดล่วงหน้าไหม', a: 'แนะนำให้โทรหรือทัก LINE ก่อน เพื่อเช็กคิวแพทย์และเตรียมเอกสารที่ต้องใช้ จะได้ไม่ต้องรอนาน' },
  { q: 'ค่าใช้จ่ายเท่าไหร่', a: 'ขึ้นกับบริการและรายการตรวจที่แพทย์สั่ง ทีมงานแจ้งค่าใช้จ่ายให้ทราบก่อนทุกครั้ง โทรหรือทัก LINE ถามได้เลย' },
  { q: 'อาการแบบไหนต้องไปห้องฉุกเฉินทันที', a: 'เจ็บแน่นหน้าอก หายใจไม่ออก ปากเบี้ยว แขนขาอ่อนแรงทันที ชัก หมดสติ หรือเลือดออกมาก — โทร 1669 ทันที ไม่ต้องรอนัด' },
]

export default function ClinicClient() {
  // CL-xxxxx: pre-filled into LINE and shown on the page; staff record it at
  // the counter (/admin/redeem) so the click that brought the patient counts.
  const { refCode, lineUrl } = useRefCode('clinic')

  useEffect(() => { track('clinic_landing_view') }, [])

  const onCall = (position: string) => track('clinic_call_click', { service: 'clinic', position, ref_code: refCode || 'none' })
  const onLine = (position: string) => track('clinic_line_click', { service: 'clinic', position, ref_code: refCode || 'none' })
  const onDirections = (position: string) => track('clinic_directions_click', { service: 'clinic', position, ref_code: refCode || 'none' })

  return (
    <main className="min-h-screen bg-cream text-rtext pb-24 md:pb-0">
      {/* Short label: on mobile the global menu button sits over the navbar
          button, and a full phone number there came out half-covered. The
          number itself is the first thing in the hero. */}
      <NavBar ctaHref={PHONE_TEL} ctaLabel="โทรเลย" />

      {/* HERO — call, directions, LINE */}
      <section className="pt-28 md:pt-32 pb-12 md:pb-16 px-5 md:px-20 bg-gradient-to-br from-emerald-50 via-cream to-cream overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-semibold mb-5">
              โรงพยาบาลดับเบิ้ลยู เมดิคอล · สมุทรสาคร · เปิดทุกวัน
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-forest leading-tight mb-4">
              พบแพทย์ใกล้คุณ<br /><span className="text-mint">ที่โรงพยาบาลดับเบิ้ลยู เมดิคอล</span>
            </h1>
            <p className="text-muted text-base md:text-lg leading-relaxed mb-2 max-w-xl">{ADDRESS}</p>
            <p className="text-muted text-sm mb-6">โทรเช็กคิวแพทย์ก่อนมาได้ ทีมงานแจ้งค่าใช้จ่ายให้ทราบก่อนเสมอ</p>

            <div className="grid sm:grid-cols-3 gap-3">
              <a href={PHONE_TEL} onClick={() => onCall('hero')}
                className="flex flex-col items-center justify-center bg-forest text-white px-4 py-4 rounded-2xl font-bold shadow-lg hover:bg-sage">
                <span className="text-sm">โทรเลย</span><span className="text-lg tracking-wide">{PHONE}</span>
              </a>
              <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" onClick={() => onDirections('hero')}
                className="flex flex-col items-center justify-center bg-white border-2 border-forest/20 text-forest px-4 py-4 rounded-2xl font-bold hover:border-mint">
                <span className="text-sm">นำทาง</span><span className="text-lg">Google Maps</span>
              </a>
              <a href={lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => onLine('hero')}
                className="flex flex-col items-center justify-center bg-[#06C755] text-white px-4 py-4 rounded-2xl font-bold hover:brightness-95">
                <span className="text-sm">ทัก LINE นัดคิว</span><span className="text-lg">@roogondee</span>
              </a>
            </div>
            <RefCodeNote refCode={refCode} />
          </div>

          <div className="relative w-full h-56 md:h-80 rounded-3xl overflow-hidden shadow-xl">
            <Image src={SERVICE_IMAGES.hospital} alt="" fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 45vw" />
          </div>
        </div>
      </section>

      {/* EMERGENCY — never let a "near me" search wait for an appointment */}
      <section className="px-5 md:px-20 pb-10 bg-cream">
        <div className="max-w-6xl mx-auto rounded-2xl border border-red-200 bg-red-50 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-red-800">อาการฉุกเฉิน ไม่ต้องรอนัด</p>
            <p className="text-sm text-red-700 leading-relaxed">
              เจ็บแน่นหน้าอก หายใจไม่ออก ปากเบี้ยว แขนขาอ่อนแรงทันที ชัก หมดสติ หรือเลือดออกมาก — โทรสายด่วน 1669 ทันที
            </p>
          </div>
          <a href="tel:1669" onClick={() => track('clinic_1669_click', { position: 'emergency_box' })}
            className="inline-flex items-center justify-center bg-red-600 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-red-700 whitespace-nowrap">
            โทร 1669
          </a>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-2">มาทำอะไรได้บ้าง</h2>
          <p className="text-muted text-sm mb-8">ไม่แน่ใจว่าต้องพบแผนกไหน โทรหรือทัก LINE บอกอาการได้เลย ทีมงานช่วยจัดให้</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map(s => (
              <Link key={s.title} href={s.href} onClick={() => track('clinic_service_click', { target: s.href })}
                className="flex flex-col rounded-2xl border border-mint/20 bg-cream/50 p-5 hover:border-mint hover:shadow-md transition-all">
                <span className="font-semibold text-forest">{s.title}</span>
                <span className="text-sm text-muted mt-1 flex-1 leading-relaxed">{s.desc}</span>
                <span className="text-xs text-sage font-semibold mt-3">{s.cta} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO COME + MAP CARD */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-cream">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="font-display text-2xl md:text-3xl text-forest mb-6">มาพบแพทย์ง่าย ๆ 3 ขั้นตอน</h2>
            <ol className="space-y-4">
              {STEPS.map(s => (
                <li key={s.n} className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{s.n}</span>
                  <div>
                    <div className="font-semibold text-forest">{s.title}</div>
                    <div className="text-sm text-muted leading-relaxed">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl bg-white border border-mint/20 shadow-sm p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">ที่ตั้ง</p>
            <p className="font-semibold text-forest mb-1">โรงพยาบาลดับเบิ้ลยู เมดิคอล (W Medical Hospital)</p>
            <p className="text-sm text-muted leading-relaxed mb-4">{ADDRESS}</p>
            <div className="flex flex-wrap gap-2">
              <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" onClick={() => onDirections('map_card')}
                className="bg-forest text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-sage">นำทางด้วย Google Maps</a>
              <a href={MAP_URL} target="_blank" rel="noopener noreferrer" onClick={() => onDirections('map_card_view')}
                className="border border-forest/30 text-forest px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-mint/10">ดูแผนที่</a>
            </div>
            <div className="border-t border-gray-100 mt-5 pt-4 text-sm space-y-1">
              <p>โทร <a href={PHONE_TEL} onClick={() => onCall('map_card')} className="text-forest font-semibold underline">{PHONE}</a>
                {' '}· <a href={PHONE_MOBILE_TEL} onClick={() => onCall('map_card_mobile')} className="text-forest font-semibold underline">{PHONE_MOBILE}</a></p>
              <p className="text-xs text-gray-500">ใบอนุญาตสถานพยาบาล (สมุทรสาคร) 001/2569</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-6">คำถามที่พบบ่อย</h2>
          <div className="space-y-3">
            {FAQS.map(f => (
              <details key={f.q} className="group bg-cream border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm">
                  {f.q}<span className="ml-4 text-mint text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="px-6 pb-5 text-muted text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <FooterFull />

      {/* MOBILE STICKY BAR — the three things this visitor came for */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-mint/20 md:hidden grid grid-cols-3 gap-2">
        <a href={PHONE_TEL} onClick={() => onCall('sticky_bar')}
          className="flex items-center justify-center bg-forest text-white py-3 rounded-full text-sm font-bold">โทร</a>
        <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" onClick={() => onDirections('sticky_bar')}
          className="flex items-center justify-center border border-forest/30 text-forest py-3 rounded-full text-sm font-bold">นำทาง</a>
        <a href={lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => onLine('sticky_bar')}
          className="flex items-center justify-center bg-[#06C755] text-white py-3 rounded-full text-sm font-bold">LINE</a>
      </div>
    </main>
  )
}
