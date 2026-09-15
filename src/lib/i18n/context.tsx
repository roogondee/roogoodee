'use client'
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { type LocaleCode, defaultLocale, LOCALE_COOKIE, isValidLocale } from './config'
import dictionaries, { type Translations } from './locales'

interface I18nContextType {
  locale: LocaleCode
  t: Translations
  setLocale: (code: LocaleCode) => void
}

const I18nContext = createContext<I18nContextType | null>(null)

function setCookie(name: string, value: string, days = 365) {
  const d = new Date()
  d.setTime(d.getTime() + days * 86400000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

// `initialLocale` comes from the middleware via the root layout, so the server
// already rendered this tree in the right language. Seeding state with it means
// the first client render matches the HTML exactly — no post-hydration language
// swap, and no hydration mismatch. Resolution itself (cookie > path override >
// Accept-Language > Thai) lives in config.ts's resolveLocale and now runs once,
// on the server, instead of in a useEffect after the JS has downloaded.
export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode
  initialLocale?: LocaleCode
}) {
  const [locale, setLocaleState] = useState<LocaleCode>(
    isValidLocale(initialLocale) ? initialLocale : defaultLocale
  )

  // The middleware already resolved ?lang= and wrote the cookie, so nothing
  // here needs to read it — but the param has to come off the URL, or a later
  // reload would keep overriding a language the visitor picks with the
  // switcher. Stripping it is all that is left of what used to be full
  // client-side locale detection.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('lang')) return
    url.searchParams.delete('lang')
    window.history.replaceState(window.history.state, '', url)
  }, [])

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code)
    setCookie(LOCALE_COOKIE, code)
    document.documentElement.lang = code
  }, [])

  const t = dictionaries[locale] || dictionaries[defaultLocale]

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
