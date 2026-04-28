import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import ChatWidget from '@/components/ui/ChatWidget'
import MobileNav from '@/components/ui/MobileNav'
import PDPABanner from '@/components/ui/PDPABanner'
import LINEFloat from '@/components/ui/LINEFloat'
import { I18nProvider } from '@/lib/i18n/context'
import HrefLangTags from '@/components/ui/HrefLangTags'

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

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}

        {META_PIXEL_ID && (
          <>
            <Script id="meta-pixel-init" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${META_PIXEL_ID}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}

        {TIKTOK_PIXEL_ID && (
          <Script id="tiktok-pixel-init" strategy="afterInteractive">
            {`
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                ttq.load('${TIKTOK_PIXEL_ID}');
                ttq.page();
              }(window, document, 'ttq');
            `}
          </Script>
        )}

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
      </body>
    </html>
  )
}
