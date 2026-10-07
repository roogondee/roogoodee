'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { track, readUtm } from '@/lib/analytics/track'
import { getConsent, setConsent, CONSENT_EVENT, type ConsentValue } from '@/lib/analytics/consent'
import { LINE_OA_URL } from '@/lib/liff-links'
import { HOSPITAL_NAME, HOSPITAL_PHONE, HOSPITAL_PHONE_TEL } from '@/lib/dmglp/config'

// /dmglp — W Medical diabetes & metabolic care programme landing.
//
// Spec §1 hard boundaries, all enforced by what is NOT on this page: no drug
// brand names, no strengths, no drug prices, no ordering. The page's job is
// to get an interested visitor into LINE with a ref code (DM-4821) attached,
// so the click can later be matched to "booked" / "treatment_started"
// offline conversions (§4.9) — nothing about the person ever reaches Google.

const STEPS = [
  { n: '1', title: 'ทัก LINE หรือโทร', desc: 'ทีมงานตอบคำถามเบื้องต้นและนัดวันพบแพทย์ให้' },
  { n: '2', title: 'พบแพทย์เฉพาะทาง + ตรวจแล็บ', desc: 'ประเมินความเหมาะสม ตรวจน้ำตาล ไขมัน ไต ตับ ก่อนเริ่มทุกครั้ง' },
  { n: '3', title: 'เริ่มแผนการดูแล', desc: 'แพทย์เป็นผู้ตัดสินใจเรื่องการรักษาและปรับแผนตามผลตรวจ' },
  { n: '4', title: 'ติดตามต่อเนื่อง 6 เดือน', desc: 'นัดติดตามทุก 4 สัปดาห์ เภสัชกรติดตามผ่าน LINE ตรวจแล็บซ้ำเดือนที่ 3 และ 6' },
]

const INCLUDED = [
  ['พบแพทย์เฉพาะทาง', 'ประเมินก่อนเริ่ม และทุก 3 เดือน'],
  ['ตรวจแล็บ', 'น้ำตาลสะสม (HbA1c), น้ำตาล, ไขมัน, การทำงานของไตและตับ'],
  ['ติดตามผลทุก 4 สัปดาห์', 'โดยแพทย์หรือเภสัชกร ปรับแผนตามผลจริง'],
  ['เภสัชกรดูแลผ่าน LINE', 'ถามผลข้างเคียงได้ทุกวัน แจ้งเตือนวันนัดล่วงหน้า'],
  ['วัดองค์ประกอบร่างกาย', 'ดูมวลกล้ามเนื้อ ไขมัน ระหว่างลดน้ำหนัก (ตามแพ็กเกจ)'],
  ['นักกำหนดอาหาร', 'วางแผนอาหารที่ทำตามได้จริง (ตามแพ็กเกจ)'],
]

const FOR_WHOM = [
  'เป็นเบาหวานชนิดที่ 2 และอยากคุมน้ำตาลให้ดีขึ้นพร้อมลดน้ำหนัก',
  'น้ำหนักเกิน (BMI 30 ขึ้นไป หรือ 27 ขึ้นไปร่วมกับความดัน ไขมัน หรือเบาหวาน)',
  'เคยพยายามลดน้ำหนักเองแล้วไม่ได้ผล และต้องการให้แพทย์ดูแลอย่างปลอดภัย',
]

const NOT_FOR = [
  'ตั้งครรภ์ ให้นมบุตร หรือวางแผนตั้งครรภ์',
  'มีประวัติมะเร็งไทรอยด์ชนิด medullary หรือ MEN2 ในตนเองหรือครอบครัว',
]

const FAQS = [
  { q: 'โปรแกรมนี้ใช้ยาอะไร', a: 'แพทย์จะเป็นผู้พิจารณาแนวทางการรักษาหลังตรวจประเมิน ซึ่งอาจรวมถึงยาฉีดควบคุมน้ำตาลและน้ำหนักในกลุ่ม GLP-1 ที่จัดเป็นยาควบคุมพิเศษ ต้องสั่งโดยแพทย์และจ่ายโดยเภสัชกรที่โรงพยาบาลเท่านั้น จึงไม่มีการแจ้งชื่อยาหรือจำหน่ายผ่านช่องทางออนไลน์' },
  { q: 'ค่าใช้จ่ายเท่าไหร่', a: 'มีแพ็กเกจ 6 เดือน 3 ระดับ ครอบคลุมค่าแพทย์ ค่าติดตาม และค่าตรวจแล็บ ผ่อน 0% ได้ 6 เดือน ส่วนค่ายาคิดตามจริงในแต่ละครั้งที่แพทย์สั่ง ทีมงานแจ้งรายละเอียดราคาให้ทาง LINE หรือโทรศัพท์' },
  { q: 'ต้องมาโรงพยาบาลบ่อยแค่ไหน', a: 'พบแพทย์เฉพาะทางวันแรก เดือนที่ 3 และเดือนที่ 6 ระหว่างนั้นนัดติดตามทุก 4 สัปดาห์กับแพทย์หรือเภสัชกร และมีเภสัชกรติดตามผ่าน LINE ในสัปดาห์แรก' },
  { q: 'ถ้าตรวจแล้วไม่เหมาะกับโปรแกรม', a: 'แพทย์จะแจ้งและแนะนำทางเลือกอื่น หากซื้อแพ็กเกจไว้แล้ว คืนเงินส่วนที่ยังไม่ได้ใช้บริการตามเงื่อนไข' },
  { q: 'ข้อมูลสุขภาพของฉันปลอดภัยไหม', a: 'ข้อมูลอยู่ในระบบของโรงพยาบาลภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล ข้อความแจ้งเตือนทาง LINE ไม่ระบุโรค ชื่อยา หรือผลตรวจ และไม่มีการส่งข้อมูลสุขภาพให้แพลตฟอร์มโฆษณา' },
]

export default function DmglpLandingClient() {
  const searchParams = useSearchParams()
  const [lineUrl, setLineUrl] = useState<string>(LINE_OA_URL)
  const [refCode, setRefCode] = useState<string | null>(null)
  const [consent, setConsentState] = useState<ConsentValue | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Mint the ref code once per visit (kept in sessionStorage so a reload
  // does not create a second attribution row for the same click).
  useEffect(() => {
    setConsentState(getConsent())
    const onChange = (e: Event) => setConsentState((e as CustomEvent<ConsentValue>).detail)
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    const cached = safeSession('dmglp_ref')
    if (cached) {
      try { const c = JSON.parse(cached) as { ref_code: string; line_url: string }; setRefCode(c.ref_code); setLineUrl(c.line_url); return } catch {}
    }
    const utm = readUtm(searchParams)
    fetch('/api/dmglp/attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gclid: searchParams?.get('gclid') || undefined,
        ...utm,
        utm_term: searchParams?.get('utm_term') || undefined,
        utm_content: searchParams?.get('utm_content') || undefined,
        ref: searchParams?.get('ref') || undefined,
        consent: getConsent() === 'accepted',
        path: window.location.pathname + window.location.search.slice(0, 200),
      }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { ref_code: string; line_url: string } | null) => {
        if (!d || cancelled) return
        setRefCode(d.ref_code)
        setLineUrl(d.line_url)
        try { sessionStorage.setItem('dmglp_ref', JSON.stringify(d)) } catch {}
      })
      .catch(() => undefined)
    track('dmglp_landing_view')
    return () => { cancelled = true }
  }, [searchParams])

  const onLine = (position: string) => track('dmglp_line_click', { position, ref_code: refCode || 'none' })
  const onCall = (position: string) => track('dmglp_call_click', { position })

  return (
    <main className="min-h-screen bg-cream text-rtext">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-5 md:px-10 py-3 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-lg"><span className="text-forest">รู้ก่อน</span><span className="text-mint italic">ดี</span> <span className="text-muted text-xs font-sans">× W Medical</span></Link>
        <a href={HOSPITAL_PHONE_TEL} onClick={() => onCall('nav')} className="text-sm font-semibold text-forest">โทร {HOSPITAL_PHONE}</a>
      </nav>

      {/* HERO */}
      <section className="pt-24 pb-12 px-5 md:px-20 bg-gradient-to-br from-emerald-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-semibold mb-5">
            โปรแกรม 6 เดือน · {HOSPITAL_NAME} สมุทรสาคร
          </div>
          <h1 className="font-display text-3xl md:text-5xl text-forest leading-tight mb-4">
            คุมเบาหวานและลดน้ำหนัก<br />ภายใต้การดูแลของแพทย์เฉพาะทาง
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-7 max-w-xl">
            ตรวจแล็บก่อนเริ่ม แพทย์ประเมินความเหมาะสม ติดตามผลทุก 4 สัปดาห์ และมีเภสัชกรดูแลผ่าน LINE ตลอดโปรแกรม
            ไม่ต้องเดาเอง ไม่ซื้อยาออนไลน์
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => onLine('hero')}
              className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold shadow-lg hover:brightness-95">
              ทัก LINE นัดพบแพทย์
            </a>
            <a href={HOSPITAL_PHONE_TEL} onClick={() => onCall('hero')}
              className="flex items-center justify-center gap-2 border border-forest/30 text-forest px-8 py-4 rounded-full text-sm font-bold hover:bg-mint/10">
              โทร {HOSPITAL_PHONE}
            </a>
          </div>
          {refCode && <p className="text-xs text-muted mt-3">รหัสอ้างอิงของคุณ: {refCode} (แนบในข้อความ LINE อัตโนมัติ)</p>}
        </div>
      </section>

      {/* FOR WHOM */}
      <section className="px-5 md:px-20 py-12 grid md:grid-cols-2 gap-6 max-w-5xl">
        <div className="bg-white rounded-2xl border border-mint/20 p-6">
          <h2 className="font-display text-xl text-forest mb-3">เหมาะกับใคร</h2>
          <ul className="space-y-2 text-sm">{FOR_WHOM.map(t => <li key={t} className="flex gap-2"><span className="text-mint">✓</span><span>{t}</span></li>)}</ul>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-6">
          <h2 className="font-display text-xl text-forest mb-3">ยังไม่เหมาะ / ต้องให้แพทย์พิจารณาก่อน</h2>
          <ul className="space-y-2 text-sm">{NOT_FOR.map(t => <li key={t} className="flex gap-2"><span className="text-amber-600">!</span><span>{t}</span></li>)}</ul>
          <p className="text-xs text-muted mt-3">ผู้ที่มีประวัติตับอ่อนอักเสบ โรคถุงน้ำดี หรือใช้อินซูลินอยู่ แพทย์จะประเมินเพิ่มเติมก่อนเริ่ม</p>
        </div>
      </section>

      {/* INCLUDED */}
      <section className="px-5 md:px-20 py-12 bg-white">
        <h2 className="font-display text-2xl text-forest mb-6">ในโปรแกรมมีอะไรบ้าง</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {INCLUDED.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-gray-100 p-4 bg-cream/40">
              <div className="font-semibold text-forest">{t}</div>
              <div className="text-sm text-muted mt-1">{d}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-5 max-w-3xl">แพ็กเกจครอบคลุมค่าบริการ ค่าแพทย์ และค่าตรวจแล็บ ค่ายาคิดตามจริงในแต่ละครั้งที่แพทย์สั่ง แจ้งรายละเอียดราคาผ่าน LINE หรือโทรศัพท์</p>
      </section>

      {/* STEPS */}
      <section className="px-5 md:px-20 py-12">
        <h2 className="font-display text-2xl text-forest mb-6">ขั้นตอน</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl">
          {STEPS.map(s => (
            <li key={s.n} className="bg-white rounded-xl border border-mint/20 p-4">
              <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold mb-2">{s.n}</div>
              <div className="font-semibold text-forest">{s.title}</div>
              <div className="text-sm text-muted mt-1">{s.desc}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* SAFETY */}
      <section className="px-5 md:px-20 py-10 bg-forest text-white">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl mb-3">ปลอดภัยเพราะทำที่โรงพยาบาล</h2>
          <ul className="space-y-2 text-sm text-white/85">
            <li>• แพทย์เป็นผู้ตัดสินใจเรื่องการรักษาและการปรับแผนทุกครั้ง ระบบของโรงพยาบาลบันทึกไว้ทุกขั้นตอน</li>
            <li>• ยาที่ใช้ในโปรแกรมเป็นยาควบคุมพิเศษ สั่งโดยแพทย์และจ่ายโดยเภสัชกรเท่านั้น จัดเก็บในตู้เย็นควบคุมอุณหภูมิ มีทะเบียนตรวจสอบย้อนกลับ</li>
            <li>• มีช่องทางแจ้งอาการผิดปกติผ่าน LINE ทุกวัน หากพบอาการที่ต้องรีบดูแล ทีมแพทย์จะติดต่อกลับทันที</li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 md:px-20 py-12 max-w-3xl">
        <h2 className="font-display text-2xl text-forest mb-5">คำถามที่พบบ่อย</h2>
        <div className="divide-y divide-mint/20 border-y border-mint/20">
          {FAQS.map((f, i) => (
            <div key={f.q}>
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left py-4 flex justify-between items-center gap-4">
                <span className="font-semibold text-forest">{f.q}</span><span className="text-mint">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p className="text-sm text-muted pb-4 leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 md:px-20 py-12 bg-white">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl text-forest mb-2">เริ่มจากคุยกับทีมงานก่อน ไม่มีค่าใช้จ่าย</h2>
          <p className="text-sm text-muted mb-5">{HOSPITAL_NAME} จ.สมุทรสาคร · เปิดทุกวัน</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => onLine('footer')} className="flex items-center justify-center bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold">ทัก LINE นัดพบแพทย์</a>
            <a href={HOSPITAL_PHONE_TEL} onClick={() => onCall('footer')} className="flex items-center justify-center border border-forest/30 text-forest px-8 py-4 rounded-full text-sm font-bold">โทร {HOSPITAL_PHONE}</a>
          </div>
          <p className="text-xs text-muted mt-6">
            หน้านี้ให้ข้อมูลทั่วไปเกี่ยวกับโปรแกรม ไม่ใช่การวินิจฉัยหรือคำแนะนำทางการแพทย์ ผลลัพธ์แตกต่างกันในแต่ละบุคคล · <Link href="/privacy" className="underline">นโยบายความเป็นส่วนตัว</Link>
          </p>
        </div>
      </section>

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur border-t border-mint/20 px-4 py-2 flex gap-2">
        <a href={lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => onLine('sticky')} className="flex-1 flex items-center justify-center bg-[#06C755] text-white py-3 rounded-full text-sm font-bold">ทัก LINE</a>
        <a href={HOSPITAL_PHONE_TEL} onClick={() => onCall('sticky')} className="flex-1 flex items-center justify-center border border-forest/30 text-forest py-3 rounded-full text-sm font-bold">โทร</a>
      </div>
      <div className="h-16 md:hidden" />

      {/* Cookie / PDPA consent — stored on the attribution row (§4.9 step 5) */}
      {consent === null && (
        <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:max-w-sm z-40 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 text-sm">
          <p className="text-rtext mb-3">เราใช้คุกกี้เพื่อวัดผลโฆษณาและปรับปรุงหน้าเว็บ ไม่มีการเก็บข้อมูลสุขภาพจากหน้านี้</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setConsent('accepted'); markConsent(true) }} className="flex-1 bg-forest text-white py-2 rounded-full text-xs font-semibold">ยอมรับ</button>
            <button type="button" onClick={() => { setConsent('declined'); markConsent(false) }} className="flex-1 border border-gray-300 py-2 rounded-full text-xs font-semibold">ปฏิเสธ</button>
          </div>
        </div>
      )}
    </main>
  )
}

function safeSession(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}

// Update the consent flag on the attribution row minted for this visit.
function markConsent(accepted: boolean) {
  const cached = safeSession('dmglp_ref')
  if (!cached) return
  try {
    const { ref_code } = JSON.parse(cached) as { ref_code: string }
    fetch('/api/dmglp/attribution', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref_code, consent: accepted }) }).catch(() => undefined)
  } catch {}
}
