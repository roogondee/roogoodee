import type { LocaleCode } from './config'

// Maps our locale codes to BCP 47 tags for Intl/toLocaleDateString. Burmese,
// Lao, Khmer etc. previously always got Thai (Buddhist-era) dates regardless
// of the visitor's chosen language — this keeps the date's calendar/script
// matched to the locale actually selected.
const BCP47: Record<LocaleCode, string> = {
  th: 'th-TH',
  en: 'en-US',
  my: 'my-MM',
  lo: 'lo-LA',
  km: 'km-KH',
  zh: 'zh-CN',
  vi: 'vi-VN',
  hi: 'hi-IN',
  ja: 'ja-JP',
  ko: 'ko-KR',
}

export function formatDate(date: Date | string, locale: LocaleCode, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(BCP47[locale] ?? 'en-US', options ?? { day: '2-digit', month: 'short', year: 'numeric' })
}
