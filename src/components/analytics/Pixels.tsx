'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { CONSENT_EVENT, hasConsent, type ConsentValue } from '@/lib/analytics/consent'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID
// Per-vertical pixel separation — mens vertical is at higher ad-policy risk
// (Andropause / Sexual Wellness keywords trigger Meta/TikTok scanners more
// aggressively). Set these to isolate mens traffic from the existing 4
// verticals so a flagged mens campaign cannot freeze the shared ad account.
// If unset → no pixel fires on /mens routes (safer default than reusing main).
const META_PIXEL_ID_MENS = process.env.NEXT_PUBLIC_META_PIXEL_ID_MENS
const TIKTOK_PIXEL_ID_MENS = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID_MENS

function isMensRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/mens' || pathname.startsWith('/mens/') || pathname === '/quiz/mens' || pathname.startsWith('/quiz/mens/')
}

export default function Pixels() {
  const [allowed, setAllowed] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setAllowed(hasConsent())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentValue>).detail
      setAllowed(detail === 'accepted')
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  if (!allowed) return null

  const onMens = isMensRoute(pathname)
  // On /mens routes prefer the mens-specific pixel; if unset, fire NOTHING to
  // protect the shared pixel rather than silently reusing it.
  const metaPixel = onMens ? META_PIXEL_ID_MENS : META_PIXEL_ID
  const tiktokPixel = onMens ? TIKTOK_PIXEL_ID_MENS : TIKTOK_PIXEL_ID
  // Pixel ID is part of the script src + body; remount the Script when it
  // changes so the new init doesn't inherit the previous pixel's session.
  const metaKey = `meta-pixel-${metaPixel || 'none'}`
  const tiktokKey = `tiktok-pixel-${tiktokPixel || 'none'}`

  return (
    <>
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

      {metaPixel && (
        <>
          <Script id={metaKey} key={metaKey} strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixel}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${metaPixel}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {tiktokPixel && (
        <Script id={tiktokKey} key={tiktokKey} strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('${tiktokPixel}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}
    </>
  )
}
