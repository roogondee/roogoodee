'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'สุขภาพจิต & ความสัมพันธ์ — รู้ก่อนดี(รู้งี้)',
  url: 'https://roogondee.com/mind',
  description: 'ปรึกษานักจิตวิทยา/จิตแพทย์ฟรี 30 นาที (telehealth) — ซึมเศร้า วิตกกังวล นอนไม่หลับ ความสัมพันธ์ การสูญเสีย — เป็นความลับ ไม่ตัดสิน',
  about: { '@type': 'MedicalSpecialty', name: 'Psychiatry' },
  specialty: 'Psychiatry',
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'voucher นี้ได้อะไรบ้าง?', acceptedAnswer: { '@type': 'Answer', text: 'voucher ครอบคลุมการปรึกษากับนักจิตวิทยา/จิตแพทย์ที่มีใบอนุญาต 30 นาที ผ่าน telehealth (video call หรือโทร) — session แรกฟรี ไม่มีค่าใช้จ่ายและไม่มีข้อผูกมัด' } },
    { '@type': 'Question', name: 'ใครจะเป็นคนคุยกับผม/ฉัน?', acceptedAnswer: { '@type': 'Answer', text: 'ผู้เชี่ยวชาญที่ได้รับใบอนุญาตประกอบวิชาชีพจิตวิทยาคลินิก หรือจิตแพทย์ที่จดทะเบียนตามกฎหมาย — ทีมจะแมตช์ให้ตรงกับเรื่องที่คุณต้องการพูดที่สุด' } },
    { '@type': 'Question', name: 'ถ้ากำลังคิดทำร้ายตัวเองตอนนี้ ทำยังไง?', acceptedAnswer: { '@type': 'Answer', text: 'กรุณาโทรสายด่วนสุขภาพจิต กรมสุขภาพจิต 1323 ทันที (ฟรี 24 ชม. เป็นความลับ) — หรือไปแผนกฉุกเฉินของโรงพยาบาลใกล้บ้าน คุณไม่ได้อยู่คนเดียว มีคนพร้อมรับฟัง' } },
    { '@type': 'Question', name: 'เป็นความลับแน่ใจไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ใช่ครับ ข้อมูลทั้งหมดเป็นความลับตาม PDPA และจรรยาบรรณวิชาชีพจิตวิทยา ไม่เปิดเผยต่อบุคคลที่สามรวมถึงครอบครัวหรือนายจ้าง' } },
    { '@type': 'Question', name: 'ต้องบอกชื่อจริงไหม?', acceptedAnswer: { '@type': 'Answer', text: 'แบบประเมินไม่ต้องบอกชื่อจริง ตอนนัดหมาย session อาจต้องใช้ชื่อเพื่อยืนยันตัวตน แต่จะใช้ภายในทีมเท่านั้น' } },
  ],
}

const FAQS = [
  { q: 'voucher นี้ได้อะไรบ้าง?', a: 'voucher ครอบคลุมการปรึกษากับนักจิตวิทยา/จิตแพทย์ที่มีใบอนุญาต 30 นาที ผ่าน telehealth (video call หรือโทร) — session แรกฟรี ไม่มีค่าใช้จ่ายและไม่มีข้อผูกมัด' },
  { q: 'ใครจะเป็นคนคุยกับผม/ฉัน?', a: 'ผู้เชี่ยวชาญที่ได้รับใบอนุญาตประกอบวิชาชีพจิตวิทยาคลินิก หรือจิตแพทย์ที่จดทะเบียนตามกฎหมาย — ทีมจะแมตช์ให้ตรงกับเรื่องที่คุณต้องการพูดที่สุด' },
  { q: 'ถ้ากำลังคิดทำร้ายตัวเองตอนนี้ ทำยังไง?', a: 'กรุณาโทรสายด่วนสุขภาพจิต กรมสุขภาพจิต 1323 ทันที (ฟรี 24 ชม. เป็นความลับ) — หรือไปแผนกฉุกเฉินของโรงพยาบาลใกล้บ้าน คุณไม่ได้อยู่คนเดียว มีคนพร้อมรับฟัง' },
  { q: 'ปรึกษาเรื่องแฟน/ครอบครัวได้ไหม?', a: 'ได้ครับ ปัญหาความสัมพันธ์เป็นเรื่องที่ปรึกษาได้ — ไม่ว่าจะอยากปรึกษาคนเดียวเพื่อมุมมองใหม่ หรือชวนคนสำคัญมา session ร่วมก็ได้' },
  { q: 'เป็นความลับแน่ใจไหม?', a: 'ใช่ครับ ข้อมูลทั้งหมดเป็นความลับตาม PDPA และจรรยาบรรณวิชาชีพจิตวิทยา ไม่เปิดเผยต่อบุคคลที่สามรวมถึงครอบครัวหรือนายจ้าง' },
  { q: 'ต้องบอกชื่อจริงไหม?', a: 'แบบประเมินไม่ต้องบอกชื่อจริง ตอนนัดหมาย session อาจต้องใช้ชื่อเพื่อยืนยันตัวตน แต่จะใช้ภายในทีมเท่านั้น' },
]

export default function MindClient() {
  const { locale, t } = useTranslation()

  const brandDisplay = locale === 'th'
    ? <><span className="text-forest">รู้ก่อน</span><span className="text-mint italic">ดี</span></>
    : <><span className="text-forest">RooGon</span><span className="text-mint italic">Dee</span></>

  return (
    <main className="min-h-screen bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl">{brandDisplay}</Link>
        <div className="hidden md:flex items-center gap-5 text-sm text-muted">
          <Link href="/mind/team" className="hover:text-forest transition-colors">ทีมผู้เชี่ยวชาญ</Link>
          <Link href="/tools" className="hover:text-forest transition-colors">{t.common.calculator}</Link>
          <Link href="/ask" className="hover:text-forest transition-colors">{t.common.askExpert}</Link>
          <Link href="/blog" className="hover:text-forest transition-colors">{t.common.blog}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/quiz/mind" className="bg-forest text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-sage transition-all">
            {t.common.consultFree}
          </Link>
        </div>
      </nav>

      {/* SOFT-LAUNCH WAITLIST BANNER — remove or hide when in-house team is fulfillment-ready (Phase 2) */}
      <section className="pt-20 md:pt-24 px-6 md:px-20 pb-2">
        <div className="max-w-5xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex flex-col md:flex-row gap-3 md:items-center">
          <span className="text-2xl">🌱</span>
          <div className="flex-1 text-sm">
            <span className="font-bold text-amber-900">Soft launch — </span>
            <span className="text-amber-900/85">เรากำลังคัดเลือกทีมนักจิตวิทยา/จิตแพทย์ที่มีใบอนุญาตและเหมาะกับคุณที่สุด หากกรอกแบบประเมินตอนนี้ ทีมจะติดต่อกลับภายใน 1-2 สัปดาห์ — กรณีเร่งด่วน โทร 1323 ฟรี 24 ชม.</span>
          </div>
        </div>
      </section>

      <section className="min-h-[70vh] flex items-center pt-4 px-6 md:px-20 bg-gradient-to-br from-violet-50 via-cream to-cream">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-200 text-violet-700 px-4 py-2 rounded-full text-xs font-semibold mb-6">
            {t.mind.heroTag}
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-5">
            {t.mind.heroTitle1}<br/>{t.mind.heroTitle2}<br/>
            <em className="text-violet-700">{t.mind.heroTitle3}</em>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 max-w-xl whitespace-pre-line">
            {t.mind.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/quiz/mind" className="flex items-center justify-center gap-2 bg-forest text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-sage transition-all shadow-lg">
              {t.mind.ctaConsult}
            </Link>
            <a href="https://line.me/R/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-2 border-violet-300 text-violet-700 px-7 py-4 rounded-full text-sm font-semibold hover:bg-violet-50 transition-all">
              {t.mind.ctaLine}
            </a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[
              ['🔒', t.mind.trustConfidential],
              ['🩺', t.mind.trustExpert],
              ['🏠', t.mind.trustTelehealth],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-xs">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CRISIS BANNER — must stay above-the-fold for at-risk visitors */}
      <section className="px-6 md:px-20 py-6 bg-rose-50 border-y-2 border-rose-200">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
          <span className="font-bold text-rose-700 text-sm whitespace-nowrap">{t.mind.crisisBannerTitle}</span>
          <p className="text-sm text-rose-900 leading-relaxed">
            {t.mind.crisisBannerText}
          </p>
          <a href="tel:1323" className="ml-auto whitespace-nowrap bg-rose-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-rose-700 transition-all">
            📞 1323
          </a>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-violet-600 mb-3">{t.mind.pillarLabel}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
            {[
              {
                tag: 'Pillar A', title: t.mind.pillarATitle, sub: t.mind.pillarASub, desc: t.mind.pillarADesc,
                card: 'bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-100',
                chip: 'bg-violet-100 text-violet-700', subColor: 'text-violet-600',
              },
              {
                tag: 'Pillar B', title: t.mind.pillarBTitle, sub: t.mind.pillarBSub, desc: t.mind.pillarBDesc,
                card: 'bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100',
                chip: 'bg-indigo-100 text-indigo-700', subColor: 'text-indigo-600',
              },
              {
                tag: 'Pillar C', title: t.mind.pillarCTitle, sub: t.mind.pillarCSub, desc: t.mind.pillarCDesc,
                card: 'bg-gradient-to-br from-purple-50 to-slate-50 border border-purple-100',
                chip: 'bg-purple-100 text-purple-700', subColor: 'text-purple-600',
              },
            ].map(p => (
              <div key={p.tag} className={`${p.card} rounded-2xl p-7`}>
                <span className={`inline-block text-xs font-bold tracking-widest uppercase ${p.chip} px-3 py-1 rounded-full mb-4`}>{p.tag}</span>
                <h3 className="font-display text-2xl text-forest mb-2">{p.title}</h3>
                <p className={`text-xs ${p.subColor} font-bold mb-3`}>{p.sub}</p>
                <p className="text-muted text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.mind.servicesLabel}</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10">{t.mind.servicesTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: '💬', title: t.mind.service1Title, desc: t.mind.service1Desc },
              { icon: '🩺', title: t.mind.service2Title, desc: t.mind.service2Desc },
              { icon: '📋', title: t.mind.service3Title, desc: t.mind.service3Desc },
              { icon: '🆘', title: t.mind.service4Title, desc: t.mind.service4Desc },
            ].map(item => (
              <div key={item.title} className="bg-white border border-violet-100 rounded-2xl p-6">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-forest text-base mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 px-6 md:px-20 bg-forest">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3">{t.mind.stepsLabel}</p>
          <h2 className="font-display text-3xl text-white mb-10">{t.mind.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: t.mind.step1Title, desc: t.mind.step1Desc },
              { num: '02', title: t.mind.step2Title, desc: t.mind.step2Desc },
              { num: '03', title: t.mind.step3Title, desc: t.mind.step3Desc },
            ].map(s => (
              <div key={s.num} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                <span className="absolute top-4 right-5 font-display text-5xl text-white/5 font-bold">{s.num}</span>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{t.common.faq}</p>
          <h2 className="font-display text-3xl text-forest mb-10">{t.common.faq}</h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm hover:bg-mint/5 transition-colors">
                  {item.q}
                  <span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-5 text-muted text-sm leading-relaxed border-t border-mint/10 pt-4">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-6 md:px-20 bg-white border-t border-violet-100">
        <div className="max-w-3xl mx-auto bg-violet-50 border border-violet-100 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-violet-700 mb-2">{t.mind.disclaimerTitle}</p>
          <p className="text-sm text-muted leading-relaxed">{t.mind.disclaimerText}</p>
        </div>
      </section>

      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-4">{t.mind.ctaTitle}</h2>
          <p className="text-muted mb-8">{t.mind.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/quiz/mind" className="bg-forest text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
              {t.mind.ctaConsult}
            </Link>
            <a href="https://line.me/R/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              {t.common.lineConsultFree}
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-dark py-8 px-6 md:px-20 text-white/40 text-xs flex flex-col md:flex-row justify-between gap-2">
        <span>{t.common.copyright}</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">{t.common.privacyPolicy}</Link>
          <Link href="/terms" className="hover:text-white transition-colors">{t.common.termsOfService}</Link>
          <Link href="/" className="hover:text-white transition-colors">{t.common.home}</Link>
        </div>
      </footer>
    </main>
  )
}
