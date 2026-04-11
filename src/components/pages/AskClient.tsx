'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'
import AskForm from '@/components/ui/AskForm'

interface QA {
  id: string
  question: string
  answer: string
  service: string
  created_at: string
}

const SERVICE_LABELS_MAP: Record<string, Record<string, string>> = {
  th: { std: '🔴 STD & PrEP', glp1: '💉 GLP-1', ckd: '🫘 CKD', foreign: '🧪 แรงงาน', general: '💬 ทั่วไป' },
  en: { std: '🔴 STD & PrEP', glp1: '💉 GLP-1', ckd: '🫘 CKD', foreign: '🧪 Workers', general: '💬 General' },
}

const SERVICE_COLORS: Record<string, string> = {
  std: 'bg-rose-100 text-rose-700', glp1: 'bg-emerald-100 text-emerald-700',
  ckd: 'bg-blue-100 text-blue-700', foreign: 'bg-amber-100 text-amber-700', general: 'bg-gray-100 text-gray-600',
}

export default function AskClient({ recent }: { recent: QA[] }) {
  const { locale, t } = useTranslation()
  const ak = t.ask
  const labels = SERVICE_LABELS_MAP[locale] || SERVICE_LABELS_MAP.en

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />

      <div className="pt-24 pb-16 px-6 md:px-20 max-w-4xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">{ak.pageLabel}</p>
          <h1 className="font-display text-3xl md:text-5xl text-forest mb-4">{ak.pageTitle}</h1>
          <p className="text-muted text-base md:text-lg max-w-xl">
            {ak.pageDesc}<br/>
            <span className="text-sm">{ak.noSignup}</span>
          </p>
        </div>

        <AskForm />

        <div className="mt-6 bg-white border border-mint/20 rounded-2xl p-5">
          <p className="text-xs font-bold text-muted mb-3">{ak.trySuggestions}</p>
          <div className="flex flex-wrap gap-2">
            {[
              'PrEP price? How long to take?',
              'GLP-1 with BMI 28?',
              'Creatinine 1.5 dangerous?',
              'Full STD test cost?',
              'Worker pre-employment tests?',
            ].map(q => (
              <button key={q} data-question={q}
                className="suggest-btn text-xs bg-mint/10 hover:bg-mint/20 text-sage border border-mint/20 rounded-full px-3 py-1.5 transition-colors cursor-pointer">
                {q}
              </button>
            ))}
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-2xl text-forest mb-6">{ak.recentQuestions}</h2>
            <div className="space-y-4">
              {recent.map(qa => (
                <div key={qa.id} className="bg-white border border-mint/15 rounded-2xl p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-semibold text-forest text-sm md:text-base leading-tight">{qa.question}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${SERVICE_COLORS[qa.service] || SERVICE_COLORS.general}`}>
                      {labels[qa.service] || qa.service}
                    </span>
                  </div>
                  <p className="text-muted text-sm leading-relaxed line-clamp-4">{qa.answer}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    {qa.created_at ? new Date(qa.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 bg-gradient-to-br from-forest to-sage rounded-3xl p-8 text-white text-center">
          <h2 className="font-display text-2xl mb-2">{ak.needPersonal}</h2>
          <p className="text-white/70 text-sm mb-5">{ak.needPersonalDesc}</p>
          <a href="/contact" className="inline-block bg-white text-forest font-bold px-8 py-3 rounded-full text-sm hover:bg-cream transition-colors">
            📝 {t.common.consultFree} →
          </a>
        </div>
      </div>
    </main>
  )
}
