'use client'
import Script from 'next/script'
import { usePathname } from 'next/navigation'

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

// reCAPTCHA v3 used to load from the root layout on every page — roughly 150KB
// of JS plus a persistent badge, on ad landing pages that never call it. Only
// two routes actually execute it: the LIFF quiz (QuizRunner) and the PDPA
// delete-request form. Both already treat a missing window.grecaptcha as "no
// token" and submit anyway, so scoping the script cannot break them.
const RECAPTCHA_PATHS = ['/liff', '/privacy/delete']

export default function Recaptcha() {
  const pathname = usePathname()

  if (!RECAPTCHA_SITE_KEY) return null
  const needed = RECAPTCHA_PATHS.some((p) => pathname === p || pathname?.startsWith(p + '/'))
  if (!needed) return null

  return (
    <Script
      src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
      strategy="afterInteractive"
    />
  )
}
