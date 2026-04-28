'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import { getConsent, setConsent } from '@/lib/analytics/consent'

export default function PDPABanner() {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!getConsent()) setVisible(true)
  }, [])

  const accept = () => {
    setConsent('accepted')
    setVisible(false)
  }

  const decline = () => {
    setConsent('declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-mint/20 shadow-2xl px-4 py-4 md:py-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-forest mb-1">{t.pdpa.title}</p>
          <p className="text-xs text-muted leading-relaxed">
            {t.pdpa.desc}{' '}
            <Link href="/privacy" className="text-forest underline hover:text-sage">{t.pdpa.privacyLink}</Link>
            {' '}{t.pdpa.pdpaLaw}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={decline} className="text-xs text-muted border border-gray-200 px-4 py-2 rounded-full hover:border-gray-300 transition-colors">
            {t.pdpa.decline}
          </button>
          <button onClick={accept} className="text-xs font-bold bg-forest text-white px-5 py-2 rounded-full hover:bg-sage transition-colors">
            {t.pdpa.acceptAll}
          </button>
        </div>
      </div>
    </div>
  )
}
