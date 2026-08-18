import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import ChatWidget from '@/components/ui/ChatWidget'
import MobileNav from '@/components/ui/MobileNav'
import PDPABanner from '@/components/ui/PDPABanner'
import LINEFloat from '@/components/ui/LINEFloat'
import Pixels from '@/components/analytics/Pixels'
import { I18nProvider } from '@/lib/i18n/context'
import HrefLangTags from '@/components/ui/HrefLangTags'
import { Analytics } from '@vercel/analytics/next'

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

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

// Google tag (gtag.js). Rendered server-side on every page so Google's
// installation checker finds it in the raw HTML. Google Consent Mode keeps it
// cookieless until the visitor accepts the PDPA banner: consent defaults to
// the stored choice (denied when unanswered) and Pixels.tsx sends
// gtag('consent','update') when the banner is answered. 'pdpa_consent' must
// stay in sync with CONSENT_KEY in src/lib/analytics/consent.ts.
// G-THP6CDXR0L is the property linked to the Google Ads account and always
// fires; a different NEXT_PUBLIC_GA_ID adds a second property alongside it
// (Vercel prod currently sets G-TS4XWH5NJD) rather than replacing it, so
// neither property loses data. gtag events fan out to every configured ID.
// NEXT_PUBLIC_GOOGLE_ADS_ID ('AW-XXXXXXXXX') adds the Google Ads destination
// so the ads_conversion_* events in src/lib/analytics/track.ts have somewhere
// to land. Linking Google Ads to the tag can supply this destination on its
// own, but that link is invisible from the codebase and silently drops every
// conversion if it is ever unshared — configuring it explicitly makes the
// dependency checkable. Unset is safe: the tag behaves exactly as before.
const GA_ID = 'G-THP6CDXR0L'
const GA_EXTRA_ID = process.env.NEXT_PUBLIC_GA_ID
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const GA_IDS = [
  GA_ID,
  ...(GA_EXTRA_ID && GA_EXTRA_ID !== GA_ID ? [GA_EXTRA_ID] : []),
  ...(GOOGLE_ADS_ID ? [GOOGLE_ADS_ID] : []),
]
const GTAG_INIT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var pdpaOk = false;
try { pdpaOk = localStorage.getItem('pdpa_consent') === 'accepted'; } catch (e) {}
gtag('consent', 'default', {
  ad_storage: pdpaOk ? 'granted' : 'denied',
  ad_user_data: pdpaOk ? 'granted' : 'denied',
  ad_personalization: pdpaOk ? 'granted' : 'denied',
  analytics_storage: pdpaOk ? 'granted' : 'denied'
});
gtag('js', new Date());
${GA_IDS.map((id) => `gtag('config', '${id}', { page_path: window.location.pathname });`).join('\n')}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: GTAG_INIT }} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

        <Pixels />

        {RECAPTCHA_SITE_KEY && (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
            strategy="afterInteractive"
          />
        )}

        <I18nProvider>
          <HrefLangTags />
          {children}
          <MobileNav />
          <ChatWidget />
          <LINEFloat />
          <PDPABanner />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
