'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import NavBar from '@/components/ui/NavBar'
import FooterFull from '@/components/ui/FooterFull'
import { track } from '@/lib/analytics/track'
import { LINE_OA_URL } from '@/lib/liff-links'
import { CERT_VERIFY_URL } from '@/lib/certs/verify-site'
import CertVerifyMock from '@/components/ui/CertVerifyMock'

// /medical-certificate — sells the same-day certificate on the one thing a
// certificate sold without an examination cannot offer: cert.roogondee.com.
//
// Every claim below is something that system actually does (see the
// medicalcertificate repo README): per-person QR with a random token,
// number-only lookup that shows status but no health data, confirmation
// stamped with who and when, void/expiry shown live, sick-leave diagnosis
// hidden on the public page, guessing rate-limited. Keep it that way — a
// trust page that overclaims is worse than none.
//
// Red lines: no competitor named, no price quoted (none agreed for this page,
// every CTA is LINE / phone), and the sample card is visibly a sample with a
// placeholder number — never a real certificate.

const PHONE = '034-110-988'
const PHONE_TEL = 'tel:034110988'
const PHONE_MOBILE = '081-902-3540'
const PHONE_MOBILE_TEL = 'tel:0819023540'
const VERIFY_HOST = CERT_VERIFY_URL.replace(/^https?:\/\//, '')

const COMPARE: { label: string; ours: string; unverified: string }[] = [
  { label: 'พบแพทย์และตรวจร่างกายจริง', ours: 'ทุกใบ', unverified: 'ไม่ได้ตรวจ' },
  { label: 'QR เฉพาะบุคคลบนใบ', ours: 'มี', unverified: 'ไม่มี' },
  { label: 'ผู้รับเอกสารสแกนเช็กได้เองว่าใบมีจริง', ours: 'ได้ทันที ไม่ต้องล็อกอิน', unverified: 'เช็กไม่ได้' },
  { label: 'แสดงสถานะหมดอายุ / ถูกยกเลิก', ours: 'อัปเดตตามจริง', unverified: 'ไม่มี' },
  { label: 'บันทึกว่าใครยืนยันข้อมูล เมื่อไหร่', ours: 'มี', unverified: 'ไม่มี' },
  { label: 'ความเสี่ยงทางกฎหมายของผู้ใช้ใบ', ours: 'ไม่มี', unverified: 'ผิดประมวลกฎหมายอาญา ม.269' },
]

const HOW = [
  { n: '1', title: 'พบแพทย์ ตรวจจริง', desc: 'ซักประวัติ ตรวจร่างกาย วัดความดัน ชีพจร น้ำหนัก และตรวจเพิ่มตามแบบฟอร์มที่ต้องใช้' },
  { n: '2', title: 'ยืนยันข้อมูลในระบบ', desc: 'เจ้าหน้าที่ตรวจทานข้อมูลบนใบก่อนส่งมอบ ระบบบันทึกผู้ยืนยันและวันเวลาไว้ทุกครั้ง' },
  { n: '3', title: 'รับใบพร้อม QR ในวันเดียว', desc: 'QR แต่ละดวงผูกกับใบของคุณคนเดียว มีรหัสสุ่มที่เดาไม่ได้' },
  { n: '4', title: 'ผู้รับเอกสารสแกนตรวจได้เอง', desc: 'นายจ้าง ฝ่ายบุคคล หรือหน่วยงาน สแกนแล้วเห็นใบฉบับจริงจากระบบโรงพยาบาลทันที ตลอด 24 ชั่วโมง' },
]

const FORMS = [
  { title: 'ใบรับรองแพทย์ 5 โรค', desc: 'สมัครงาน สมัครเรียน ยื่นหน่วยงานทั่วไป' },
  { title: 'ใบรับรองแพทย์สำหรับใบขับขี่', desc: '5 โรค + โรคลมชัก สำหรับทำ/ต่อใบอนุญาตขับรถ' },
  { title: 'ใบรับรองแพทย์ 2 ภาษา ไทย-อังกฤษ', desc: 'ยื่นบริษัทต่างชาติ สถานทูต หรือเรียนต่อ' },
  { title: 'ใบรับรองแพทย์ แบบ สณ.11', desc: 'สำหรับยื่นหน่วยงานราชการ' },
  { title: 'ใบรับรองการตรวจรักษา / ใบลาป่วย', desc: 'หน้าตรวจสอบสาธารณะไม่แสดงอาการหรือการวินิจฉัย' },
  { title: 'ตรวจสุขภาพแรงงานต่างด้าว', desc: 'Work Permit / MOU ตามประกาศกระทรวงสาธารณสุข', href: '/foreign' },
]

const RISKS = [
  {
    who: 'สำหรับผู้ใช้ใบ',
    points: [
      'ถ้านายจ้างหรือหน่วยงานตรวจสอบกับสถานพยาบาล ใบที่ไม่ได้ตรวจจริงจะไม่ผ่าน ต้องเสียเงินและเวลาไปตรวจใหม่ หรือเสียโอกาสงานนั้นไปเลย',
      'การใช้หรืออ้างคำรับรองแพทย์อันเป็นเท็จเป็นความผิดตามประมวลกฎหมายอาญา มาตรา 269 ทั้งผู้ออกและผู้ใช้',
      'ใบที่ได้มาโดยไม่ตรวจ บอกอะไรเกี่ยวกับสุขภาพจริงของคุณไม่ได้เลย',
    ],
  },
  {
    who: 'สำหรับนายจ้าง / ฝ่ายบุคคล',
    points: [
      'ดูด้วยตาแยกไม่ออกว่าใบไหนตรวจจริง ใบไหนไม่ได้ตรวจ — QR บอกได้ในไม่กี่วินาที',
      'พนักงานที่ไม่ได้ตรวจจริงอาจนำความเสี่ยงโรคติดต่อเข้าสู่ที่ทำงาน',
      'เก็บหลักฐานได้ว่าบริษัทตรวจสอบเอกสารแล้ว ไม่ต้องโทรถามโรงพยาบาลทีละใบ',
    ],
  },
]

const FAQS = [
  {
    q: 'ราคาเท่าไหร่',
    a: 'ขึ้นกับชนิดใบรับรองและรายการตรวจที่หน่วยงานปลายทางกำหนด ทัก LINE หรือโทรแจ้งว่าจะใช้ใบไปยื่นที่ไหน ทีมงานแจ้งราคาที่ชัดเจนให้ก่อนมาตรวจ',
  },
  {
    q: 'ใช้เวลานานไหม',
    a: 'ตรวจและรับใบรับรองได้ภายในวันเดียว สำหรับแบบฟอร์มทั่วไปไม่ต้องนัดล่วงหน้า แต่ทักมาก่อนจะช่วยให้ไม่ต้องรอนาน',
  },
  {
    q: 'ขอใบรับรองแพทย์โดยไม่ต้องตรวจได้ไหม',
    a: 'ไม่ได้ ทุกใบที่โรงพยาบาลดับเบิ้ลยู เมดิคอล ออกต้องผ่านการพบแพทย์และตรวจจริงเท่านั้น และเป็นเหตุผลที่ผู้รับเอกสารเชื่อถือ QR บนใบของเราได้',
  },
  {
    q: 'คนที่สแกน QR จะเห็นข้อมูลอะไรบ้าง',
    a: `QR บนใบเปิดใบรับรองฉบับเต็มจากระบบของโรงพยาบาล พร้อมสถานะ (ใช้ได้ / หมดอายุ / ถูกยกเลิก) และผู้ยืนยันข้อมูล ส่วนการกรอกเลขที่ใบ 10 หลักที่ ${VERIFY_HOST} จะเห็นเฉพาะผลยืนยันขั้นต้น ไม่เห็นชื่อหรือผลตรวจ ใบลาป่วยจะไม่แสดงอาการหรือการวินิจฉัยบนหน้าตรวจสอบสาธารณะ`,
  },
  {
    q: 'มีคนเอาเลขใบของฉันไปสุ่มเปิดได้ไหม',
    a: 'การเปิดใบฉบับเต็มต้องมีรหัสสุ่มที่อยู่ใน QR เท่านั้น และระบบหยุดตอบทันทีเมื่อมีการสุ่มเลขผิดซ้ำ ๆ ทุกการเข้าดูถูกบันทึกไว้ ข้อมูลคุ้มครองตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562',
  },
  {
    q: 'ได้ใบที่อ้างว่าออกโดยโรงพยาบาลดับเบิ้ลยู เมดิคอล แต่สแกนไม่ขึ้น',
    a: `ลองกรอกเลขที่ใบที่ ${VERIFY_HOST} หากไม่พบในระบบ กรุณาโทร ${PHONE} เพื่อให้โรงพยาบาลยืนยัน`,
  },
]

export default function MedicalCertificateClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => { track('medcert_landing_view') }, [])

  const onLine = (position: string) => track('medcert_line_click', { service: 'medcert', position })
  const onCall = (position: string) => track('medcert_call_click', { service: 'medcert', position })
  const onVerify = (position: string) => track('medcert_verify_click', { position })

  return (
    <main className="min-h-screen bg-cream text-rtext pb-20 md:pb-0">
      <NavBar ctaHref={LINE_OA_URL} ctaLabel="ทัก LINE นัดตรวจ" />

      {/* HERO */}
      <section className="pt-28 md:pt-32 pb-14 md:pb-20 px-5 md:px-20 bg-gradient-to-br from-emerald-50 via-cream to-cream overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1.15fr_1fr] gap-10 md:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-semibold mb-5">
              ใบรับรองแพทย์ · โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-forest leading-tight mb-4">
              ใบรับรองแพทย์ที่ตรวจจริง<br />
              <span className="text-mint">พิสูจน์ได้ทุกใบด้วย QR</span>
            </h1>
            <p className="text-muted text-base md:text-lg leading-relaxed mb-6 max-w-xl">
              ทุกใบออกหลังพบแพทย์และตรวจร่างกายจริง พร้อม QR เฉพาะของคุณ — นายจ้าง ฝ่ายบุคคล หรือหน่วยงานที่รับเอกสาร
              สแกนแล้วเห็นทันทีว่าใบนี้ออกจริง ยังไม่หมดอายุ และผ่านการยืนยันข้อมูลแล้ว ไม่ต้องโทรถาม
            </p>
            <ul className="grid sm:grid-cols-3 gap-2 mb-7 text-sm">
              {['พบแพทย์จริงทุกใบ', 'รับใบได้ในวันเดียว', 'ตรวจสอบได้ 24 ชม.'].map(t => (
                <li key={t} className="flex items-center gap-2 bg-white/70 border border-mint/20 rounded-xl px-3 py-2">
                  <span className="text-mint font-bold">✓</span><span className="text-forest font-medium">{t}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={LINE_OA_URL} target="_blank" rel="noopener noreferrer" onClick={() => onLine('hero')}
                className="flex items-center justify-center bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold shadow-lg hover:brightness-95">
                ทัก LINE นัดตรวจ / ถามราคา
              </a>
              <a href={PHONE_TEL} onClick={() => onCall('hero')}
                className="flex items-center justify-center border border-forest/30 text-forest px-8 py-4 rounded-full text-sm font-bold hover:bg-mint/10">
                โทร {PHONE}
              </a>
            </div>
            <a href={CERT_VERIFY_URL} target="_blank" rel="noopener noreferrer" onClick={() => onVerify('hero')}
              className="inline-block mt-4 text-sm text-sage font-semibold underline underline-offset-4 hover:text-forest">
              มีใบรับรองอยู่แล้ว? ตรวจสอบที่ {VERIFY_HOST} →
            </a>
          </div>

          <CertVerifyMock />
        </div>
      </section>

      {/* PROBLEM — certificates sold without an examination */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2">รู้ไว้ก่อนซื้อใบรับรองแพทย์ราคาถูก</p>
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-3">ใบรับรองแพทย์ที่ไม่ได้ตรวจ ถูกกว่า แต่ไม่คุ้ม</h2>
          <p className="text-muted text-sm md:text-base leading-relaxed max-w-3xl mb-8">
            ใบรับรองแพทย์ที่ได้มาโดยไม่ต้องพบแพทย์อาจดูเหมือนประหยัด แต่ถ้าถูกตรวจสอบแล้วไม่ผ่าน ต้องจ่ายซ้ำ เสียเวลา
            และผู้ใช้ใบเองก็มีความผิดด้วย
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {RISKS.map(r => (
              <div key={r.who} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
                <h3 className="font-semibold text-forest mb-3">{r.who}</h3>
                <ul className="space-y-2.5 text-sm text-rtext">
                  {r.points.map(p => (
                    <li key={p} className="flex gap-2.5"><span className="text-amber-600 font-bold">!</span><span>{p}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARE */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-cream">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-6 text-center">ต่างกันตรงไหน</h2>
          <div className="overflow-hidden rounded-2xl border border-mint/20 bg-white shadow-sm">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] text-xs md:text-sm font-semibold">
              <div className="p-3 md:p-4 text-muted">&nbsp;</div>
              <div className="p-3 md:p-4 bg-forest text-white text-center">W Medical</div>
              <div className="p-3 md:p-4 bg-gray-100 text-gray-500 text-center">ใบที่ไม่ได้ตรวจจริง</div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.label} className={`grid grid-cols-[1.4fr_1fr_1fr] text-xs md:text-sm ${i % 2 ? 'bg-cream/40' : ''}`}>
                <div className="p-3 md:p-4 text-rtext font-medium">{row.label}</div>
                <div className="p-3 md:p-4 text-center text-forest font-semibold bg-mint/5">
                  <span className="text-mint">✓</span> {row.ours}
                </div>
                <div className="p-3 md:p-4 text-center text-gray-500">
                  <span className="text-red-400">✕</span> {row.unverified}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-2">จากห้องตรวจ ถึงมือผู้รับเอกสาร</h2>
          <p className="text-muted text-sm mb-8">ระบบตรวจสอบใบรับรองของโรงพยาบาลเอง ไม่ผ่านตัวกลาง</p>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW.map(s => (
              <li key={s.n} className="bg-cream/60 rounded-2xl border border-mint/20 p-5">
                <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold mb-3">{s.n}</div>
                <div className="font-semibold text-forest mb-1">{s.title}</div>
                <div className="text-sm text-muted leading-relaxed">{s.desc}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FOR EMPLOYERS */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-gradient-to-br from-forest to-sage text-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1.3fr_1fr] gap-8 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-white/60 mb-2">สำหรับนายจ้าง / ฝ่ายบุคคล</p>
            <h2 className="font-display text-2xl md:text-3xl mb-3">ตรวจสอบใบรับรองแพทย์ของพนักงานได้เอง ทุกใบ</h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-5">
              สแกน QR บนใบด้วยกล้องมือถือ หรือกรอกเลขที่ใบ 10 หลักที่ {VERIFY_HOST} เพื่อดูว่าใบมีอยู่จริง
              หมดอายุหรือถูกยกเลิกหรือไม่ — ฟรี ไม่ต้องสมัครสมาชิก ส่งพนักงานมาตรวจเป็นกลุ่มได้ ทั้งพนักงานไทยและแรงงานต่างด้าว
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={CERT_VERIFY_URL} target="_blank" rel="noopener noreferrer" onClick={() => onVerify('employer')}
                className="flex items-center justify-center bg-white text-forest px-6 py-3.5 rounded-full text-sm font-bold hover:bg-cream">
                ลองตรวจสอบใบรับรอง
              </a>
              <a href={PHONE_TEL} onClick={() => onCall('employer')}
                className="flex items-center justify-center border border-white/40 px-6 py-3.5 rounded-full text-sm font-bold hover:bg-white/10">
                ติดต่อตรวจเป็นกลุ่ม {PHONE}
              </a>
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              'เห็นใบฉบับจริงจากระบบโรงพยาบาล ไม่ใช่ไฟล์ที่ส่งต่อกันมา',
              'ใบที่โรงพยาบาลยกเลิกจะขึ้นว่า "ถูกยกเลิก" ทันที',
              'บอกได้ว่าข้อมูลบนใบผ่านการยืนยันแล้วหรือยัง',
              'ใช้ได้กับใบทุกแบบที่โรงพยาบาลออก',
            ].map(t => (
              <li key={t} className="flex gap-3 bg-white/10 rounded-xl px-4 py-3">
                <span className="text-leaf font-bold">✓</span><span className="text-white/90">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FORMS */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-cream">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-2">ใบรับรองแพทย์ที่ออกได้</h2>
          <p className="text-muted text-sm mb-8">ทุกแบบมี QR ตรวจสอบได้ ไม่แน่ใจว่าต้องใช้แบบไหน ส่งรูปแบบฟอร์มที่หน่วยงานให้มาทาง LINE ได้เลย</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FORMS.map(f => {
              const body = (
                <>
                  <div className="font-semibold text-forest">{f.title}</div>
                  <div className="text-sm text-muted mt-1">{f.desc}</div>
                  {f.href && <div className="text-xs text-sage font-semibold mt-2">ดูรายละเอียด →</div>}
                </>
              )
              return f.href ? (
                <Link key={f.title} href={f.href} className="block rounded-2xl border border-mint/20 bg-white p-5 hover:border-mint hover:shadow-md transition-all">{body}</Link>
              ) : (
                <div key={f.title} className="rounded-2xl border border-mint/20 bg-white p-5">{body}</div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-6">คำถามที่พบบ่อย</h2>
          <div className="divide-y divide-mint/20 border-y border-mint/20">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left py-4 flex justify-between items-center gap-4">
                  <span className="font-semibold text-forest">{f.q}</span>
                  <span className="text-mint text-xl">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <p className="pb-4 text-sm text-muted leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-14 md:py-20 px-5 md:px-20 bg-cream">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl text-forest mb-3">ตรวจจริง ได้ใบที่ใครก็ตรวจสอบได้</h2>
          <p className="text-muted text-sm md:text-base mb-6">
            โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร — ใบอนุญาตสถานพยาบาล (สมุทรสาคร) 001/2569
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={LINE_OA_URL} target="_blank" rel="noopener noreferrer" onClick={() => onLine('final')}
              className="flex items-center justify-center bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold shadow-lg hover:brightness-95">
              ทัก LINE @roogondee
            </a>
            <a href={PHONE_TEL} onClick={() => onCall('final')}
              className="flex items-center justify-center border border-forest/30 text-forest px-8 py-4 rounded-full text-sm font-bold hover:bg-mint/10">
              โทร {PHONE}
            </a>
            <a href={PHONE_MOBILE_TEL} onClick={() => onCall('final_mobile')}
              className="flex items-center justify-center border border-forest/30 text-forest px-8 py-4 rounded-full text-sm font-bold hover:bg-mint/10">
              โทร {PHONE_MOBILE}
            </a>
          </div>
        </div>
      </section>

      <FooterFull />

      {/* MOBILE STICKY BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-mint/20 md:hidden grid grid-cols-2 gap-2">
        <a href={LINE_OA_URL} target="_blank" rel="noopener noreferrer" onClick={() => onLine('sticky_bar')}
          className="flex items-center justify-center bg-[#06C755] text-white py-3 rounded-full text-sm font-bold">
          ทัก LINE
        </a>
        <a href={PHONE_TEL} onClick={() => onCall('sticky_bar')}
          className="flex items-center justify-center bg-forest text-white py-3 rounded-full text-sm font-bold">
          โทร {PHONE}
        </a>
      </div>
    </main>
  )
}
