'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'

export default function AboutClient() {
  const { t } = useTranslation()
  const a = t.about

  const TEAM = [
    { icon: '👨‍⚕️', name: a.team1Name, role: a.team1Role, desc: a.team1Desc, color: 'bg-rose-50 border-rose-200', badge: 'bg-rose-100 text-rose-700' },
    { icon: '💉', name: a.team2Name, role: a.team2Role, desc: a.team2Desc, color: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
    { icon: '🫘', name: a.team3Name, role: a.team3Role, desc: a.team3Desc, color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
    { icon: '🧪', name: a.team4Name, role: a.team4Role, desc: a.team4Desc, color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  ]
  const VALUES = [
    { icon: '🔒', title: a.value1Title, desc: a.value1Desc },
    { icon: '🌿', title: a.value2Title, desc: a.value2Desc },
    { icon: '⚡', title: a.value3Title, desc: a.value3Desc },
    { icon: '🎯', title: a.value4Title, desc: a.value4Desc },
  ]
  const STATS = [
    { num: a.stat1, label: a.stat1Label }, { num: a.stat2, label: a.stat2Label },
    { num: a.stat3, label: a.stat3Label }, { num: a.stat4, label: a.stat4Label },
  ]

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />
      <div className="pt-28 pb-20 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14 md:mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{a.heroLabel}</p>
          <h1 className="font-display text-4xl md:text-5xl text-forest leading-tight mb-5 whitespace-pre-line">{a.heroTitle}</h1>
          <p className="text-muted text-base md:text-lg max-w-xl mx-auto leading-relaxed">{a.heroDesc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16 md:mb-20 items-center">
          <div className="bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-10 text-white">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-4">{a.storyLabel}</p>
            <h2 className="font-display text-2xl md:text-3xl mb-4">{a.storyTitle}</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">{a.storyP1}</p>
            <p className="text-white/70 text-sm leading-relaxed">{a.storyP2}</p>
          </div>
          <div className="space-y-4">
            {STATS.map(s => (
              <div key={s.num} className="bg-white border border-mint/15 rounded-2xl px-6 py-4 flex items-center gap-4">
                <p className="font-display text-2xl text-forest w-28 flex-shrink-0">{s.num}</p>
                <p className="text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16 md:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">{a.teamLabel}</p>
            <h2 className="font-display text-2xl md:text-3xl text-forest">{a.teamTitle}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEAM.map(tm => (
              <div key={tm.name} className={`border rounded-2xl p-6 ${tm.color}`}>
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{tm.icon}</span>
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${tm.badge}`}>{tm.role}</span>
                    <h3 className="font-semibold text-forest mb-2">{tm.name}</h3>
                    <p className="text-sm text-forest/70 leading-relaxed">{tm.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16 md:mb-20 bg-white border border-mint/15 rounded-3xl p-7 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="w-20 h-20 bg-forest/10 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">🏥</div>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">{a.partnerLabel}</p>
              <h2 className="font-display text-xl text-forest mb-2">{a.partnerName}</h2>
              <p className="text-sm text-muted leading-relaxed">{a.partnerDesc}</p>
            </div>
          </div>
        </div>

        <div className="mb-16 md:mb-20">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2">{a.valuesLabel}</p>
            <h2 className="font-display text-2xl md:text-3xl text-forest">{a.valuesTitle}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white border border-mint/15 rounded-2xl p-5 flex items-start gap-4">
                <span className="text-2xl">{v.icon}</span>
                <div><h3 className="font-semibold text-forest mb-1">{v.title}</h3><p className="text-sm text-muted leading-relaxed">{v.desc}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="font-display text-2xl md:text-3xl mb-2">{a.ctaTitle}</h2>
          <p className="text-white/70 text-sm mb-6">{a.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="bg-white text-forest px-8 py-3.5 rounded-full font-bold text-sm hover:bg-cream transition-all">{a.ctaConsult}</Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="bg-white/15 border border-white/30 text-white px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-white/25 transition-all">💬 LINE: @roogondee</a>
          </div>
        </div>
      </div>
    </main>
  )
}
