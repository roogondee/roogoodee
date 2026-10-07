'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Site-wide scroll reveal for the public marketing pages, mounted once in the
// root layout so no page component needs editing to get it. Every <section>
// inside <main> that starts below the fold fades up as it scrolls in, and the
// direct children of any grid inside it stagger in behind it.
//
// Safe by construction:
// - classes are only ever added here, after hydration, so SSR HTML / no-JS /
//   crawlers render everything visible;
// - sections already on screen at mount are skipped, so the hero (the LCP
//   element) is never hidden;
// - sections holding a fixed/sticky bar are skipped — a transformed ancestor
//   would re-anchor `position: fixed` to the section instead of the viewport;
// - the CSS lives inside prefers-reduced-motion: no-preference, and once a
//   section has animated its classes are stripped so the cards' own hover
//   transitions are not delayed by the stagger.

// Internal tools and in-LINE pages: no ornamental motion there.
const SKIP_PREFIXES = ['/admin', '/dmglp/staff', '/dmglp/liff', '/liff', '/hr', '/portal', '/lab', '/verify', '/r/']

const STAGGER_MS = 90
const MAX_STAGGER_ITEMS = 8
const CLEANUP_MS = 900 + STAGGER_MS * MAX_STAGGER_ITEMS

export default function ScrollMotion() {
  const pathname = usePathname() || '/'

  useEffect(() => {
    if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) return
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const timers: number[] = []
    const marked: HTMLElement[] = []

    const finish = (el: HTMLElement) => {
      el.classList.add('rv-in')
      timers.push(window.setTimeout(() => {
        el.classList.remove('rv', 'rv-in')
        el.querySelectorAll<HTMLElement>('.rv-child').forEach(c => {
          c.classList.remove('rv-child')
          c.style.removeProperty('--rv-d')
        })
      }, CLEANUP_MS))
    }

    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target)
        finish(e.target as HTMLElement)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })

    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section'))
    const vh = window.innerHeight
    for (const s of sections) {
      if (s.dataset.noReveal !== undefined) continue
      if (s.parentElement?.closest('section')) continue // nested: parent handles it
      if (s.getBoundingClientRect().top < vh * 0.92) continue
      if (s.querySelector('.fixed, .sticky')) continue

      s.classList.add('rv')
      marked.push(s)
      s.querySelectorAll<HTMLElement>('.grid').forEach(grid => {
        Array.from(grid.children).forEach((child, i) => {
          const el = child as HTMLElement
          el.classList.add('rv-child')
          el.style.setProperty('--rv-d', `${Math.min(i, MAX_STAGGER_ITEMS) * STAGGER_MS + 120}ms`)
        })
      })
      io.observe(s)
    }

    return () => {
      io.disconnect()
      timers.forEach(t => window.clearTimeout(t))
      // Leaving the page mid-animation: never leave anything hidden behind.
      marked.forEach(s => s.classList.remove('rv', 'rv-in'))
    }
  }, [pathname])

  return null
}
