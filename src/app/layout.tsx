import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import MobileNav from '@/components/ui/MobileNav'
import LINEFloat from '@/components/ui/LINEFloat'
import Pixels from '@/components/analytics/Pixels'
import Recaptcha from '@/components/analytics/Recaptcha'
import LazyChatWidget from '@/components/ui/LazyChatWidget'
import ScrollMotion from '@/components/ui/ScrollMotion'
import { I18nProvider } from '@/lib/i18n/context'
import HrefLangTags from '@/components/ui/HrefLangTags'
import { Analytics } from '@vercel/analytics/next'
import { fontVariables } from './fonts'
import { LOCALE_HEADER, defaultLocale, isValidLocale } from '@/lib/i18n/config'

export const metadata: Metadata = {
  metadataBase: new URL('https://roogondee.com'),
  title: 'รู้ก่อนดี(รู้งี้) — ปรึกษาสุขภาพ ส่วนตัว ไม่ตัดสิน',
  description: 'ปรึกษาผู้เชี่ยวชาญด้านสุขภาพฟรี STD & PrEP HIV, GLP-1 ลดน้ำหนัก, CKD Clinic, ตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร',
  keywords: 'PrEP HIV, STD, GLP-1, CKD, แรงงานต่างด้าว, สมุทรสาคร',
  openGraph: {
    title: 'รู้ก่อนดี(รู้งี้) — ปรึกษาสุขภาพ ส่วนตัว ไม่ตัดสิน',
    description: 'ปรึกษาฟรี ไม่ตัดสิน ครอบคลุมทุกเรื่องสุขภาพ',
    url: 'https://roogondee.com',
    siteName: 'รู้ก่อนดี(รู้งี้)',
    locale: 'th_TH',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: 'https://roogondee.com' },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalOrganization',
  name: 'รู้ก่อนดี(รู้งี้)',
  alternateName: 'RuGonDee',
  url: 'https://roogondee.com',
  logo: 'https://roogondee.com/favicon.ico',
  description: 'บริการปรึกษาสุขภาพ STD/PrEP HIV, GLP-1 ลดน้ำหนัก, CKD Clinic, ตรวจสุขภาพแรงงานต่างด้าว สมุทรสาคร',
  address: { '@type': 'PostalAddress', addressLocality: 'สมุทรสาคร', addressCountry: 'TH' },
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', availableLanguage: ['Thai', 'English', 'Burmese', 'Lao', 'Khmer', 'Chinese', 'Vietnamese', 'Hindi', 'Japanese', 'Korean'] },
  sameAs: ['https://line.me/ti/p/@roogondee'],
}

const GA_ID = 'G-THP6CDXR0L'
const GA_EXTRA_ID = process.env.NEXT_PUBLIC_GA_ID
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const GA_IDS = [
  GA_ID,
  ...(GA_EXTRA_ID && GA_EXTRA_ID !== GA_ID ? [GA_EXTRA_ID] : []),
  ...(GOOGLE_ADS_ID ? [GOOGLE_ADS_ID] : []),
]
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved by src/middleware.ts from ?lang= / cookie / Accept-Language, so
  // the HTML that leaves the server is already in the visitor's language
  // instead of always being Thai and swapping once the JS lands.
  const headerLocale = headers().get(LOCALE_HEADER)
  const locale = isValidLocale(headerLocale) ? headerLocale : defaultLocale

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/jia-consent.css" />
        <script src="/jia-consent-config.js" data-destinations={GA_IDS.join(',')} />
        <script src="/jia-consent.js" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

        <Pixels />

        <Recaptcha />

        <I18nProvider initialLocale={locale}>
          <HrefLangTags />
          {children}
          <MobileNav />
          <LazyChatWidget />
          <LINEFloat />
          <ScrollMotion />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
