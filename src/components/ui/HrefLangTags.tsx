'use client'
import { usePathname } from 'next/navigation'
import { locales } from '@/lib/i18n/config'
import { useTranslation } from '@/lib/i18n/context'
import { useEffect } from 'react'

const LOCALE_TO_HREFLANG: Record<string, string> = {
  th: 'th', en: 'en', my: 'my', lo: 'lo', km: 'km',
  zh: 'zh-Hans', vi: 'vi', hi: 'hi', ja: 'ja', ko: 'ko',
}

export default function HrefLangTags() {
  const pathname = usePathname()
  const { locale } = useTranslation()
  const baseUrl = 'https://roogondee.com'

  useEffect(() => {
    // Update <html lang>
    document.documentElement.lang = locale

    // Remove old hreflang tags
    document.querySelectorAll('link[data-hreflang]').forEach(el => el.remove())

    // Inject hreflang tags into <head>
    locales.forEach(l => {
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = LOCALE_TO_HREFLANG[l.code] || l.code
      link.href = `${baseUrl}${pathname}`
      link.setAttribute('data-hreflang', 'true')
      document.head.appendChild(link)
    })

    // x-default
    const xDefault = document.createElement('link')
    xDefault.rel = 'alternate'
    xDefault.hreflang = 'x-default'
    xDefault.href = `${baseUrl}${pathname}`
    xDefault.setAttribute('data-hreflang', 'true')
    document.head.appendChild(xDefault)

    return () => {
      document.querySelectorAll('link[data-hreflang]').forEach(el => el.remove())
    }
  }, [locale, pathname])

  return null
}
