'use client'
import { useState, useRef, useEffect } from 'react'
import { locales } from '@/lib/i18n/config'
import { useTranslation } from '@/lib/i18n/context'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = locales.find(l => l.code === locale) || locales[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-white/80 border border-mint/20 hover:bg-mint/10 transition-colors backdrop-blur-sm"
        aria-label="Change language"
      >
        <span className="text-sm">{current.flag}</span>
        <span className="hidden sm:inline text-muted">{current.code.toUpperCase()}</span>
        <svg className={`w-3 h-3 text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-mint/20 rounded-xl shadow-xl overflow-hidden z-[100] min-w-[160px] py-1">
          {locales.map(l => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                l.code === locale
                  ? 'bg-forest/10 text-forest font-semibold'
                  : 'text-muted hover:bg-mint/5 hover:text-forest'
              }`}
            >
              <span className="text-sm">{l.flag}</span>
              <span>{l.label}</span>
              {l.code === locale && <span className="ml-auto text-mint text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
