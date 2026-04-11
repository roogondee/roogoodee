'use client'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'
import { BMICalc, EGFRCalc, PrEPQuiz } from '@/components/ui/HealthCalcs'

export default function ToolsClient() {
  const { t } = useTranslation()
  const tt = t.tools

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />

      <div className="pt-24 pb-16 px-6 md:px-20 max-w-6xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">Health Tools</p>
          <h1 className="font-display text-3xl md:text-5xl text-forest mb-4">{tt.pageTitle}</h1>
          <p className="text-muted text-base md:text-lg max-w-xl">{tt.pageDesc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { emoji: '💉', label: tt.bmiTitle, anchor: '#bmi', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { emoji: '🫘', label: tt.egfrTitle, anchor: '#egfr', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { emoji: '🔴', label: tt.prepTitle, anchor: '#prep', color: 'bg-rose-50 border-rose-200 text-rose-700' },
          ].map(item => (
            <a key={item.anchor} href={item.anchor} className={`flex items-center gap-3 ${item.color} border rounded-xl px-5 py-3.5 font-semibold text-sm hover:shadow-md transition-all`}>
              <span className="text-2xl">{item.emoji}</span>{item.label}
            </a>
          ))}
        </div>

        <div className="space-y-8">
          <div id="bmi"><BMICalc /></div>
          <div id="egfr"><EGFRCalc /></div>
          <div id="prep"><PrEPQuiz /></div>
        </div>

        <div className="mt-12 bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="font-display text-2xl md:text-3xl mb-3">{tt.ctaTitle}</h2>
          <p className="text-white/70 text-sm mb-6">{tt.ctaDesc}</p>
          <a href="/contact" className="inline-block bg-white text-forest font-bold px-8 py-3 rounded-full text-sm hover:bg-cream transition-colors">
            📝 {t.common.consultFree} →
          </a>
        </div>

        <p className="mt-8 text-xs text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">{tt.disclaimer}</p>
      </div>
    </main>
  )
}
