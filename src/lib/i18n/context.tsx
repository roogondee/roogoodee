'use client'
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { type LocaleCode, defaultLocale, LOCALE_COOKIE, locales } from './config'
import dictionaries, { type Translations } from './locales'

interface I18nContextType {
  locale: LocaleCode
  t: Translations
  setLocale: (code: LocaleCode) => void
}

const I18nContext = createContext<I18nContextType | null>(null)

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

function setCookie(name: string, value: string, days = 365) {
  const d = new Date()
  d.setTime(d.getTime() + days * 86400000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

function isValidLocale(code: string): code is LocaleCode {
  return locales.some(l => l.code === code)
}

function getInitialLocale(): LocaleCode {
  // 1. Check cookie
  const cookieVal = getCookie(LOCALE_COOKIE)
  if (cookieVal && isValidLocale(cookieVal)) return cookieVal

  // 2. Check browser language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language?.split('-')[0]
    if (browserLang && isValidLocale(browserLang)) return browserLang
  }

  return defaultLocale
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocaleState(getInitialLocale())
    setMounted(true)
  }, [])

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code)
    setCookie(LOCALE_COOKIE, code)
    document.documentElement.lang = code
  }, [])

  const t = dictionaries[locale] || dictionaries[defaultLocale]

  // During SSR, use default locale translations
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ locale: defaultLocale, t: dictionaries[defaultLocale], setLocale }}>
        {children}
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}
