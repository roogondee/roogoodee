'use client'
import dynamic from 'next/dynamic'

// ChatWidget was a static import in the root layout, so its JS shipped with
// every page — including /foreign/workpermit and the homepage during the
// work-permit window, where it deliberately renders null (see ChatWidget's own
// path checks). Loading it on demand keeps that cost off the paid landing
// pages. ssr: false is safe: the widget is a floating launcher that only
// appears after interaction and contributes nothing to the server-rendered
// markup or to SEO.
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false })

export default function LazyChatWidget() {
  return <ChatWidget />
}
