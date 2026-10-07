'use client'
import { useSearchParams } from 'next/navigation'

// Common-symptom cards on /advice link to /advice?symptom=...#advice-chat,
// which auto-sends that text as the visitor's first chat message (see
// AdviceChat.tsx). Building the href from a plain string used to drop every
// other query param on the tap — for a Google Ads visitor that means losing
// gclid and the utm_* set on the Smart-campaign Final URL right at the start
// of the session, before persistClickId() ever runs. Pulling the current
// search params and only adding/overwriting `symptom` keeps them intact.
//
// Needs its own Suspense boundary (see AdviceClient.tsx) because
// useSearchParams opts a component out of static rendering.

export interface AdviceSymptom {
  title: string
  desc: string
  query: string
  icon: string
}

export default function AdviceSymptomLinks({ symptoms }: { symptoms: AdviceSymptom[] }) {
  const searchParams = useSearchParams()

  const hrefFor = (query: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('symptom', query)
    return `/advice?${params.toString()}#advice-chat`
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {symptoms.map(s => (
        <a
          key={s.title}
          href={hrefFor(s.query)}
          className="bg-cream border border-mint/15 rounded-2xl p-5 hover:border-mint/50 hover:-translate-y-0.5 transition-all"
        >
          <div className="text-2xl mb-2">{s.icon}</div>
          <h3 className="font-semibold text-forest text-sm mb-1">{s.title}</h3>
          <p className="text-muted text-xs leading-relaxed">{s.desc}</p>
        </a>
      ))}
    </div>
  )
}
